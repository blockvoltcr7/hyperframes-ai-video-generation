import { describe, expect, it } from "vitest";
import { resolveRepoPath } from "./paths.js";
import { renderOutputPaths, runJob } from "./commands.js";

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

  it("keeps the MP4 extension on atomic render output", () => {
    const paths = renderOutputPaths("demo-video", "/repo/videos/demo-video");

    expect(paths.finalPath).toBe("/repo/videos/demo-video/out/demo-video.mp4");
    expect(paths.partPath).toMatch(/\/out\/\.demo-video\.[a-f0-9-]+\.part\.mp4$/);
    expect(paths.partRelativePath).toMatch(/^videos\/demo-video\/out\/\.demo-video\.[a-f0-9-]+\.part\.mp4$/);
  });
});
