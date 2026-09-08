import crypto from "node:crypto";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { assertProjectReady, computeProjectSourceDigest, FalGeneratedVideoPlanSchema, GeneratedVideoPlanSchema, LocaleBundleSchema, validateProjectArtifacts } from "./project-contracts.js";

const VIDEO_BYTES = Buffer.from("verified generated video");
const VIDEO_SHA256 = crypto.createHash("sha256").update(VIDEO_BYTES).digest("hex");
const CANONICAL_VIDEO = "assets/generated/video/intro.mp4";
const VIDEO_COPY = "video/assets/generated/video/intro.mp4";

async function createReadyGeneratedVideoProject() {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "hyperframes-video-contract-"));
  const artifacts = ["index.html", "SCRIPT.md", "STORYBOARD.md", "DESIGN.md", "SOURCES.md", "meta.json", "snapshots/contact-sheet.jpg"];
  for (const artifact of artifacts) {
    const absolute = path.join(dir, artifact);
    await fs.mkdir(path.dirname(absolute), { recursive: true });
    await fs.writeFile(absolute, artifact);
  }
  await fs.writeFile(path.join(dir, "workflow-run.json"), JSON.stringify({
    schemaVersion: 1,
    workflow: "general-video",
    projectSlug: "generated-video-contract",
    createdAt: "2026-08-27T12:00:00.000Z",
    updatedAt: "2026-08-27T12:00:00.000Z",
    hyperframesVersion: "0.8.14",
    delivery: { id: "youtube-short", width: 1080, height: 1920, fps: 30, safeZone: { top: 0, right: 0, bottom: 0, left: 0 }, captionMode: "embedded" },
    locales: ["en-US"],
    nodes: [{ id: "qa", status: "succeeded" }],
  }));
  await fs.mkdir(path.join(dir, "assets", "generated", "video"), { recursive: true });
  await fs.writeFile(path.join(dir, CANONICAL_VIDEO), VIDEO_BYTES);
  await fs.mkdir(path.join(dir, "video", "assets", "generated", "video"), { recursive: true });
  await fs.writeFile(path.join(dir, VIDEO_COPY), VIDEO_BYTES);
  await fs.writeFile(path.join(dir, "assets", "generated", "video", "manifest.json"), JSON.stringify({
    schemaVersion: 1,
    assets: [{
      id: "intro",
      asset: CANONICAL_VIDEO,
      kind: "generated-video",
      copies: [VIDEO_COPY],
      provider: "fal.ai",
      model: "fal-ai/example",
      sha256: VIDEO_SHA256,
      estimatedCostUsd: 0.08,
      billingEstimate: {
        persistedPreflightEstimateUsd: 0.08,
        persistedEstimatedBillableSeconds: 8,
        currentConservativeCeilingUsd: 0.168667,
        currentConservativeSeconds: 506 / 30,
        actualBillingUsd: null,
        status: "not-reconciled",
        basis: "provider-price-times-conservative-generated-seconds",
      },
      canonical: { sha256: VIDEO_SHA256, sizeBytes: VIDEO_BYTES.length, codec: "h264", width: 1280, height: 720, fps: 30, frameCount: 240, durationSeconds: 8, hasAudio: false },
      rawDownload: { sha256: "a".repeat(64), sizeBytes: 506, codec: "h264", width: 1280, height: 704, fps: 30, frameCount: 506, durationSeconds: 506 / 30, hasAudio: false },
      media: {
        codec: "h264", width: 1280, height: 720, fps: 30, frameCount: 240, durationSeconds: 8, hasAudio: false, sizeBytes: VIDEO_BYTES.length,
        raw: { codec: "h264", width: 1280, height: 704, fps: 30, frameCount: 506, durationSeconds: 506 / 30, hasAudio: false },
        normalization: {
          applied: true,
          spatial: { applied: true, method: "centered-cover-crop", source: { width: 1280, height: 704 }, target: { width: 1280, height: 720 } },
          temporal: { applied: true, method: "full-clip-uniform-retime", sourceFrameCount: 506, sourceDurationSeconds: 506 / 30, targetFrameCount: 240, targetDurationSeconds: 8, durationRatio: 240 / 506, ptsRatio: 239 / 505, speedMultiplier: 505 / 239, endpointPolicy: "first-and-last-frame-time-aligned" },
        },
      },
    }],
  }));

  const report = {
    schemaVersion: 1,
    generatedAt: "2026-08-27T12:01:00.000Z",
    projectSlug: "generated-video-contract",
    workflow: "general-video",
    sourceDigest: await computeProjectSourceDigest(dir),
    status: "passed",
    checks: { lint: "passed", strict: "passed", transitions: "passed", captions: "not-run", audio: "not-run", localization: "not-run" },
    visualEvidence: { snapshots: ["snapshots/contact-sheet.jpg"], contactSheet: "snapshots/contact-sheet.jpg", reviewed: true },
    provenance: [{ asset: CANONICAL_VIDEO, kind: "generated-video", source: "assets/generated/intro.png", provider: "fal.ai", model: "fal-ai/example", sha256: VIDEO_SHA256, reviewed: true }],
    reviewer: { status: "pending" },
  };
  await fs.mkdir(path.join(dir, "qa"));
  await fs.writeFile(path.join(dir, "qa", "report.json"), JSON.stringify(report));
  return { dir, report };
}

async function writeFreshQa(dir: string, report: Awaited<ReturnType<typeof createReadyGeneratedVideoProject>>["report"]) {
  report.sourceDigest = await computeProjectSourceDigest(dir);
  await fs.writeFile(path.join(dir, "qa", "report.json"), JSON.stringify(report));
}

describe("project contracts", () => {
  it("requires workflow-specific presentation evidence", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "hyperframes-contract-"));
    await fs.writeFile(path.join(dir, "index.html"), "<html></html>");
    const result = await validateProjectArtifacts(dir, "presentation");
    expect(result.ok).toBe(false);
    expect(result.missing).toContain("video/index.html");
  });

  it("invalidates source digest when governed input changes and ignores QA output", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "hyperframes-digest-"));
    await fs.writeFile(path.join(dir, "index.html"), "one");
    const first = await computeProjectSourceDigest(dir);
    await fs.writeFile(path.join(dir, "index.html"), "two");
    const second = await computeProjectSourceDigest(dir);
    await fs.mkdir(path.join(dir, "qa"));
    await fs.writeFile(path.join(dir, "qa", "report.json"), "ignored");
    expect(second).not.toBe(first);
    expect(await computeProjectSourceDigest(dir)).toBe(second);
  });

  it("ignores HyperFrames preview caches and hidden directories so a preview does not stale QA", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "hyperframes-digest-cache-"));
    await fs.writeFile(path.join(dir, "index.html"), "composition");
    const before = await computeProjectSourceDigest(dir);
    for (const cacheDir of [".waveform-cache", ".thumbnails", ".transcode-cache", ".hyperframes", "out", "renders"]) {
      await fs.mkdir(path.join(dir, cacheDir), { recursive: true });
      await fs.writeFile(path.join(dir, cacheDir, "artifact.bin"), cacheDir);
    }
    await fs.writeFile(path.join(dir, ".DS_Store"), "junk");
    expect(await computeProjectSourceDigest(dir)).toBe(before);
    await fs.mkdir(path.join(dir, "assets"));
    await fs.writeFile(path.join(dir, "assets", "logo.svg"), "<svg/>");
    expect(await computeProjectSourceDigest(dir)).not.toBe(before);
  });

  it("reuses an unchanged digest for polling without missing real edits", async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), "hyperframes-digest-reuse-"));
    await fs.writeFile(path.join(dir, "index.html"), "one");
    const exact = await computeProjectSourceDigest(dir);
    expect(await computeProjectSourceDigest(dir, { reuseUnchanged: true })).toBe(exact);
    expect(await computeProjectSourceDigest(dir, { reuseUnchanged: true })).toBe(exact);
    await fs.writeFile(path.join(dir, "index.html"), "one-two");
    const changed = await computeProjectSourceDigest(dir, { reuseUnchanged: true });
    expect(changed).not.toBe(exact);
    expect(changed).toBe(await computeProjectSourceDigest(dir));
  });

  it("validates provider-neutral generated shots and locale review", () => {
    expect(GeneratedVideoPlanSchema.safeParse({ schemaVersion: 1, shots: [{ id: "shot-1", purpose: "Establish flow", referenceAssets: ["assets/flow.png"], camera: "slow push", durationSeconds: 4, aspectRatio: "16:9", continuityNotes: "preserve violet node positions", audioPolicy: "none", fallback: "animated-still" }] }).success).toBe(true);
    expect(LocaleBundleSchema.safeParse({ schemaVersion: 1, locale: "en-US", direction: "ltr", strings: { title: "Goal Mode" }, overflowReviewed: false }).success).toBe(true);
  });

  it("validates an executable cost-capped Fal image-to-video plan", () => {
    const executable = {
      schemaVersion: 1,
      provider: "fal.ai",
      model: "fal-ai/longcat-video/distilled/image-to-video/720p",
      maxCostUsd: 0.5,
      integrationFiles: ["index.html", "video/index.html"],
      shots: [{ id: "shot-1", purpose: "Establish flow", referenceAssets: ["assets/generated/flow.png"], startFrame: "assets/generated/flow.png", output: "assets/generated/video/flow-v1.mp4", copies: ["video/assets/generated/video/flow-v1.mp4"], prompt: "A restrained camera push follows the fixed flow while preserving all objects and their original arrangement.", camera: "slow push", durationSeconds: 8, numFrames: 240, fps: 30, aspectRatio: "16:9", continuityNotes: "preserve violet node positions", audioPolicy: "none", fallback: "animated-still" }],
    };
    expect(FalGeneratedVideoPlanSchema.safeParse(executable).success).toBe(true);
    expect(FalGeneratedVideoPlanSchema.safeParse({ ...executable, shots: [{ ...executable.shots[0], endFrame: "assets/generated/end.png" }] }).success).toBe(false);
    expect(FalGeneratedVideoPlanSchema.safeParse({ ...executable, shots: [{ ...executable.shots[0], durationSeconds: 30, numFrames: 900 }] }).success).toBe(false);
    expect(FalGeneratedVideoPlanSchema.safeParse({ ...executable, shots: [{ ...executable.shots[0], durationSeconds: 4, numFrames: 120 }] }).success).toBe(false);
  });

  it("validates an executable PixVerse C1 image-to-video plan", () => {
    const executable = {
      schemaVersion: 1,
      provider: "fal.ai",
      model: "fal-ai/pixverse/c1/image-to-video",
      maxCostUsd: 0.5,
      integrationFiles: ["index.html"],
      shots: [{ id: "shot-1", purpose: "Establish flow", referenceAssets: ["assets/generated/flow.png"], startFrame: "assets/generated/flow.png", output: "assets/generated/video/flow-v1.mp4", prompt: "A restrained camera push follows the fixed flow while preserving all objects and their original arrangement.", camera: "slow push", durationSeconds: 15, numFrames: 450, fps: 30, aspectRatio: "16:9", continuityNotes: "preserve violet node positions", audioPolicy: "none", fallback: "animated-still" }],
    };
    expect(FalGeneratedVideoPlanSchema.safeParse(executable).success).toBe(true);
    expect(FalGeneratedVideoPlanSchema.safeParse({ ...executable, shots: [{ ...executable.shots[0], durationSeconds: 16, numFrames: 480 }] }).success).toBe(false);
    expect(FalGeneratedVideoPlanSchema.safeParse({ ...executable, shots: [{ ...executable.shots[0], numFrames: 240 }] }).success).toBe(false);
  });

  it("accepts PixVerse raw probes at non-30 fps while keeping canonical 30 fps", async () => {
    const { dir, report } = await createReadyGeneratedVideoProject();
    const manifestPath = path.join(dir, "assets", "generated", "video", "manifest.json");
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    manifest.assets[0].model = "fal-ai/pixverse/c1/image-to-video";
    manifest.assets[0].rawDownload.fps = 24;
    manifest.assets[0].media.raw.fps = 24;
    report.provenance[0].model = "fal-ai/pixverse/c1/image-to-video";
    await fs.writeFile(manifestPath, JSON.stringify(manifest));
    await writeFreshQa(dir, report);
    await expect(assertProjectReady(dir)).resolves.toBeDefined();
  });

  it("accepts reviewed QA provenance matching every generated-video manifest asset", async () => {
    const { dir } = await createReadyGeneratedVideoProject();
    await expect(assertProjectReady(dir)).resolves.toBeDefined();
  });

  it("rejects a generated-video manifest asset omitted from QA provenance", async () => {
    const { dir, report } = await createReadyGeneratedVideoProject();
    report.provenance = [];
    await fs.writeFile(path.join(dir, "qa", "report.json"), JSON.stringify(report));
    await expect(assertProjectReady(dir)).rejects.toThrow(/generated-video QA provenance is missing for assets\/generated\/video\/intro\.mp4/);
  });

  it.each([
    ["provider", "another-provider"],
    ["model", "another-model"],
    ["sha256", "b".repeat(64)],
  ])("rejects generated-video QA provenance with a mismatched %s", async (field, value) => {
    const { dir, report } = await createReadyGeneratedVideoProject();
    report.provenance[0] = { ...report.provenance[0], [field]: value };
    await fs.writeFile(path.join(dir, "qa", "report.json"), JSON.stringify(report));
    await expect(assertProjectReady(dir)).rejects.toThrow(/does not match provider, model, and sha256/);
  });

  it("rejects matching generated-video QA provenance that is not reviewed", async () => {
    const { dir, report } = await createReadyGeneratedVideoProject();
    report.provenance[0].reviewed = false;
    await fs.writeFile(path.join(dir, "qa", "report.json"), JSON.stringify(report));
    await expect(assertProjectReady(dir)).rejects.toThrow(/generated-video QA provenance is not reviewed/);
  });

  it("rejects a generated-video manifest that presents an unreconciled estimate as actual billing", async () => {
    const { dir, report } = await createReadyGeneratedVideoProject();
    const manifestPath = path.join(dir, "assets", "generated", "video", "manifest.json");
    const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
    manifest.assets[0].billingEstimate.actualBillingUsd = 0.08;
    await fs.writeFile(manifestPath, JSON.stringify(manifest));
    await writeFreshQa(dir, report);
    await expect(assertProjectReady(dir)).rejects.toThrow(/generated\/video\/manifest\.json is invalid/);
  });

  it("rejects deletion of a generated-video manifest while canonical MP4 media remains", async () => {
    const { dir, report } = await createReadyGeneratedVideoProject();
    await fs.unlink(path.join(dir, "assets", "generated", "video", "manifest.json"));
    report.provenance = [];
    await writeFreshQa(dir, report);
    await expect(assertProjectReady(dir)).rejects.toThrow(/manifest\.json is required when generated-video media or active slots exist/);
  });

  it("rejects an empty generated-video manifest while canonical MP4 media remains", async () => {
    const { dir, report } = await createReadyGeneratedVideoProject();
    await fs.writeFile(path.join(dir, "assets", "generated", "video", "manifest.json"), JSON.stringify({ schemaVersion: 1, assets: [] }));
    report.provenance = [];
    await writeFreshQa(dir, report);
    await expect(assertProjectReady(dir)).rejects.toThrow(/manifest entry is missing for assets\/generated\/video\/intro\.mp4/);
  });

  it("rejects a manifest whose canonical generated-video asset is missing", async () => {
    const { dir, report } = await createReadyGeneratedVideoProject();
    await fs.unlink(path.join(dir, CANONICAL_VIDEO));
    await writeFreshQa(dir, report);
    await expect(assertProjectReady(dir)).rejects.toThrow(/generated-video asset is missing/);
  });

  it("rejects canonical generated-video bytes that do not match the manifest sha256", async () => {
    const { dir, report } = await createReadyGeneratedVideoProject();
    await fs.writeFile(path.join(dir, CANONICAL_VIDEO), "modified video bytes");
    await writeFreshQa(dir, report);
    await expect(assertProjectReady(dir)).rejects.toThrow(/generated-video asset sha256 does not match manifest/);
  });

  it("rejects a missing declared generated-video copy", async () => {
    const { dir, report } = await createReadyGeneratedVideoProject();
    await fs.unlink(path.join(dir, VIDEO_COPY));
    await writeFreshQa(dir, report);
    await expect(assertProjectReady(dir)).rejects.toThrow(/generated-video copy is missing/);
  });

  it("rejects declared generated-video copy bytes that do not match the canonical sha256", async () => {
    const { dir, report } = await createReadyGeneratedVideoProject();
    await fs.writeFile(path.join(dir, VIDEO_COPY), "modified copy bytes");
    await writeFreshQa(dir, report);
    await expect(assertProjectReady(dir)).rejects.toThrow(/generated-video copy sha256 does not match manifest/);
  });

  it("requires a manifest for an active generated-video slot without canonical media", async () => {
    const { dir, report } = await createReadyGeneratedVideoProject();
    await fs.unlink(path.join(dir, "assets", "generated", "video", "manifest.json"));
    await fs.unlink(path.join(dir, CANONICAL_VIDEO));
    await fs.unlink(path.join(dir, VIDEO_COPY));
    await fs.writeFile(path.join(dir, "index.html"), '<video data-generation-shot-id="intro"></video>');
    report.provenance = [];
    await writeFreshQa(dir, report);
    await expect(assertProjectReady(dir)).rejects.toThrow(/manifest\.json is required when generated-video media or active slots exist/);
  });

  it("binds active generated-video sources in root and nested compositions to the declared canonical file and copy", async () => {
    const { dir, report } = await createReadyGeneratedVideoProject();
    await fs.writeFile(path.join(dir, "index.html"), `<video data-generation-shot-id="intro" src="${CANONICAL_VIDEO}"></video>`);
    await fs.mkdir(path.join(dir, "video"), { recursive: true });
    await fs.writeFile(path.join(dir, "video", "index.html"), '<video data-generation-shot-id="intro" src="assets/generated/video/intro.mp4"></video>');
    await writeFreshQa(dir, report);
    await expect(assertProjectReady(dir)).resolves.toBeDefined();
  });

  it("rejects an active generated-video source that is not declared by the manifest", async () => {
    const { dir, report } = await createReadyGeneratedVideoProject();
    await fs.writeFile(path.join(dir, "index.html"), '<video data-generation-shot-id="intro" src="assets/generated/video/undeclared.mp4"></video>');
    await writeFreshQa(dir, report);
    await expect(assertProjectReady(dir)).rejects.toThrow(/src is not declared by the generated-video manifest/);
  });

  it("rejects remote or provider URLs in active generated-video sources", async () => {
    const { dir, report } = await createReadyGeneratedVideoProject();
    await fs.writeFile(path.join(dir, "index.html"), '<video data-generation-shot-id="intro" src="https://fal.media/remote.mp4"></video>');
    await writeFreshQa(dir, report);
    await expect(assertProjectReady(dir)).rejects.toThrow(/src must be a plain project-local relative path/);
  });

  it("requires an active generated-video source to belong to the same manifest shot", async () => {
    const { dir, report } = await createReadyGeneratedVideoProject();
    await fs.writeFile(path.join(dir, "index.html"), `<video data-generation-shot-id="another-shot" src="${CANONICAL_VIDEO}"></video>`);
    await writeFreshQa(dir, report);
    await expect(assertProjectReady(dir)).rejects.toThrow(/src belongs to manifest shot intro/);
  });

  it("allows a pre-generation inert video slot without a generated-video manifest", async () => {
    const { dir, report } = await createReadyGeneratedVideoProject();
    await fs.unlink(path.join(dir, "assets", "generated", "video", "manifest.json"));
    await fs.unlink(path.join(dir, CANONICAL_VIDEO));
    await fs.unlink(path.join(dir, VIDEO_COPY));
    await fs.writeFile(path.join(dir, "index.html"), '<div class="generated-video-slot" data-generation-shot-id="intro"></div>');
    report.provenance = [];
    await writeFreshQa(dir, report);
    await expect(assertProjectReady(dir)).resolves.toBeDefined();
  });
});
