import fs from "node:fs/promises";
import path from "node:path";
import { projectPath, REPO_ROOT, resolveRepoPath } from "./paths.js";
import type { Artifact, ProjectSummary } from "./types.js";
import { readProjectContract } from "./project-contracts.js";

const artifactMap: Array<[string, Artifact["kind"]]> = [
  ["index.html", "composition"],
  ["script.txt", "script"],
  ["SCRIPT.md", "script"],
  ["STORYBOARD.md", "storyboard"],
  ["transcript.json", "transcript"],
  ["audio/narration.wav", "narration"],
  ["audio_meta.json", "narration"],
  ["DESIGN.md", "design"],
  ["frame.md", "design"],
  ["visual-plan.json", "visual-plan"],
  ["asset-plan.json", "asset-plan"],
  ["assets/generated/manifest.json", "asset-manifest"],
  ["SOURCES.md", "sources"],
  ["snapshots/contact-sheet.jpg", "qa"],
  ["meta.json", "metadata"],
  ["workflow-run.json", "metadata"],
  ["qa/report.json", "qa"],
  ["out", "render"],
];

async function artifactFor(projectDir: string, relativePath: string, kind: Artifact["kind"]): Promise<Artifact> {
  const absolute = path.join(projectDir, relativePath);
  try {
    const stat = await fs.stat(absolute);
    return { kind, relativePath, exists: true, sizeBytes: stat.isDirectory() ? 0 : stat.size, modifiedAt: stat.mtime.toISOString() };
  } catch {
    return { kind, relativePath, exists: false, sizeBytes: 0, modifiedAt: null };
  }
}

export async function scanProjects(): Promise<ProjectSummary[]> {
  const videosDir = resolveRepoPath("videos", { allowMissing: true });
  let entries: Array<import("node:fs").Dirent> = [];
  try { entries = await fs.readdir(videosDir, { withFileTypes: true }); } catch { return []; }

  const projects: ProjectSummary[] = [];
  for (const entry of entries.filter((item) => item.isDirectory() && !item.name.startsWith("."))) {
    const slug = entry.name;
    const projectDir = projectPath(slug);
    const artifacts = await Promise.all(artifactMap.map(([file, kind]) => artifactFor(projectDir, file, kind)));
    let title = slug;
    try { title = JSON.parse(await fs.readFile(path.join(projectDir, "meta.json"), "utf8")).name ?? slug; } catch { /* incomplete metadata */ }
    const timestamps = artifacts.map((item) => item.modifiedAt).filter(Boolean).sort().reverse();
    const has = (kind: Artifact["kind"], minimumBytes = 1) => artifacts.some((item) => item.kind === kind && item.exists && item.sizeBytes >= minimumBytes);
    const hasAlignedNarration = (has("transcript", 3) && artifacts.some((item) => item.relativePath === "audio/narration.wav" && item.exists && item.sizeBytes > 1024))
      || artifacts.some((item) => item.relativePath === "audio_meta.json" && item.exists && item.sizeBytes > 10);
    const contract = await readProjectContract(projectDir).catch(() => undefined);
    const contractReady = contract && contract.artifacts.ok && contract.fresh && contract.qa?.status === "passed" && contract.qa.visualEvidence.reviewed;
    projects.push({
      slug,
      title,
      path: path.relative(REPO_ROOT, projectDir),
      template: await detectTemplate(projectDir),
      workflow: contract?.manifest.workflow,
      qaStatus: contract ? (contract.fresh ? contract.qa?.status ?? "missing" : "stale") : "missing",
      status: contract ? (contractReady ? "ready" : "incomplete") : (has("composition") && has("script") && has("design") && has("metadata") && hasAlignedNarration ? "ready" : "incomplete"),
      artifacts,
      updatedAt: timestamps[0] ?? null,
    });
  }
  return projects.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
}

async function detectTemplate(projectDir: string): Promise<string> {
  try {
    const html = await fs.readFile(path.join(projectDir, "index.html"), "utf8");
    if (html.includes("ARCHON")) return "archon";
    if (html.includes("ANTHROPIC")) return "anthropic";
  } catch { /* use fallback */ }
  return "classic";
}
