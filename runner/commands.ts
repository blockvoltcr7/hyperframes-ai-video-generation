import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { projectPath, REPO_ROOT, STUDIO_ROOT } from "./paths.js";
import type { JobSummary, PreflightCheck } from "./types.js";
import { assertProjectReady } from "./project-contracts.js";
import { ALLOWED_IMAGE_MODES, ALLOWED_TEMPLATES, ALLOWED_WORKFLOWS, DEFAULT_IMAGES, DEFAULT_TEMPLATE, DEFAULT_WORKFLOW } from "./generation-policy.js";

const jobs = new Map<string, { summary: JobSummary; child?: ReturnType<typeof spawn> }>();
const JOB_STATE_PATH = path.join(STUDIO_ROOT, "state", "jobs.json");
const JOB_OUTPUT_LIMIT = 20_000;
let activeMutationJob: string | null = null;
const activePreviews = new Map<string, string>();

export function appendBoundedOutput(current: string, chunk: string, limit = JOB_OUTPUT_LIMIT): string {
  return `${current}${chunk}`.slice(-limit);
}

export function previewUrlFromOutput(output: string): string | undefined {
  const url = output.match(/https?:\/\/(?:127\.0\.0\.1|localhost):\d+(?:\/[^\s]*)?/i)?.[0];
  return url?.replace(/[),.]+$/, "");
}

async function hydrateJobs() {
  try {
    const stored = JSON.parse(await fs.readFile(JOB_STATE_PATH, "utf8")) as JobSummary[];
    for (const summary of stored) {
      if (summary.status === "queued" || summary.status === "running") {
        summary.status = "failed";
        summary.error = "Runner restarted before this job reached a terminal state";
        summary.finishedAt = new Date().toISOString();
      }
      jobs.set(summary.id, { summary });
    }
  } catch { /* first run or invalid legacy state */ }
}

async function persistJobs() {
  await fs.mkdir(path.dirname(JOB_STATE_PATH), { recursive: true });
  const temp = `${JOB_STATE_PATH}.${process.pid}.tmp`;
  await fs.writeFile(temp, `${JSON.stringify(listJobs(), null, 2)}\n`);
  await fs.rename(temp, JOB_STATE_PATH);
}

await hydrateJobs();

function createJob(summary: Omit<JobSummary, "id" | "startedAt" | "status" | "output">, id = crypto.randomUUID()): JobSummary {
  const job: JobSummary = { ...summary, id, startedAt: new Date().toISOString(), status: "queued", output: "" };
  jobs.set(id, { summary: job });
  void persistJobs();
  return job;
}

export function getJob(id: string): JobSummary | undefined { return jobs.get(id)?.summary; }
export function listJobs(): JobSummary[] { return [...jobs.values()].map((item) => item.summary).reverse(); }

export async function runJob(input: { type: JobSummary["type"]; projectSlug?: string; topic?: string; template?: string; workflow?: string; images?: string }): Promise<JobSummary> {
  const project = input.projectSlug ? projectPath(input.projectSlug) : undefined;
  if (input.projectSlug && !(await fs.stat(project!).catch(() => null))) throw new Error("Project does not exist");
  if (input.type === "render" && input.projectSlug) await assertRenderReady(input.projectSlug);

  const jobId = crypto.randomUUID();
  const renderPaths = input.type === "render" && input.projectSlug ? renderOutputPaths(input.projectSlug, project!) : undefined;
  if (renderPaths) {
    if (await fs.stat(renderPaths.finalPath).catch(() => null)) throw new Error("Render output already exists; remove it before starting another render");
    await fs.mkdir(path.dirname(renderPaths.finalPath), { recursive: true });
  }
  const command = commandFor(input, renderPaths?.partRelativePath);
  const isMutation = input.type === "generation" || input.type === "render";
  if (isMutation && activeMutationJob) throw new Error("A generation or render job is already running");
  if (input.type === "preview" && input.projectSlug) {
    if (activePreviews.has(input.projectSlug)) throw new Error("A preview is already running for this project");
    try {
      const status = JSON.parse(await captureProcess("npx", ["--no-install", "hyperframes", "preview", `videos/${input.projectSlug}`, "--status", "--json"]));
      if (status?.result?.state === "running") throw new Error(`A managed preview is already running at ${status.result.studioUrl ?? status.result.serverUrl}`);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("A managed preview")) throw error;
      // A missing preview is the normal start state; the start command owns any real failure.
    }
  }
  const job = createJob({ driver: input.type === "generation" ? "codex" : "hyperframes", type: input.type, projectSlug: input.projectSlug, command }, jobId);
  if (isMutation) activeMutationJob = job.id;
  if (input.type === "preview" && input.projectSlug) activePreviews.set(input.projectSlug, job.id);
  const logDir = path.join(STUDIO_ROOT, "logs", job.id);
  await fs.mkdir(logDir, { recursive: true });
  const child = spawn(command[0], command.slice(1), { cwd: REPO_ROOT, env: process.env, shell: false });
  jobs.set(job.id, { summary: job, child });
  job.status = "running";
  await persistJobs();
  const append = (chunk: Buffer) => {
    const text = chunk.toString();
    job.output = appendBoundedOutput(job.output, text);
    const url = previewUrlFromOutput(job.output);
    if (url) job.previewUrl = url;
    if (input.type === "preview") {
      try {
        const payload = JSON.parse(text.trim());
        if (payload?.result?.studioUrl) job.previewUrl = payload.result.studioUrl;
        if (payload?.result?.pid) job.previewPid = payload.result.pid;
      } catch { /* logs can contain non-JSON lines */ }
    }
  };
  child.stdout?.on("data", append);
  child.stderr?.on("data", append);
  child.stdout?.pipe(fsSync.createWriteStream(path.join(logDir, "stdout.log")));
  child.stderr?.pipe(fsSync.createWriteStream(path.join(logDir, "stderr.log")));
  child.on("error", (error) => { job.status = "failed"; job.error = error.message; job.finishedAt = new Date().toISOString(); if (activeMutationJob === job.id) activeMutationJob = null; void persistJobs(); });
  child.on("close", async (code, signal) => {
    if (job.status === "cancelled") return;
    job.status = code === 0 ? "succeeded" : "failed";
    if (signal) job.error = `Process ended with signal ${signal}`;
    if (code && !job.error) job.error = `Process exited with code ${code}`;
    if (code === 0 && renderPaths) {
      try { await fs.rename(renderPaths.partPath, renderPaths.finalPath); }
      catch (error) { job.status = "failed"; job.error = error instanceof Error ? error.message : "Could not finalize render"; }
    }
    job.finishedAt = new Date().toISOString();
    if (activeMutationJob === job.id) activeMutationJob = null;
    if (input.type === "preview" && input.projectSlug && activePreviews.get(input.projectSlug) === job.id) activePreviews.delete(input.projectSlug);
    await persistJobs();
  });
  return job;
}

export function cancelJob(id: string): JobSummary | undefined {
  const record = jobs.get(id);
  if (!record) return undefined;
  if (record.summary.status === "succeeded" || record.summary.status === "failed" || record.summary.status === "cancelled") return record.summary;
  record.summary.status = "cancelled";
  record.child?.kill("SIGTERM");
  record.summary.finishedAt = new Date().toISOString();
  if (activeMutationJob === id) activeMutationJob = null;
  if (record.summary.projectSlug && activePreviews.get(record.summary.projectSlug) === id) activePreviews.delete(record.summary.projectSlug);
  void persistJobs();
  return record.summary;
}

export async function stopPreview(slug: string) {
  projectPath(slug);
  const output = await captureProcess("npx", ["--no-install", "hyperframes", "preview", `videos/${slug}`, "--stop", "--json"]);
  activePreviews.delete(slug);
  return JSON.parse(output);
}

function commandFor(input: { type: JobSummary["type"]; projectSlug?: string; topic?: string; template?: string; workflow?: string; images?: string }, renderOutput?: string): string[] {
  switch (input.type) {
    case "generation": {
      const template = input.template ?? DEFAULT_TEMPLATE;
      const workflow = input.workflow ?? DEFAULT_WORKFLOW;
      const images = input.images ?? DEFAULT_IMAGES;
      if (!ALLOWED_TEMPLATES.has(template)) throw new Error("Template is not enabled in the studio");
      if (!ALLOWED_WORKFLOWS.has(workflow)) throw new Error("Generation workflow is not enabled in the studio");
      if (!ALLOWED_IMAGE_MODES.has(images)) throw new Error("Image policy is not enabled in the studio");
      if (!input.topic?.trim()) throw new Error("A topic is required");
      return ["node", "scripts/codex-create-short.mjs", "--workflow", workflow, "--template", template, "--images", images, "--topic", input.topic.trim()];
    }
    case "check":
      if (!input.projectSlug) throw new Error("A project is required");
      return ["npx", "--no-install", "hyperframes", "check", `videos/${input.projectSlug}`, "--json", "--strict", "--at-transitions"];
    case "preview":
      if (!input.projectSlug) throw new Error("A project is required");
      return ["npx", "--no-install", "hyperframes", "preview", `videos/${input.projectSlug}`, "--background", "--no-open", "--json"];
    case "render":
      if (!input.projectSlug) throw new Error("A project is required");
      return ["npx", "--no-install", "hyperframes", "render", `videos/${input.projectSlug}`, "--output", renderOutput ?? `videos/${input.projectSlug}/out/${input.projectSlug}.mp4`];
  }
}

export function renderOutputPaths(slug: string, projectDir: string) {
  const finalPath = path.join(projectDir, "out", `${slug}.mp4`);
  const partName = `.${slug}.${crypto.randomUUID()}.part.mp4`;
  return { finalPath, partPath: path.join(projectDir, "out", partName), partRelativePath: `videos/${slug}/out/${partName}` };
}

async function captureProcess(command: string, args: string[]): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, { cwd: REPO_ROOT, env: process.env, shell: false });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk) => { output += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve(output.trim()) : reject(new Error(output.trim().slice(-4000) || `${command} exited ${code}`)));
  });
}

async function assertRenderReady(slug: string) {
  try {
    await assertProjectReady(projectPath(slug), { requireReview: true });
  } catch (error) {
    throw new Error(`Render blocked by project contract: ${error instanceof Error ? error.message : "project is not ready"}`);
  }
  try {
    await captureProcess("npx", ["--no-install", "hyperframes", "check", `videos/${slug}`, "--json", "--strict", "--at-transitions"]);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "strict check failed";
    throw new Error(`Render blocked because the current project did not pass strict HyperFrames validation: ${detail}`);
  }
}

export async function preflight(): Promise<PreflightCheck[]> {
  const checks: PreflightCheck[] = [];
  for (const [id, label, command, args] of [
    ["node", "Node.js 22+", "node", ["--version"]],
    ["python", "Python 3.10+", "python", ["--version"]],
    ["ffmpeg", "FFmpeg", "ffmpeg", ["-version"]],
    ["npx", "npx / HyperFrames CLI", "npx", ["--no-install", "hyperframes", "--version"]],
    ["codex", "Codex CLI", "codex", ["--version"]],
  ] as const) {
    try {
      const output = await new Promise<string>((resolve, reject) => {
        const child = spawn(command, args, { cwd: REPO_ROOT, env: process.env, shell: false });
        let text = "";
        child.stdout.on("data", (chunk) => { text += chunk.toString(); });
        child.stderr.on("data", (chunk) => { text += chunk.toString(); });
        child.on("error", reject);
        child.on("close", (code) => code === 0 ? resolve(text.trim()) : reject(new Error(text.trim() || `exit ${code}`)));
      });
      checks.push({ id, label, status: "pass", detail: output.split("\n")[0] || "Available" });
    } catch (error) {
      checks.push({ id, label, status: "fail", detail: error instanceof Error ? error.message : "Unavailable" });
    }
  }
  try {
    const result = JSON.parse(await captureProcess("npx", ["--no-install", "hyperframes", "upgrade", "--check", "--json"]));
    checks.push({ id: "hyperframes-release", label: "HyperFrames release", status: result.updateAvailable ? "fail" : "pass", detail: result.updateAvailable ? `${result.current} installed; ${result.latest} available` : `${result.current} is current` });
  } catch (error) {
    checks.push({ id: "hyperframes-release", label: "HyperFrames release", status: "fail", detail: error instanceof Error ? error.message : "Could not check HyperFrames release" });
  }
  try {
    const features = await captureProcess("codex", ["features", "list"]);
    const enabled = /^image_generation\s+stable\s+true$/m.test(features);
    checks.push({ id: "codex-image-generation", label: "Codex image generation", status: enabled ? "pass" : "warn", detail: enabled ? "Stable and enabled" : "Unavailable; use images=off or allow native/registry fallback" });
  } catch (error) {
    checks.push({ id: "codex-image-generation", label: "Codex image generation", status: "warn", detail: error instanceof Error ? error.message : "Could not inspect Codex features" });
  }
  try {
    const result = JSON.parse(await captureProcess("npx", ["--no-install", "hyperframes", "skills", "check", "--dir", ".agents/skills", "--json"]));
    const summary = result.summary ?? {};
    const current = summary.outdated === 0 && summary.coreMissing === 0;
    checks.push({ id: "hyperframes-skills", label: "Project HyperFrames skills", status: current ? "pass" : "fail", detail: current ? `${summary.current ?? 0} official skills current` : `${summary.outdated ?? 0} outdated, ${summary.coreMissing ?? 0} core missing` });
  } catch (error) {
    checks.push({ id: "hyperframes-skills", label: "Project HyperFrames skills", status: "fail", detail: error instanceof Error ? error.message : "Could not inspect project skills" });
  }
  return checks;
}
