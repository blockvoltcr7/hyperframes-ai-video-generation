import { describe, expect, it } from "vitest";
import { resolveRepoPath } from "./paths.js";
import { appendBoundedOutput, isJobType, previewUrlFromOutput, renderOutputPaths, runJob } from "./commands.js";
import { RunnerError, statusForError } from "./errors.js";
import { DEFAULT_WORKFLOW } from "./generation-policy.js";

describe("runner filesystem policy", () => {
  it("rejects paths escaping the repository", () => {
    expect(() => resolveRepoPath("../secrets.txt")).toThrow(/escapes/);
  });

  it("rejects protected environment files", () => {
    expect(() => resolveRepoPath(".env", { allowMissing: true })).toThrow(/protected/);
    expect(() => resolveRepoPath(".env.local", { allowMissing: true })).toThrow(/protected/);
  });

  it("rejects arbitrary root paths", () => {
    expect(() => resolveRepoPath("Documents/video.mp4", { allowMissing: true })).toThrow(/root is not allowed/);
  });

  it("does not allow arbitrary generation templates", async () => {
    await expect(runJob({ type: "generation", template: "../../secrets", topic: "test" })).rejects.toThrow(/not enabled/);
  });

  it("does not allow arbitrary generation workflows or image policies", async () => {
    await expect(runJob({ type: "generation", workflow: "../../workflow", topic: "test" })).rejects.toThrow(/workflow is not enabled/);
    await expect(runJob({ type: "generation", images: "unlimited", topic: "test" })).rejects.toThrow(/Image policy is not enabled/);
  });

  it("defaults generation to the shared adaptive workflow", () => {
    expect(DEFAULT_WORKFLOW).toBe("adaptive");
  });

  it("rejects unknown job types before touching the filesystem or spawning", async () => {
    expect(isJobType("render")).toBe(true);
    expect(isJobType("shell")).toBe(false);
    expect(isJobType(undefined)).toBe(false);
    await expect(runJob({ type: "shell" as never, projectSlug: "demo" })).rejects.toThrow(/Unsupported job type: shell/);
  });

  it("rejects invalid project slugs and reports missing projects as 404", async () => {
    await expect(runJob({ type: "check", projectSlug: "../etc" })).rejects.toThrow(/Invalid project slug/);
    const missing = await runJob({ type: "check", projectSlug: "definitely-missing-project-4176" }).catch((error: unknown) => error);
    expect(missing).toBeInstanceOf(RunnerError);
    expect(statusForError(missing)).toBe(404);
    expect((missing as Error).message).toMatch(/Project does not exist/);
  });

  it("maps plain errors to 400 and runner errors to their declared status", () => {
    expect(statusForError(new Error("bad input"))).toBe(400);
    expect(statusForError(new RunnerError("conflict", 409))).toBe(409);
    expect(statusForError("not an error")).toBe(400);
  });

  it("keeps a rolling job output buffer instead of retaining every chunk", () => {
    const first = appendBoundedOutput("", "a".repeat(15_000), 20_000);
    const next = appendBoundedOutput(first, "b".repeat(15_000), 20_000);
    expect(next.length).toBe(20_000);
    expect(next.startsWith("a".repeat(5_000))).toBe(true);
    expect(next.endsWith("b".repeat(15_000))).toBe(true);
  });

  it("extracts both localhost and loopback preview URLs", () => {
    expect(previewUrlFromOutput("ready at http://localhost:3004/#project/demo")).toBe("http://localhost:3004/#project/demo");
    expect(previewUrlFromOutput("ready at http://127.0.0.1:3004/#project/demo")).toBe("http://127.0.0.1:3004/#project/demo");
  });

  it("keeps the MP4 extension on atomic render output", () => {
    const paths = renderOutputPaths("demo-video", "/repo/videos/demo-video");

    expect(paths.finalPath).toBe("/repo/videos/demo-video/out/demo-video.mp4");
    expect(paths.partPath).toMatch(/\/out\/\.demo-video\.[a-f0-9-]+\.part\.mp4$/);
    expect(paths.partRelativePath).toMatch(/^videos\/demo-video\/out\/\.demo-video\.[a-f0-9-]+\.part\.mp4$/);
  });
});
