import crypto from "node:crypto";
import fs from "node:fs/promises";
import { execFile } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_FAL_ENDPOINT,
  LONGCAT_OBSERVED_OUTPUT_FRAMES,
  PIXVERSE_C1_ENDPOINT,
  acquireProjectLease,
  activateGeneratedVideos,
  assertSafeProjectReadFile,
  assertSafeProjectWritePath,
  buildCompletedLedger,
  buildFalInput,
  buildManifestEntry,
  buildFalNormalizationArgs,
  buildFalNormalizationSpec,
  downloadFalVideo,
  estimateVideoCost,
  parseArgs,
  parseFalResult,
  parseFalPricing,
  planGeneratedVideoActivation,
  pollFalJob,
  resolveFalCredentialPolicy,
  resumeDecision,
  runFalVideo,
  shotFingerprint,
  stageCanonicalVideo,
  submitFalJob,
  validateMp4Bytes,
  validatePersistedCost,
  validateVideoProbe,
  validateVideoPlan,
} from "./generate-fal-video.mjs";

const execFileAsync = promisify(execFile);

const plan = {
  schemaVersion: 1,
  provider: "fal.ai",
  model: DEFAULT_FAL_ENDPOINT,
  maxCostUsd: 0.5,
  integrationFiles: ["index.html", "video/index.html"],
  shots: [{
    id: "goal-loop-motion",
    purpose: "Establish persistent execution",
    referenceAssets: ["assets/generated/persistent-execution-loop.png"],
    startFrame: "assets/generated/persistent-execution-loop.png",
    output: "assets/generated/video/goal-loop-motion-v1.mp4",
    copies: ["video/assets/generated/video/goal-loop-motion-v1.mp4"],
    prompt: "A restrained camera push follows the warm signal across the fixed machinery while preserving every object and the original composition.",
    camera: "slow push",
    durationSeconds: 8,
    numFrames: 240,
    fps: 30,
    aspectRatio: "16:9",
    continuityNotes: "Preserve every station",
    audioPolicy: "none",
    fallback: "animated-still",
    seed: 28173,
  }],
};

const pixversePlan = {
  ...structuredClone(plan),
  model: PIXVERSE_C1_ENDPOINT,
  shots: [{
    ...structuredClone(plan.shots[0]),
    id: "plugin-ecosystem-motion",
    durationSeconds: 15,
    numFrames: 450,
    fps: 30,
    output: "assets/generated/video/plugin-ecosystem-motion-v1.mp4",
    copies: [],
  }],
};

describe("Fal video planning", () => {
  it("parses one explicit execution mode and one shot selector", () => {
    expect(parseArgs(["videos/demo", "--shot", "intro", "--dry-run"])).toMatchObject({ project: "videos/demo", shot: "intro", dryRun: true });
    expect(() => parseArgs(["videos/demo", "--all", "--shot", "intro", "--api"])).toThrow(/Usage/);
    expect(() => parseArgs(["videos/demo", "--all", "--api", "--dry-run"])).toThrow(/exactly one execution mode/);
  });

  it("builds the pinned silent LongCat 720p request", () => {
    const [shot] = validateVideoPlan(plan);
    const input = buildFalInput(shot, "https://fal.media/opening.png");
    expect(input).toMatchObject({
      image_url: "https://fal.media/opening.png",
      num_frames: 240,
      fps: 30,
      seed: 28173,
      enable_prompt_expansion: false,
      video_output_type: "X264 (.mp4)",
      video_quality: "high",
      video_write_mode: "balanced",
      sync_mode: false,
    });
    expect(input).not.toHaveProperty("generate_audio");
    expect(input).not.toHaveProperty("end_image_url");
  });

  it("builds a silent 15-second PixVerse C1 animation request", () => {
    const [shot] = validateVideoPlan(pixversePlan);
    expect(buildFalInput(shot, "https://fal.media/plugin-ecosystem.png")).toEqual({
      image_url: "https://fal.media/plugin-ecosystem.png",
      prompt: shot.prompt,
      duration: 15,
      resolution: "720p",
      generate_audio_switch: false,
      seed: 28173,
    });
  });

  it("prices PixVerse C1 against its requested duration", () => {
    const pricing = parseFalPricing({ prices: [{ endpoint_id: PIXVERSE_C1_ENDPOINT, unit_price: 0.005, unit: "seconds", currency: "USD" }] }, PIXVERSE_C1_ENDPOINT);
    const [shot] = validateVideoPlan(pixversePlan);
    expect(estimateVideoCost(shot, pricing)).toMatchObject({
      requestedSeconds: 15,
      billableSeconds: 15,
      estimatedCostUsd: 0.075,
      conservativeCostCeilingUsd: 0.075,
      estimateBasis: "requested-duration",
    });
  });

  it("accepts PixVerse native frame rate and normalizes it to the canonical plan", () => {
    const [shot] = validateVideoPlan(pixversePlan);
    const raw = { codec: "h264", width: 1280, height: 720, fps: 24, durationSeconds: 15, frameCount: 360, hasAudio: false };
    expect(validateVideoProbe(raw, shot, { raw: true })).toBe(raw);
    const spec = buildFalNormalizationSpec(raw, shot);
    expect(spec.temporal).toMatchObject({
      applied: true,
      sourceFrameCount: 360,
      targetFrameCount: 450,
      targetDurationSeconds: 15,
    });
  });

  it("keeps the established request fingerprint independent of cost and normalization policy", () => {
    const [shot] = validateVideoPlan(plan);
    expect(shotFingerprint(shot, "a".repeat(64))).toBe("30eb33adc5c83db6978ac2ae96cbcd221cf12260bd332e20748e9783b14c5855");
  });

  it("prices future submissions against the observed provider output floor", () => {
    const pricing = parseFalPricing({ prices: [{ endpoint_id: DEFAULT_FAL_ENDPOINT, unit_price: 0.01, unit: "seconds", currency: "USD" }] }, DEFAULT_FAL_ENDPOINT);
    const [shot] = validateVideoPlan(plan);
    const cost = estimateVideoCost(shot, pricing);
    expect(cost).toMatchObject({
      requestedSeconds: 8,
      observedOutputSecondsFloor: LONGCAT_OBSERVED_OUTPUT_FRAMES / 30,
      billableSeconds: LONGCAT_OBSERVED_OUTPUT_FRAMES / 30,
      estimatedCostUsd: 0.168667,
      conservativeCostCeilingUsd: 0.168667,
      actualBillingUsd: null,
      estimateBasis: "conservative-observed-output-floor",
    });
  });

  it("fails closed for missing, duplicate, unfamiliar, or over-cap pricing", () => {
    expect(() => parseFalPricing({ prices: [] }, DEFAULT_FAL_ENDPOINT)).toThrow(/exactly one/);
    expect(() => parseFalPricing({ prices: [{ endpoint_id: DEFAULT_FAL_ENDPOINT, unit_price: 1, unit: "tokens", currency: "USD" }] }, DEFAULT_FAL_ENDPOINT)).toThrow(/unit/);
    expect(() => validateVideoPlan({ ...plan, maxCostUsd: 0.51 })).toThrow(/no more than \$0\.50/);
  });

  it("rejects uncalibrated LongCat durations before any pricing or submission work", () => {
    for (const [numFrames, durationSeconds] of [[120, 4], [300, 10], [900, 30]]) {
      const uncalibrated = structuredClone(plan);
      uncalibrated.shots[0].numFrames = numFrames;
      uncalibrated.shots[0].durationSeconds = durationSeconds;
      expect(() => validateVideoPlan(uncalibrated)).toThrow(/calibrated LongCat execution profile/);
    }
  });

  it("rejects unsupported end frames and unsafe output copies", () => {
    const withEnd = structuredClone(plan);
    withEnd.shots[0].endFrame = "assets/generated/end.png";
    expect(() => validateVideoPlan(withEnd)).toThrow(/only an opening frame/);
    const unsafe = structuredClone(plan);
    unsafe.shots[0].copies = ["../../unexpected.mp4"];
    expect(() => validateVideoPlan(unsafe)).toThrow(/escapes/);
  });

  it("rejects global collisions across every canonical output and copy", () => {
    const collision = structuredClone(plan);
    collision.shots.push({
      ...collision.shots[0],
      id: "second-shot",
      output: "assets/generated/video/second.mp4",
      copies: ["assets/generated/video/goal-loop-motion-v1.mp4"],
    });
    expect(() => validateVideoPlan(collision)).toThrow(/path collision/);

    const caseCollision = structuredClone(plan);
    caseCollision.shots.push({
      ...caseCollision.shots[0],
      id: "case-alias",
      output: "assets/generated/video/GOAL-LOOP-MOTION-V1.MP4",
      copies: [],
    });
    expect(() => validateVideoPlan(caseCollision)).toThrow(/path collision/);
  });

  it("requires an explicit allowlist of composition files to activate", () => {
    const missingIntegration = structuredClone(plan);
    delete missingIntegration.integrationFiles;
    expect(() => validateVideoPlan(missingIntegration)).toThrow(/integrationFiles/);
    expect(() => validateVideoPlan({ ...plan, integrationFiles: ["../outside.html"] })).toThrow(/escapes/);
  });

  it("uses the repository credential and fails closed on ambient conflicts without exposing values", () => {
    expect(resolveFalCredentialPolicy({ repositoryEnv: { FAL_AI_API_KEY: " repo-key " }, ambient: {} })).toMatchObject({ apiKey: "repo-key" });
    expect(resolveFalCredentialPolicy({ repositoryEnv: { FAL_KEY: "same" }, ambient: { FAL_AI_API_KEY: "same" } })).toMatchObject({ apiKey: "same" });
    expect(() => resolveFalCredentialPolicy({ repositoryEnv: { FAL_AI_API_KEY: "repo-secret" }, ambient: { FAL_KEY: "ambient-secret" } }))
      .toThrow(/Conflicting Fal credentials/);
    try {
      resolveFalCredentialPolicy({ repositoryEnv: { FAL_AI_API_KEY: "repo-secret" }, ambient: { FAL_KEY: "ambient-secret" } });
    } catch (error) {
      expect(error.message).not.toContain("repo-secret");
      expect(error.message).not.toContain("ambient-secret");
    }
    expect(() => resolveFalCredentialPolicy({ repositoryEnv: {}, ambient: { FAL_KEY: "ambient-only" } })).toThrow(/repository \.env/);
  });

  it("parses the queue.result wrapper returned by @fal-ai/client", () => {
    expect(parseFalResult({
      requestId: "req-1",
      data: {
        prompt: "provider-normalized prompt",
        seed: 42,
        video: {
          url: "https://fal.media/result.mp4",
          content_type: "video/mp4",
          file_name: "result.mp4",
          file_size: 1234,
        },
      },
    })).toEqual({
      url: "https://fal.media/result.mp4",
      seed: 42,
      providerPrompt: "provider-normalized prompt",
      remote: { contentType: "video/mp4", fileName: "result.mp4", fileSize: 1234 },
    });
  });

  it("turns an inert generated-video slot into a seek-safe local video", () => {
    const project = "/repo/videos/example";
    const compositionFile = path.join(project, "video", "index.html");
    const [shot] = validateVideoPlan(plan, project);
    const html = `<div id="goal-loop-video" class="motion-plate generated-video-slot" aria-hidden="true" data-generation-shot-id="goal-loop-motion" data-generated-video-src="assets/generated/video/goal-loop-motion-v1.mp4" data-generated-poster="assets/generated/persistent-execution-loop.png" data-generated-start="16" data-generated-duration="8" data-generated-track="2"></div>`;
    const activated = planGeneratedVideoActivation({ html, project, compositionFile, shot });
    expect(activated.placeholderCount).toBe(1);
    expect(activated.activeCount).toBe(0);
    expect(activated.html).toContain('<video id="goal-loop-video" aria-hidden="true" class="motion-plate generated-video-slot" muted playsinline preload="auto"');
    expect(activated.html).toContain('src="assets/generated/video/goal-loop-motion-v1.mp4"');
    expect(activated.html).toContain('poster="assets/generated/persistent-execution-loop.png"');
    expect(activated.html).toContain('data-start="16" data-duration="8" data-track-index="2"');

    const idempotent = planGeneratedVideoActivation({ html: activated.html, project, compositionFile, shot });
    expect(idempotent.placeholderCount).toBe(0);
    expect(idempotent.activeCount).toBe(1);
    expect(idempotent.html).toBe(activated.html);

    expect(() => planGeneratedVideoActivation({
      html: `${html}<span id="goal-loop-video"></span>`,
      project,
      compositionFile,
      shot,
    })).toThrow(/id must be unique/);
  });

  it("keeps every slot inert when any selected output fails batch activation", async () => {
    const project = await fs.mkdtemp(path.join(os.tmpdir(), "fal-activation-"));
    await fs.mkdir(path.join(project, "assets", "generated", "video"), { recursive: true });
    await fs.writeFile(path.join(project, "assets", "generated", "poster-a.png"), "poster-a");
    await fs.writeFile(path.join(project, "assets", "generated", "poster-b.png"), "poster-b");
    await fs.writeFile(path.join(project, "assets", "generated", "video", "a.mp4"), "video-a");
    const original = [
      '<div id="shot-a-video" class="motion-plate generated-video-slot" data-generation-shot-id="shot-a" data-generated-video-src="assets/generated/video/a.mp4" data-generated-poster="assets/generated/poster-a.png" data-generated-start="0" data-generated-duration="8" data-generated-track="1"></div>',
      '<div id="shot-b-video" class="motion-plate generated-video-slot" data-generation-shot-id="shot-b" data-generated-video-src="assets/generated/video/b.mp4" data-generated-poster="assets/generated/poster-b.png" data-generated-start="8" data-generated-duration="8" data-generated-track="1"></div>',
    ].join("\n");
    await fs.writeFile(path.join(project, "index.html"), original);
    const shots = [
      { id: "shot-a", output: "assets/generated/video/a.mp4", copies: [], integrationFiles: ["index.html"], durationSeconds: 8 },
      { id: "shot-b", output: "assets/generated/video/b.mp4", copies: [], integrationFiles: ["index.html"], durationSeconds: 8 },
    ];

    await expect(activateGeneratedVideos(project, shots)).rejects.toThrow(/output does not exist/);
    expect(await fs.readFile(path.join(project, "index.html"), "utf8")).toBe(original);
  });

  it("rejects symlinked reads and write parents that escape the real project", async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "fal-symlink-"));
    const project = path.join(root, "project");
    const outside = path.join(root, "outside");
    await fs.mkdir(path.join(project, "assets", "generated"), { recursive: true });
    await fs.mkdir(outside);
    await fs.writeFile(path.join(outside, "plate.png"), "outside");
    const linkedInput = path.join(project, "assets", "generated", "plate.png");
    await fs.symlink(path.join(outside, "plate.png"), linkedInput);
    await expect(assertSafeProjectReadFile(project, linkedInput, "Opening frame")).rejects.toThrow(/symbolic link/);

    const linkedParent = path.join(project, "assets", "generated", "video");
    await fs.symlink(outside, linkedParent);
    await expect(assertSafeProjectWritePath(project, path.join(linkedParent, "clip.mp4"), "Generated video")).rejects.toThrow(/symbolic-link parent/);

    await fs.unlink(linkedParent);
    const internalTarget = path.join(project, "assets", "generated", "real-video");
    await fs.mkdir(internalTarget);
    await fs.symlink(internalTarget, linkedParent);
    await expect(assertSafeProjectWritePath(project, path.join(linkedParent, "internal-alias.mp4"), "Generated video")).rejects.toThrow(/symbolic-link parent/);
  });
});

describe("Fal project lease", () => {
  it("uses an atomic cross-process lease and never steals a stale lock by age", async () => {
    const project = await fs.mkdtemp(path.join(os.tmpdir(), "fal-lease-"));
    const first = await acquireProjectLease(project, { hostname: "test-host" });
    await expect(acquireProjectLease(project, { hostname: "test-host" })).rejects.toThrow(/lease already exists/);
    expect(await first.release()).toBe(true);

    const stale = await acquireProjectLease(project, { pid: 999_999_999, hostname: "test-host", now: () => new Date(0) });
    await expect(acquireProjectLease(project, { hostname: "test-host" })).rejects.toThrow(/never broken by age/);
    expect(await stale.release()).toBe(true);

    const changed = await acquireProjectLease(project, { hostname: "test-host" });
    await fs.writeFile(changed.lockPath, JSON.stringify({ nonce: "different-owner" }));
    expect(await changed.release()).toBe(false);
    await fs.unlink(changed.lockPath);
  });
});

describe("Fal resumable queue lifecycle", () => {
  it("validates and activates a completed local result without credentials or network", async () => {
    const project = await fs.mkdtemp(path.join(os.tmpdir(), "fal-offline-complete-"));
    const generated = path.join(project, "assets", "generated");
    const videoDir = path.join(generated, "video");
    const jobsDir = path.join(videoDir, "jobs");
    await fs.mkdir(jobsDir, { recursive: true });
    const plate = path.join(generated, "plate.png");
    const output = path.join(videoDir, "clip.mp4");
    await execFileAsync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "color=c=black:s=160x90", "-frames:v", "1", "-update", "1", plate]);
    await execFileAsync("ffmpeg", ["-v", "error", "-f", "lavfi", "-i", "color=c=black:s=1280x720:r=30:d=8", "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30", output]);
    const shot = {
      id: "offline-shot",
      purpose: "Validate offline completion",
      referenceAssets: ["assets/generated/plate.png"],
      startFrame: "assets/generated/plate.png",
      output: "assets/generated/video/clip.mp4",
      copies: [],
      prompt: "A restrained camera drift preserves every object while a single warm light moves gently across the existing frame.",
      camera: "locked drift",
      durationSeconds: 8,
      numFrames: 240,
      fps: 30,
      aspectRatio: "16:9",
      continuityNotes: "Preserve all geometry",
      audioPolicy: "none",
      fallback: "animated-still",
    };
    const offlinePlan = { schemaVersion: 1, provider: "fal.ai", model: DEFAULT_FAL_ENDPOINT, maxCostUsd: 0.5, integrationFiles: ["index.html"], shots: [shot] };
    await fs.writeFile(path.join(project, "generated-video-plan.json"), JSON.stringify(offlinePlan));
    await fs.writeFile(path.join(project, "index.html"), '<div id="offline-video" class="generated-video-slot" data-generation-shot-id="offline-shot" data-generated-video-src="assets/generated/video/clip.mp4" data-generated-poster="assets/generated/plate.png" data-generated-start="0" data-generated-duration="8" data-generated-track="0"></div>');
    const sourceSha256 = crypto.createHash("sha256").update(await fs.readFile(plate)).digest("hex");
    const contentSha256 = crypto.createHash("sha256").update(await fs.readFile(output)).digest("hex");
    const [normalizedShot] = validateVideoPlan(offlinePlan, project);
    await fs.writeFile(path.join(jobsDir, "offline-shot.json"), JSON.stringify({
      schemaVersion: 1,
      provider: "fal.ai",
      endpointId: DEFAULT_FAL_ENDPOINT,
      shotId: "offline-shot",
      status: "completed",
      fingerprint: shotFingerprint(normalizedShot, sourceSha256),
      pricing: { endpointId: DEFAULT_FAL_ENDPOINT, unitPrice: 0.01, unit: "seconds", currency: "USD" },
      billableSeconds: 8,
      estimatedCostUsd: 0.08,
      contentSha256,
      lastError: "stale retry failure",
      submissionUncertain: true,
      submissionError: { category: "queue-submit-error" },
      submissionFailedAt: "2026-08-27T11:00:00.000Z",
    }));
    await fs.writeFile(path.join(videoDir, "manifest.json"), JSON.stringify({
      schemaVersion: 1,
      provider: "fal.ai",
      assets: [{ id: "offline-shot", asset: "assets/generated/video/clip.mp4", kind: "generated-video", copies: [], provider: "fal.ai", model: DEFAULT_FAL_ENDPOINT, sha256: contentSha256 }],
    }));
    const log = vi.spyOn(console, "log").mockImplementation(() => undefined);
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      await runFalVideo({ all: true, shot: undefined, dryRun: false, api: true }, project);
    } finally {
      log.mockRestore();
      errorLog.mockRestore();
    }
    expect(await fs.readFile(path.join(project, "index.html"), "utf8")).toContain('<video id="offline-video"');
    const cleanedLedger = JSON.parse(await fs.readFile(path.join(jobsDir, "offline-shot.json"), "utf8"));
    expect(cleanedLedger).toMatchObject({ status: "completed", contentSha256 });
    expect(cleanedLedger).not.toHaveProperty("lastError");
    expect(cleanedLedger).not.toHaveProperty("submissionUncertain");
    expect(cleanedLedger).not.toHaveProperty("submissionError");
    expect(cleanedLedger).not.toHaveProperty("submissionFailedAt");
  }, 15_000);

  it("persists an ambiguous submitting marker before the billable queue call", async () => {
    const order = [];
    const client = { queue: { submit: vi.fn(async () => { order.push("submit"); return { status: "IN_QUEUE", request_id: "req-1", status_url: "status", response_url: "response", cancel_url: "cancel" }; }) } };
    const writes = [];
    const ledger = await submitFalJob({
      client,
      endpointId: DEFAULT_FAL_ENDPOINT,
      input: { image_url: "https://fal.media/image.png" },
      ledger: { fingerprint: "same", status: "prepared" },
      writeLedger: async (value) => { order.push(`write:${value.status}`); writes.push(value); },
    });

    expect(order).toEqual(["write:submitting", "submit", "write:IN_QUEUE"]);
    expect(writes[0]).not.toHaveProperty("requestId");
    expect(ledger.requestId).toBe("req-1");
  });

  it("persists sanitized submission uncertainty and remains non-resubmittable", async () => {
    const secret = "must-not-enter-ledger";
    const providerError = Object.assign(new Error(`provider failed with ${secret}`), { code: "ECONNRESET", status: 503 });
    const client = { queue: { submit: vi.fn(async () => { throw providerError; }) } };
    const writes = [];
    await expect(submitFalJob({
      client,
      endpointId: DEFAULT_FAL_ENDPOINT,
      input: { image_url: "https://fal.media/image.png" },
      ledger: { fingerprint: "same", status: "prepared" },
      writeLedger: async (value) => writes.push(value),
    })).rejects.toThrow(/outcome is uncertain/);
    expect(writes.at(-1)).toMatchObject({ status: "submitting", submissionUncertain: true, submissionError: { category: "queue-submit-error", code: "ECONNRESET", httpStatus: 503 } });
    expect(JSON.stringify(writes)).not.toContain(secret);
    expect(() => resumeDecision(writes.at(-1), "same")).toThrow(/ambiguous/);
  });

  it("resumes a known request and polls without submitting again", async () => {
    const statuses = [
      { status: "IN_PROGRESS", request_id: "req-1", status_url: "status", response_url: "response", cancel_url: "cancel" },
      { status: "COMPLETED", request_id: "req-1", status_url: "status", response_url: "response", cancel_url: "cancel" },
    ];
    const client = { queue: { status: vi.fn(async () => statuses.shift()) } };
    const writes = [];
    const completed = await pollFalJob({
      client,
      endpointId: DEFAULT_FAL_ENDPOINT,
      ledger: { fingerprint: "same", requestId: "req-1", status: "IN_QUEUE" },
      writeLedger: async (value) => writes.push(value),
      sleep: async () => undefined,
      pollIntervalMs: 0,
      maxAttempts: 2,
    });
    expect(client.queue.status).toHaveBeenCalledTimes(2);
    expect(completed.status).toBe("COMPLETED");
    expect(writes.map((value) => value.status)).toEqual(["IN_PROGRESS", "COMPLETED"]);
    expect(resumeDecision(completed, "same")).toBe("resume");
  });

  it.each(["FAILED", "CANCELLED", "CANCELED", "EXPIRED"])(
    "stops polling immediately when Fal reports terminal status %s",
    async (terminalStatus) => {
      const client = {
        queue: {
          status: vi.fn(async () => ({
            status: terminalStatus,
            request_id: "req-1",
            status_url: "status",
            response_url: "response",
            cancel_url: "cancel",
          })),
        },
      };
      const sleep = vi.fn(async () => undefined);
      const writes = [];

      await expect(pollFalJob({
        client,
        endpointId: DEFAULT_FAL_ENDPOINT,
        ledger: { fingerprint: "same", requestId: "req-1", status: "IN_QUEUE" },
        writeLedger: async (value) => writes.push(value),
        sleep,
        pollIntervalMs: 0,
        maxAttempts: 360,
      })).rejects.toThrow(new RegExp(terminalStatus));

      expect(client.queue.status).toHaveBeenCalledTimes(1);
      expect(sleep).not.toHaveBeenCalled();
      expect(writes).toHaveLength(1);
      expect(writes[0].status).toBe(terminalStatus);
    },
  );

  it("refuses a duplicate submission after an ambiguous crash", () => {
    expect(() => resumeDecision({ fingerprint: "same", status: "submitting" }, "same")).toThrow(/ambiguous/);
    expect(() => resumeDecision({ fingerprint: "old", requestId: "req-1", status: "IN_QUEUE" }, "new")).toThrow(/different shot inputs/);
  });
});

describe("Fal download validation", () => {
  it("recognizes an MP4 container and rejects HTML/error bodies", () => {
    const mp4 = Buffer.alloc(1024);
    mp4.write("ftyp", 4, "ascii");
    expect(() => validateMp4Bytes(mp4, "video/mp4")).not.toThrow();
    expect(() => validateMp4Bytes(Buffer.from("<html>error</html>"), "text/html")).toThrow();
  });

  it("accepts the observed long raw clip and defines deterministic spatial and temporal normalization", () => {
    const shot = { durationSeconds: 8, numFrames: 240, fps: 30 };
    const raw = { codec: "h264", width: 1280, height: 704, fps: 30, durationSeconds: 506 / 30, frameCount: 506, hasAudio: false };
    expect(validateVideoProbe(raw, shot, { raw: true })).toBe(raw);
    expect(() => validateVideoProbe(raw, shot)).toThrow(/1280x720/);
    expect(() => validateVideoProbe({ ...raw, height: 700 }, shot, { raw: true })).toThrow(/1280x704/);
    const spec = buildFalNormalizationSpec(raw, shot);
    expect(spec).toMatchObject({
      spatial: { applied: true, method: "centered-cover-crop" },
      temporal: {
        applied: true,
        method: "full-clip-uniform-retime",
        sourceFrameCount: 506,
        sourceDurationSeconds: 506 / 30,
        targetFrameCount: 240,
        targetDurationSeconds: 8,
        endpointPolicy: "first-and-last-frame-time-aligned",
      },
    });
    expect(spec.temporal.durationRatio).toBeCloseTo(240 / 506, 12);
    expect(spec.temporal.ptsRatio).toBeCloseTo(239 / 505, 12);
    const args = buildFalNormalizationArgs("raw.mp4", "canonical.mp4", raw, shot);
    expect(args).toContain("-an");
    expect(args).toContain("libx264");
    expect(args.join(" ")).toContain("scale=-2:720");
    expect(args.join(" ")).toContain("crop=1280:720");
    expect(args.join(" ")).toContain("setpts=((240-1)/(506-1))*PTS");
    expect(args.join(" ")).toContain("trim=end_frame=240");
    expect(args.join(" ")).toContain("setpts=N/(30*TB)");
    expect(args.slice(args.indexOf("-frames:v"), args.indexOf("-frames:v") + 2)).toEqual(["-frames:v", "240"]);
  });

  it("normalizes a synthetic 506-frame 1280x704 clip to exactly 240 frames, 8s, and 1280x720", async () => {
    const project = await fs.mkdtemp(path.join(os.tmpdir(), "fal-normalize-"));
    const rawFile = path.join(project, "raw.mp4");
    await execFileAsync("ffmpeg", [
      "-v", "error",
      "-f", "lavfi", "-i", `color=c=black:s=1280x704:r=30:d=${446 / 30}`,
      "-f", "lavfi", "-i", "color=c=white:s=1280x704:r=30:d=2",
      "-filter_complex", "[0:v][1:v]concat=n=2:v=1:a=0",
      "-frames:v", "506", "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-r", "30", rawFile,
    ]);
    const output = path.join(project, "assets", "generated", "video", "normalized.mp4");
    const shot = { durationSeconds: 8, numFrames: 240, fps: 30 };
    const rawBytes = await fs.readFile(rawFile);
    const staged = await stageCanonicalVideo(project, output, rawBytes, shot);
    expect(staged.media).toMatchObject({
      codec: "h264",
      width: 1280,
      height: 720,
      fps: 30,
      frameCount: 240,
      durationSeconds: 8,
      hasAudio: false,
      raw: { width: 1280, height: 704, fps: 30, frameCount: 506, hasAudio: false },
      normalization: {
        applied: true,
        spatial: { applied: true, method: "centered-cover-crop" },
        temporal: {
          applied: true,
          method: "full-clip-uniform-retime",
          sourceFrameCount: 506,
          targetFrameCount: 240,
          targetDurationSeconds: 8,
        },
      },
    });
    expect(staged.media.raw.durationSeconds).toBeCloseTo(506 / 30, 3);
    expect(staged.contentSha256).not.toBe(staged.rawSha256);
    const readGrayFrame = async (seekFromEnd = false) => {
      const { stdout } = await execFileAsync("ffmpeg", [
        "-v", "error", ...(seekFromEnd ? ["-sseof", "-0.04"] : []), "-i", staged.temporary,
        "-frames:v", "1", "-f", "rawvideo", "-pix_fmt", "gray", "pipe:1",
      ], { encoding: null, maxBuffer: 2 * 1024 * 1024 });
      return stdout.reduce((sum, value) => sum + value, 0) / stdout.length;
    };
    expect(await readGrayFrame()).toBeLessThan(40);
    expect(await readGrayFrame(true)).toBeGreaterThan(200);
    const stagedAgain = await stageCanonicalVideo(project, path.join(project, "assets", "generated", "video", "normalized-again.mp4"), rawBytes, shot);
    expect(stagedAgain.contentSha256).toBe(staged.contentSha256);
    expect(stagedAgain.media).toEqual(staged.media);
    await Promise.all([staged.temporary, stagedAgain.temporary].map((file) => fs.unlink(file)));
  }, 30_000);

  it("records raw/canonical frame, duration, hash, retime, and unreconciled billing provenance", () => {
    const [shot] = validateVideoPlan(plan);
    const raw = { codec: "h264", width: 1280, height: 704, fps: 30, frameCount: 506, durationSeconds: 506 / 30, hasAudio: false };
    const normalization = { applied: true, ...buildFalNormalizationSpec(raw, shot) };
    const media = { codec: "h264", width: 1280, height: 720, fps: 30, frameCount: 240, durationSeconds: 8, hasAudio: false, raw, normalization };
    const entry = buildManifestEntry({
      shot,
      ledger: {
        requestId: "req-existing",
        estimatedCostUsd: 0.08,
        billableSeconds: 8,
        pricing: { endpointId: DEFAULT_FAL_ENDPOINT, unitPrice: 0.01, unit: "seconds", currency: "USD" },
      },
      sourceSha256: "a".repeat(64),
      contentSha256: "b".repeat(64),
      rawSha256: "c".repeat(64),
      result: { seed: 42, remote: { contentType: "video/mp4" } },
      media,
      sizeBytes: 2400,
      rawSizeBytes: 5060,
    });
    expect(entry).toMatchObject({
      reviewed: false,
      sha256: "b".repeat(64),
      canonical: { sha256: "b".repeat(64), frameCount: 240, durationSeconds: 8, width: 1280, height: 720 },
      rawDownload: { sha256: "c".repeat(64), frameCount: 506, durationSeconds: 506 / 30, width: 1280, height: 704 },
      media: { normalization: { temporal: { method: "full-clip-uniform-retime", sourceFrameCount: 506, targetFrameCount: 240 } } },
      billingEstimate: { persistedPreflightEstimateUsd: 0.08, currentConservativeCeilingUsd: 0.168667, actualBillingUsd: null, status: "not-reconciled" },
    });

    const completed = buildCompletedLedger({
      shot,
      ledger: {
        requestId: "req-existing",
        estimatedCostUsd: 0.08,
        billableSeconds: 8,
        pricing: { endpointId: DEFAULT_FAL_ENDPOINT, unitPrice: 0.01, unit: "seconds", currency: "USD" },
        lastError: "stale retry failure",
        submissionUncertain: true,
        submissionError: { category: "queue-submit-error" },
        submissionFailedAt: "2026-08-27T11:00:00.000Z",
      },
      result: { seed: 42 },
      staged: {
        bytes: Buffer.alloc(2400),
        contentSha256: "b".repeat(64),
        rawSha256: "c".repeat(64),
        rawSizeBytes: 5060,
        media,
      },
      now: new Date("2026-08-27T12:00:00.000Z"),
    });
    expect(completed).toMatchObject({
      status: "completed",
      raw: { sha256: "c".repeat(64), sizeBytes: 5060, frameCount: 506, durationSeconds: 506 / 30 },
      canonical: { sha256: "b".repeat(64), sizeBytes: 2400, frameCount: 240, durationSeconds: 8 },
      media: { normalization: { temporal: { method: "full-clip-uniform-retime" } } },
      billingEstimate: { actualBillingUsd: null, status: "not-reconciled" },
      completedAt: "2026-08-27T12:00:00.000Z",
      updatedAt: "2026-08-27T12:00:00.000Z",
    });
    expect(completed).not.toHaveProperty("lastError");
    expect(completed).not.toHaveProperty("submissionUncertain");
    expect(completed).not.toHaveProperty("submissionError");
    expect(completed).not.toHaveProperty("submissionFailedAt");
  });

  it("bounds a stalled CDN body and marks the error resumable", async () => {
    const fetchImpl = vi.fn(async (_url, options) => ({
      ok: true,
      headers: new Headers({ "content-type": "video/mp4" }),
      arrayBuffer: () => new Promise((resolve, reject) => {
        options.signal.addEventListener("abort", () => reject(options.signal.reason), { once: true });
      }),
    }));
    let caught;
    try { await downloadFalVideo("https://fal.media/stalled.mp4", fetchImpl, { timeoutMs: 5 }); } catch (error) { caught = error; }
    expect(caught?.message).toMatch(/timed out.*resume/);
    expect(caught?.falStage).toBe("download");
    expect(fetchImpl.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
  });

  it("validates persisted resume pricing without a live lookup", () => {
    const [shot] = validateVideoPlan(plan);
    const ledger = {
      provider: "fal.ai",
      endpointId: DEFAULT_FAL_ENDPOINT,
      pricing: { endpointId: DEFAULT_FAL_ENDPOINT, unitPrice: 0.01, unit: "seconds", currency: "USD" },
      billableSeconds: 8,
      estimatedCostUsd: 0.08,
    };
    expect(validatePersistedCost(shot, ledger)).toMatchObject({ cost: {
      billableSeconds: 8,
      estimatedCostUsd: 0.08,
      conservativeCostCeilingUsd: 0.168667,
      actualBillingUsd: null,
    } });
    expect(() => validatePersistedCost(shot, { ...ledger, estimatedCostUsd: 0.081 })).toThrow(/cost does not match/);
  });
});
