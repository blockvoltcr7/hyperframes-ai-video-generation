import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { projectPath, REPO_ROOT, STUDIO_ROOT } from "./paths.js";
import type { JobSummary, PreflightCheck } from "./types.js";
import { assertProjectReady } from "./project-contracts.js";
import { ALLOWED_IMAGE_MODES, ALLOWED_TEMPLATES, ALLOWED_WORKFLOWS, DEFAULT_IMAGES, DEFAULT_TEMPLATE, DEFAULT_WORKFLOW } from "./generation-policy.js";
import { RunnerError } from "./errors.js";
import { createJsonStateFile } from "./state-file.js";

export interface JobRequest {
  type: JobSummary["type"];
  projectSlug?: string;
  topic?: string;
  template?: string;
  workflow?: string;
  images?: string;
}

const JOB_TYPES: ReadonlySet<string> = new Set<JobSummary["type"]>(["generation", "check", "preview", "render"]);
const jobs = new Map<string, { summary: JobSummary; child?: ReturnType<typeof spawn> }>();
const jobState = createJsonStateFile<JobSummary[]>(path.join(STUDIO_ROOT, "state", "jobs.json"));
const JOB_OUTPUT_LIMIT = 20_000;
let activeMutationJob: string | null = null;
const activePreviews = new Map<string, string>();

export function isJobType(value: unknown): value is JobSummary["type"] {
  return typeof value === "string" && JOB_TYPES.has(value);
}

export function appendBoundedOutput(current: string, chunk: string, limit = JOB_OUTPUT_LIMIT): string {
  return `${current}${chunk}`.slice(-limit);
}

export function previewUrlFromOutput(output: string): string | undefined {
  const url = output.match(/https?:\/\/(?:127\.0\.0\.1|localhost):\d+(?:\/[^\s]*)?/i)?.[0];
  return url?.replace(/[),.]+$/, "");
}

async function hydrateJobs() {
  const stored = await jobState.read();
  if (!Array.isArray(stored)) return;
  for (const summary of stored) {
    if (summary.status === "queued" || summary.status === "running") {
      summary.status = "failed";
      summary.error = "Runner restarted before this job reached a terminal state";
      summary.finishedAt = new Date().toISOString();
    }
    jobs.set(summary.id, { summary });
  }
}

function persistJobs(): Promise<void> {
  return jobState.write(listJobs);
}

await hydrateJobs();

export function getJob(id: string): JobSummary | undefined { return jobs.get(id)?.summary; }
export function listJobs(): JobSummary[] { return [...jobs.values()].map((item) => item.summary).reverse(); }

// Jobs are `npx`/`node` wrappers around the real work (HyperFrames CLI, esbuild, headless
// Chrome, Codex). Signalling only the wrapper leaves that tree running, so each job gets its
// own process group and is stopped as a group.
const USE_PROCESS_GROUPS = process.platform !== "win32";

function terminateJobProcess(child: ReturnType<typeof spawn>, signal: NodeJS.Signals = "SIGTERM") {
  if (child.exitCode !== null || child.signalCode !== null || !child.pid) return;
  if (USE_PROCESS_GROUPS) {
    try { process.kill(-child.pid, signal); return; } catch { /* group already gone; fall back to the direct child */ }
  }
  child.kill(signal);
}

function isActive(summary: JobSummary) {
  return summary.status === "queued" || summary.status === "running";
}

/** Stop every active job (used on runner shutdown so cancelled work does not outlive the runner). */
export async function shutdownJobs(reason: string, graceMs = 3000): Promise<void> {
  const active = [...jobs.values()].filter((record) => record.child && isActive(record.summary));
  const exits = active.map((record) => new Promise<void>((resolve) => {
    if (record.child!.exitCode !== null || record.child!.signalCode !== null) return resolve();
    record.child!.once("close", () => resolve());
    setTimeout(resolve, graceMs).unref();
  }));
  for (const record of active) {
    record.summary.status = "cancelled";
    record.summary.error = reason;
    record.summary.finishedAt = new Date().toISOString();
    terminateJobProcess(record.child!);
  }
  activeMutationJob = null;
  activePreviews.clear();
  await Promise.all([persistJobs(), ...exits]);
}

export async function runJob(input: JobRequest): Promise<JobSummary> {
  if (!isJobType(input.type)) throw new RunnerError(`Unsupported job type: ${String(input.type)}`);
  const isMutation = input.type === "generation" || input.type === "render";
  if (isMutation && activeMutationJob) throw new RunnerError("A generation or render job is already running", 409);

  const project = input.projectSlug ? projectPath(input.projectSlug) : undefined;
  if (project && !(await fs.stat(project).catch(() => null))) throw new RunnerError("Project does not exist", 404);
  if (input.type === "render" && input.projectSlug) await assertRenderReady(input.projectSlug);

  const renderPaths = input.type === "render" && input.projectSlug && project ? renderOutputPaths(input.projectSlug, project) : undefined;
  if (renderPaths) {
    if (await fs.stat(renderPaths.finalPath).catch(() => null)) throw new RunnerError("Render output already exists; remove it before starting another render", 409);
    await fs.mkdir(path.dirname(renderPaths.finalPath), { recursive: true });
  }
  const command = commandFor(input, renderPaths?.partRelativePath);

  // Reserve the exclusive slots synchronously so two overlapping requests cannot both pass the
  // checks while one of them is awaiting the managed-preview status probe below.
  const jobId = crypto.randomUUID();
  if (isMutation && activeMutationJob) throw new RunnerError("A generation or render job is already running", 409);
  if (isMutation) activeMutationJob = jobId;
  const previewSlug = input.type === "preview" ? input.projectSlug : undefined;
  if (previewSlug) {
    if (activePreviews.has(previewSlug)) throw new RunnerError("A preview is already running for this project", 409);
    activePreviews.set(previewSlug, jobId);
  }
  const releaseReservations = () => {
    if (activeMutationJob === jobId) activeMutationJob = null;
    if (previewSlug && activePreviews.get(previewSlug) === jobId) activePreviews.delete(previewSlug);
  };
  const discardPartialRender = async () => {
    if (renderPaths) await fs.rm(renderPaths.partPath, { force: true }).catch(() => undefined);
  };

  try {
    if (previewSlug) {
      let status: { result?: { state?: string; studioUrl?: string; serverUrl?: string } } | undefined;
      // A missing managed preview is the normal start state; the start command owns any real failure.
      try { status = JSON.parse(await captureProcess("npx", ["--no-install", "hyperframes", "preview", `videos/${previewSlug}`, "--status", "--json"])); } catch { /* not running */ }
      if (status?.result?.state === "running") throw new RunnerError(`A managed preview is already running at ${status.result.studioUrl ?? status.result.serverUrl}`, 409);
    }

    const job: JobSummary = { id: jobId, driver: input.type === "generation" ? "codex" : "hyperframes", type: input.type, projectSlug: input.projectSlug, command, startedAt: new Date().toISOString(), status: "queued", output: "" };
    const logDir = path.join(STUDIO_ROOT, "logs", job.id);
    await fs.mkdir(logDir, { recursive: true });
    const child = spawn(command[0], command.slice(1), { cwd: REPO_ROOT, env: process.env, shell: false, detached: USE_PROCESS_GROUPS });
    jobs.set(job.id, { summary: job, child });
    job.status = "running";
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
    // Node emits "close" after "error" (with a negative code), so "close" is the single place
    // that finalizes the job, releases slots, and persists.
    child.on("error", (error) => { job.error = error.message; });
    child.on("close", async (code, signal) => {
      if (job.status === "cancelled") {
        await discardPartialRender();
        return;
      }
      job.status = code === 0 ? "succeeded" : "failed";
      if (signal) job.error = `Process ended with signal ${signal}`;
      if (code && !job.error) job.error = `Process exited with code ${code}`;
      if (renderPaths) {
        if (code === 0) {
          try { await fs.rename(renderPaths.partPath, renderPaths.finalPath); }
          catch (error) { job.status = "failed"; job.error = error instanceof Error ? error.message : "Could not finalize render"; }
        }
        if (job.status === "failed") await discardPartialRender();
      }
      job.finishedAt = new Date().toISOString();
      releaseReservations();
      await persistJobs();
    });
    await persistJobs();
    return job;
  } catch (error) {
    releaseReservations();
    await discardPartialRender();
    throw error;
  }
}

export function cancelJob(id: string): JobSummary | undefined {
  const record = jobs.get(id);
  if (!record) return undefined;
  if (!isActive(record.summary)) return record.summary;
  record.summary.status = "cancelled";
  if (record.child) terminateJobProcess(record.child);
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

function commandFor(input: JobRequest, renderOutput?: string): string[] {
  switch (input.type) {
    case "generation": {
      const template = input.template ?? DEFAULT_TEMPLATE;
      const workflow = input.workflow ?? DEFAULT_WORKFLOW;
      const images = input.images ?? DEFAULT_IMAGES;
      if (!ALLOWED_TEMPLATES.has(template)) throw new RunnerError("Template is not enabled in the studio");
      if (!ALLOWED_WORKFLOWS.has(workflow)) throw new RunnerError("Generation workflow is not enabled in the studio");
      if (!ALLOWED_IMAGE_MODES.has(images)) throw new RunnerError("Image policy is not enabled in the studio");
      if (!input.topic?.trim()) throw new RunnerError("A topic is required");
      return ["node", "scripts/codex-create-short.mjs", "--workflow", workflow, "--template", template, "--images", images, "--topic", input.topic.trim()];
    }
    case "check":
      if (!input.projectSlug) throw new RunnerError("A project is required");
      return ["npx", "--no-install", "hyperframes", "check", `videos/${input.projectSlug}`, "--json", "--strict", "--at-transitions"];
    case "preview":
      if (!input.projectSlug) throw new RunnerError("A project is required");
      return ["npx", "--no-install", "hyperframes", "preview", `videos/${input.projectSlug}`, "--background", "--no-open", "--json"];
    case "render":
      if (!input.projectSlug) throw new RunnerError("A project is required");
      return ["npx", "--no-install", "hyperframes", "render", `videos/${input.projectSlug}`, "--output", renderOutput ?? `videos/${input.projectSlug}/out/${input.projectSlug}.mp4`];
    default:
      throw new RunnerError(`Unsupported job type: ${String((input as { type: unknown }).type)}`);
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
    throw new RunnerError(`Render blocked by project contract: ${error instanceof Error ? error.message : "project is not ready"}`, 409);
  }
  try {
    await captureProcess("npx", ["--no-install", "hyperframes", "check", `videos/${slug}`, "--json", "--strict", "--at-transitions"]);
  } catch (error) {
    const detail = error instanceof Error ? error.message : "strict check failed";
    throw new RunnerError(`Render blocked because the current project did not pass strict HyperFrames validation: ${detail}`, 409);
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
      const output = await captureProcess(command, [...args]);
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
