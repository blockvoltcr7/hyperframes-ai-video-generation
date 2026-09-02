import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

export const WORKFLOW_SCHEMA_VERSION = 1;
export const QA_SCHEMA_VERSION = 1;

export const DeliveryProfileSchema = z.object({
  id: z.enum(["youtube-short", "instagram-reel", "tiktok", "presentation-16x9", "custom"]),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  fps: z.number().positive(),
  safeZone: z.object({ top: z.number().nonnegative(), right: z.number().nonnegative(), bottom: z.number().nonnegative(), left: z.number().nonnegative() }),
  captionMode: z.enum(["embedded", "sidecar", "both", "none"]),
});

const GeneratedVideoShotSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  purpose: z.string().min(1),
  referenceAssets: z.array(z.string().min(1)).min(1),
  startFrame: z.string().optional(),
  endFrame: z.string().optional(),
  prompt: z.string().min(40).optional(),
  output: z.string().optional(),
  copies: z.array(z.string().min(1)).optional(),
  camera: z.string().min(1),
  durationSeconds: z.number().positive().max(30),
  numFrames: z.number().int().min(17).max(961).optional(),
  fps: z.number().int().min(1).max(60).optional(),
  seed: z.number().int().optional(),
  aspectRatio: z.string().regex(/^\d+:\d+$/),
  continuityNotes: z.string().min(1),
  audioPolicy: z.enum(["none", "ambient", "dialogue", "mixed"]),
  fallback: z.enum(["animated-still", "native-motion", "omit"]),
  provider: z.string().optional(),
  model: z.string().optional(),
});

export const GeneratedVideoPlanSchema = z.object({
  schemaVersion: z.literal(1),
  provider: z.string().optional(),
  model: z.string().optional(),
  maxCostUsd: z.number().positive().max(0.5).optional(),
  integrationFiles: z.array(z.string().min(1)).min(1).optional(),
  shots: z.array(GeneratedVideoShotSchema).min(1),
});

export const LONGCAT_I2V_ENDPOINT = "fal-ai/longcat-video/distilled/image-to-video/720p";
export const PIXVERSE_C1_ENDPOINT = "fal-ai/pixverse/c1/image-to-video";

export const FalGeneratedVideoPlanSchema = GeneratedVideoPlanSchema.superRefine((plan, context) => {
  if (plan.provider !== "fal.ai") context.addIssue({ code: z.ZodIssueCode.custom, path: ["provider"], message: "Fal execution requires provider fal.ai" });
  const isLongCat = plan.model === LONGCAT_I2V_ENDPOINT;
  const isPixVerse = plan.model === PIXVERSE_C1_ENDPOINT;
  if (!isLongCat && !isPixVerse) context.addIssue({ code: z.ZodIssueCode.custom, path: ["model"], message: "Unsupported Fal image-to-video endpoint" });
  if (plan.maxCostUsd == null) context.addIssue({ code: z.ZodIssueCode.custom, path: ["maxCostUsd"], message: "Fal execution requires maxCostUsd" });
  if (!plan.integrationFiles?.length) context.addIssue({ code: z.ZodIssueCode.custom, path: ["integrationFiles"], message: "Fal execution requires explicit integrationFiles" });
  plan.shots.forEach((shot, index) => {
    const required: Array<[string, unknown]> = [["startFrame", shot.startFrame], ["output", shot.output], ["prompt", shot.prompt], ["numFrames", shot.numFrames], ["fps", shot.fps]];
    for (const [field, value] of required) {
      if (value == null) context.addIssue({ code: z.ZodIssueCode.custom, path: ["shots", index, field], message: `Fal execution requires ${field}` });
    }
    if (shot.endFrame) context.addIssue({ code: z.ZodIssueCode.custom, path: ["shots", index, "endFrame"], message: "Fal image-to-video supports only an opening frame" });
    if (shot.audioPolicy !== "none") context.addIssue({ code: z.ZodIssueCode.custom, path: ["shots", index, "audioPolicy"], message: "Fal image-to-video must be silent" });
    if (shot.aspectRatio !== "16:9") context.addIssue({ code: z.ZodIssueCode.custom, path: ["shots", index, "aspectRatio"], message: "Fal input must be pre-normalized to 16:9" });
    if (isLongCat) {
      if (shot.durationSeconds !== 8) context.addIssue({ code: z.ZodIssueCode.custom, path: ["shots", index, "durationSeconds"], message: "Calibrated LongCat execution requires exactly 8 seconds" });
      if (shot.numFrames != null && shot.numFrames !== 240) context.addIssue({ code: z.ZodIssueCode.custom, path: ["shots", index, "numFrames"], message: "Calibrated LongCat execution requires exactly 240 frames" });
      if (shot.fps != null && shot.fps !== 30) context.addIssue({ code: z.ZodIssueCode.custom, path: ["shots", index, "fps"], message: "LongCat 720p profile uses 30 fps" });
    }
    if (isPixVerse) {
      if (!Number.isInteger(shot.durationSeconds) || shot.durationSeconds < 1 || shot.durationSeconds > 15) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["shots", index, "durationSeconds"], message: "PixVerse C1 durationSeconds must be an integer from 1 through 15" });
      }
      if (shot.fps != null && shot.fps !== 30) context.addIssue({ code: z.ZodIssueCode.custom, path: ["shots", index, "fps"], message: "PixVerse C1 canonical profile uses 30 fps" });
      if (shot.numFrames != null && shot.fps != null && shot.numFrames !== shot.durationSeconds * shot.fps) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["shots", index, "numFrames"], message: "PixVerse C1 numFrames must equal durationSeconds*fps" });
      }
    }
    if (shot.numFrames != null && shot.fps != null && Math.abs(shot.numFrames / shot.fps - shot.durationSeconds) > 1 / shot.fps) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["shots", index, "durationSeconds"], message: "durationSeconds must match numFrames/fps" });
    }
  });
});

export const LocaleBundleSchema = z.object({
  schemaVersion: z.literal(1),
  locale: z.string().min(2),
  direction: z.enum(["ltr", "rtl"]),
  strings: z.record(z.string(), z.string()),
  narrationPath: z.string().optional(),
  captionPath: z.string().optional(),
  overflowReviewed: z.boolean(),
});

const WorkflowNodeSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["pending", "running", "succeeded", "failed", "blocked", "skipped"]),
  inputHashes: z.record(z.string(), z.string()).default({}),
  outputHashes: z.record(z.string(), z.string()).default({}),
  provider: z.string().optional(),
  model: z.string().optional(),
  estimatedCostUsd: z.number().nonnegative().optional(),
  attempts: z.number().int().nonnegative().default(0),
  approval: z.enum(["not-required", "pending", "approved", "rejected"]).default("not-required"),
});

export const WorkflowManifestSchema = z.object({
  schemaVersion: z.literal(WORKFLOW_SCHEMA_VERSION),
  workflow: z.enum(["adaptive", "template", "presentation", "general-video"]),
  projectSlug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  hyperframesVersion: z.string().min(1),
  delivery: DeliveryProfileSchema,
  locales: z.array(z.string().min(2)).min(1),
  nodes: z.array(WorkflowNodeSchema).min(1),
});

export const ProvenanceEntrySchema = z.object({
  asset: z.string().min(1),
  kind: z.enum(["generated-image", "generated-video", "registry", "licensed", "original", "source-document"]),
  source: z.string().min(1),
  sourceRevision: z.string().optional(),
  prompt: z.string().optional(),
  provider: z.string().optional(),
  model: z.string().optional(),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  altText: z.string().optional(),
  reviewed: z.boolean(),
  c2pa: z.object({ status: z.enum(["not-requested", "unsigned", "signed", "verified"]), manifestPath: z.string().optional() }).default({ status: "unsigned" }),
});

const GeneratedVideoRawProbeSchema = z.object({
  codec: z.literal("h264"),
  width: z.literal(1280),
  height: z.union([z.literal(704), z.literal(720)]),
  fps: z.number().min(12).max(60),
  frameCount: z.number().int().positive(),
  durationSeconds: z.number().positive(),
  hasAudio: z.literal(false),
}).passthrough();

const GeneratedVideoCanonicalProbeSchema = z.object({
  codec: z.literal("h264"),
  width: z.literal(1280),
  height: z.literal(720),
  fps: z.literal(30),
  frameCount: z.number().int().positive(),
  durationSeconds: z.number().positive(),
  hasAudio: z.literal(false),
}).passthrough();

const GeneratedVideoNormalizationSchema = z.object({
  applied: z.boolean(),
  spatial: z.object({
    applied: z.boolean(),
    method: z.enum(["centered-cover-crop", "none"]),
    source: z.object({ width: z.literal(1280), height: z.union([z.literal(704), z.literal(720)]) }),
    target: z.object({ width: z.literal(1280), height: z.literal(720) }),
  }),
  temporal: z.object({
    applied: z.boolean(),
    method: z.enum(["full-clip-uniform-retime", "none"]),
    sourceFrameCount: z.number().int().positive(),
    sourceDurationSeconds: z.number().positive(),
    targetFrameCount: z.number().int().positive(),
    targetDurationSeconds: z.number().positive(),
    durationRatio: z.number().positive(),
    ptsRatio: z.number().positive(),
    speedMultiplier: z.number().positive(),
    endpointPolicy: z.enum(["first-and-last-frame-time-aligned", "unchanged"]),
  }),
}).passthrough();

const GeneratedVideoManifestSchema = z.object({
  schemaVersion: z.literal(1),
  assets: z.array(z.object({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    asset: z.string().min(1),
    kind: z.literal("generated-video"),
    copies: z.array(z.string().min(1)).optional(),
    provider: z.string().min(1),
    model: z.string().min(1),
    sha256: z.string().regex(/^[a-f0-9]{64}$/),
    estimatedCostUsd: z.number().nonnegative().optional(),
    billingEstimate: z.object({
      persistedPreflightEstimateUsd: z.number().nonnegative(),
      persistedEstimatedBillableSeconds: z.number().positive(),
      currentConservativeCeilingUsd: z.number().nonnegative(),
      currentConservativeSeconds: z.number().positive(),
      actualBillingUsd: z.null(),
      status: z.literal("not-reconciled"),
      basis: z.literal("provider-price-times-conservative-generated-seconds"),
    }).optional(),
    canonical: GeneratedVideoCanonicalProbeSchema.extend({
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
      sizeBytes: z.number().int().positive(),
    }).optional(),
    rawDownload: GeneratedVideoRawProbeSchema.extend({
      sha256: z.string().regex(/^[a-f0-9]{64}$/),
      sizeBytes: z.number().int().positive(),
      remote: z.unknown().optional(),
    }).optional(),
    media: GeneratedVideoCanonicalProbeSchema.extend({
      raw: GeneratedVideoRawProbeSchema,
      normalization: GeneratedVideoNormalizationSchema,
      sizeBytes: z.number().int().positive(),
    }).optional(),
  })),
});

export const QaReportSchema = z.object({
  schemaVersion: z.literal(QA_SCHEMA_VERSION),
  generatedAt: z.string().datetime(),
  projectSlug: z.string().min(1),
  workflow: WorkflowManifestSchema.shape.workflow,
  sourceDigest: z.string().regex(/^[a-f0-9]{64}$/),
  status: z.enum(["passed", "failed", "stale", "pending-review"]),
  checks: z.object({
    lint: z.enum(["passed", "failed", "not-run"]),
    strict: z.enum(["passed", "failed", "not-run"]),
    transitions: z.enum(["passed", "failed", "not-run"]),
    captions: z.enum(["passed", "failed", "not-applicable", "not-run"]),
    audio: z.enum(["passed", "failed", "not-applicable", "not-run"]),
    localization: z.enum(["passed", "failed", "not-applicable", "not-run"]),
  }),
  visualEvidence: z.object({ snapshots: z.array(z.string()), contactSheet: z.string().optional(), reviewed: z.boolean() }),
  provenance: z.array(ProvenanceEntrySchema),
  catalogItems: z.array(z.object({ id: z.string(), version: z.string().optional(), source: z.string().optional() })).default([]),
  reviewer: z.object({ status: z.enum(["pending", "approved", "changes-requested"]), name: z.string().optional(), reviewedAt: z.string().datetime().optional(), notes: z.string().optional() }),
});

export type WorkflowManifest = z.infer<typeof WorkflowManifestSchema>;
export type QaReport = z.infer<typeof QaReportSchema>;

const requiredByWorkflow: Record<WorkflowManifest["workflow"], Array<string | string[]>> = {
  adaptive: ["index.html", ["SCRIPT.md", "script.txt"], "transcript.json", ["audio/narration.wav", "audio_meta.json"], "DESIGN.md", "visual-plan.json", "asset-plan.json", "SOURCES.md", "meta.json", "snapshots/contact-sheet.jpg"],
  template: ["index.html", ["SCRIPT.md", "script.txt"], "transcript.json", ["audio/narration.wav", "audio_meta.json"], "DESIGN.md", "meta.json", "snapshots/contact-sheet.jpg"],
  presentation: ["index.html", "video/index.html", "SCRIPT.md", "STORYBOARD.md", "DESIGN.md", "SOURCES.md", "meta.json", "assets/generated/manifest.json", "snapshots/contact-sheet.jpg"],
  "general-video": ["index.html", "SCRIPT.md", "STORYBOARD.md", "DESIGN.md", "SOURCES.md", "meta.json", "snapshots/contact-sheet.jpg"],
};

export async function validateProjectArtifacts(projectDir: string, workflow: WorkflowManifest["workflow"]) {
  const missing: string[] = [];
  for (const requirement of requiredByWorkflow[workflow]) {
    const choices = Array.isArray(requirement) ? requirement : [requirement];
    const present = await Promise.all(choices.map(async (item) => Boolean(await fs.stat(path.join(projectDir, item)).catch(() => null))));
    if (!present.some(Boolean)) missing.push(choices.join(" or "));
  }
  return { ok: missing.length === 0, missing };
}

export async function computeProjectSourceDigest(projectDir: string): Promise<string> {
  const included: string[] = [];
  async function collect(dir: string) {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      if (["out", ".hyperframes", "node_modules", "qa"].includes(entry.name)) continue;
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) await collect(absolute);
      else if (!entry.name.startsWith(".")) included.push(absolute);
    }
  }
  await collect(projectDir);
  included.sort((a, b) => path.relative(projectDir, a).localeCompare(path.relative(projectDir, b)));
  const hash = crypto.createHash("sha256");
  for (const file of included) {
    hash.update(path.relative(projectDir, file).split(path.sep).join("/"));
    hash.update(await fs.readFile(file));
  }
  return hash.digest("hex");
}

export async function readProjectContract(projectDir: string) {
  const manifest = WorkflowManifestSchema.parse(JSON.parse(await fs.readFile(path.join(projectDir, "workflow-run.json"), "utf8")));
  const artifacts = await validateProjectArtifacts(projectDir, manifest.workflow);
  let qa: QaReport | undefined;
  try { qa = QaReportSchema.parse(JSON.parse(await fs.readFile(path.join(projectDir, "qa", "report.json"), "utf8"))); } catch { /* reported by caller */ }
  const digest = await computeProjectSourceDigest(projectDir);
  const fresh = qa?.sourceDigest === digest;
  return { manifest, artifacts, qa, digest, fresh };
}

function resolveProjectLocalFile(projectDir: string, localPath: string) {
  const root = path.resolve(projectDir);
  if (path.isAbsolute(localPath)) return undefined;
  const absolute = path.resolve(root, localPath);
  const relative = path.relative(root, absolute);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return undefined;
  return { absolute, relative: relative.split(path.sep).join("/") };
}

function parseHtmlAttributeValues(fragment: string) {
  const attributes = new Map<string, string[]>();
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of fragment.matchAll(pattern)) {
    const name = match[1].toLowerCase();
    const values = attributes.get(name) ?? [];
    values.push(match[2] ?? match[3] ?? match[4] ?? "");
    attributes.set(name, values);
  }
  return attributes;
}

type ActiveGeneratedVideoSlot = {
  compositionFile: string;
  shotId?: string;
  src?: string;
  duplicateShotId: boolean;
  duplicateSrc: boolean;
};

function resolveCompositionLocalFile(projectDir: string, compositionFile: string, localPath: string) {
  if (!localPath || localPath.trim() !== localPath || /[\\?#%&]/.test(localPath)
    || path.isAbsolute(localPath) || localPath.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(localPath)) return undefined;
  const root = path.resolve(projectDir);
  const absolute = path.resolve(path.dirname(path.join(root, compositionFile)), localPath);
  const relative = path.relative(root, absolute);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) return undefined;
  return { absolute, relative: relative.split(path.sep).join("/") };
}

async function listCanonicalGeneratedVideos(projectDir: string) {
  const root = path.join(projectDir, "assets", "generated", "video");
  const assets: string[] = [];

  async function collect(directory: string): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(directory, { withFileTypes: true });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT" && directory === root) return;
      throw error;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (["jobs", "temp", "tmp"].includes(entry.name)) continue;
        await collect(path.join(directory, entry.name));
      } else if ((entry.isFile() || entry.isSymbolicLink()) && entry.name.toLowerCase().endsWith(".mp4") && !entry.name.startsWith(".") && !entry.name.toLowerCase().endsWith(".part.mp4")) {
        assets.push(path.relative(projectDir, path.join(directory, entry.name)).split(path.sep).join("/"));
      }
    }
  }

  await collect(root);
  return assets;
}

async function listActiveGeneratedVideoSlots(projectDir: string): Promise<ActiveGeneratedVideoSlot[]> {
  const ignoredDirectories = new Set([".git", ".hyperframes", "assets", "node_modules", "out", "qa"]);
  const slots: ActiveGeneratedVideoSlot[] = [];
  async function inspect(directory: string): Promise<void> {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (ignoredDirectories.has(entry.name) || entry.name.startsWith(".")) continue;
        await inspect(path.join(directory, entry.name));
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith(".html")) {
        const absolute = path.join(directory, entry.name);
        const compositionFile = path.relative(projectDir, absolute).split(path.sep).join("/");
        const html = (await fs.readFile(absolute, "utf8"))
          .replace(/<!--[\s\S]*?-->/g, "")
          .replace(/<(script|style|template|noscript)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "");
        for (const match of html.matchAll(/<video\b([^>]*)>/gi)) {
          const attributes = parseHtmlAttributeValues(match[1]);
          const shotIds = attributes.get("data-generation-shot-id");
          if (!shotIds) continue;
          const sources = attributes.get("src") ?? [];
          slots.push({
            compositionFile,
            shotId: shotIds[0],
            src: sources[0],
            duplicateShotId: shotIds.length !== 1,
            duplicateSrc: sources.length !== 1,
          });
        }
      }
    }
  }
  await inspect(projectDir);
  return slots;
}

export async function assertProjectReady(projectDir: string, options: { requireReview?: boolean } = {}) {
  const result = await readProjectContract(projectDir);
  const failures: string[] = [];
  if (!result.artifacts.ok) failures.push(`missing artifacts: ${result.artifacts.missing.join(", ")}`);
  if (!result.qa) failures.push("qa/report.json is missing or invalid");
  else {
    if (!result.fresh) failures.push("QA report is stale for the current project sources");
    if (result.qa.status !== "passed") failures.push(`QA status is ${result.qa.status}`);
    if (result.qa.checks.strict !== "passed" || result.qa.checks.transitions !== "passed") failures.push("strict transition validation has not passed");
    if (!result.qa.visualEvidence.reviewed || !result.qa.visualEvidence.contactSheet) failures.push("visual contact-sheet review has not passed");
    if (result.qa.provenance.some((entry) => !entry.reviewed)) failures.push("one or more provenance entries are unreviewed");
    if (options.requireReview && result.qa.reviewer.status !== "approved") failures.push("human review approval is required");
  }

  const generatedVideoManifestPath = path.join(projectDir, "assets", "generated", "video", "manifest.json");
  const canonicalGeneratedVideos = await listCanonicalGeneratedVideos(projectDir);
  const activeGeneratedVideoSlots = await listActiveGeneratedVideoSlots(projectDir);
  const hasActiveGeneratedVideo = activeGeneratedVideoSlots.length > 0;
  let generatedVideoManifest: z.infer<typeof GeneratedVideoManifestSchema> | undefined;
  try {
    generatedVideoManifest = GeneratedVideoManifestSchema.parse(JSON.parse(await fs.readFile(generatedVideoManifestPath, "utf8")));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      if (canonicalGeneratedVideos.length || hasActiveGeneratedVideo) failures.push("assets/generated/video/manifest.json is required when generated-video media or active slots exist");
    } else failures.push("assets/generated/video/manifest.json is invalid");
  }

  if (generatedVideoManifest) {
    const declaredCanonicalAssets = new Set<string>();
    const declaredGeneratedVideoFiles = new Map<string, (typeof generatedVideoManifest.assets)[number]>();
    const projectReal = await fs.realpath(projectDir);
    for (const asset of generatedVideoManifest.assets) {
      const files: Array<{ localPath: string; role: "asset" | "copy" }> = [
        { localPath: asset.asset, role: "asset" },
        ...(asset.copies ?? []).map((copy) => ({ localPath: copy, role: "copy" as const })),
      ];
      for (const file of files) {
        const resolved = resolveProjectLocalFile(projectDir, file.localPath);
        if (!resolved) {
          failures.push(`generated-video ${file.role} path is not project-local: ${file.localPath}`);
          continue;
        }
        if (file.role === "asset") declaredCanonicalAssets.add(resolved.relative);
        const priorOwner = declaredGeneratedVideoFiles.get(resolved.relative);
        if (priorOwner) failures.push(`generated-video path is declared more than once: ${file.localPath}`);
        else declaredGeneratedVideoFiles.set(resolved.relative, asset);
        try {
          const stat = await fs.lstat(resolved.absolute);
          if (!stat.isFile() || stat.isSymbolicLink()) {
            failures.push(`generated-video ${file.role} is not a regular local file: ${file.localPath}`);
            continue;
          }
          const real = await fs.realpath(resolved.absolute);
          const realRelative = path.relative(projectReal, real);
          if (!realRelative || realRelative === ".." || realRelative.startsWith(`..${path.sep}`) || path.isAbsolute(realRelative)) {
            failures.push(`generated-video ${file.role} resolves outside the project: ${file.localPath}`);
            continue;
          }
          const actualSha256 = crypto.createHash("sha256").update(await fs.readFile(resolved.absolute)).digest("hex");
          if (actualSha256 !== asset.sha256) failures.push(`generated-video ${file.role} sha256 does not match manifest for ${file.localPath}`);
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === "ENOENT") failures.push(`generated-video ${file.role} is missing: ${file.localPath}`);
          else throw error;
        }
      }

      if (result.qa) {
        const provenance = result.qa.provenance.filter((entry) => entry.kind === "generated-video" && entry.asset === asset.asset);
        const matching = provenance.filter((entry) => entry.provider === asset.provider && entry.model === asset.model && entry.sha256 === asset.sha256);
        if (!matching.some((entry) => entry.reviewed)) {
          if (matching.length) failures.push(`generated-video QA provenance is not reviewed for ${asset.asset}`);
          else if (provenance.length) failures.push(`generated-video QA provenance does not match provider, model, and sha256 for ${asset.asset}`);
          else failures.push(`generated-video QA provenance is missing for ${asset.asset}`);
        }
      }
    }
    for (const canonicalAsset of canonicalGeneratedVideos) {
      if (!declaredCanonicalAssets.has(canonicalAsset)) failures.push(`generated-video manifest entry is missing for ${canonicalAsset}`);
    }
    if (hasActiveGeneratedVideo && generatedVideoManifest.assets.length === 0) failures.push("generated-video manifest has no assets for active generated-video slots");

    for (const slot of activeGeneratedVideoSlots) {
      const slotLabel = `${slot.compositionFile} generated-video slot${slot.shotId ? ` ${slot.shotId}` : ""}`;
      if (slot.duplicateShotId || !slot.shotId) {
        failures.push(`${slotLabel} must declare exactly one nonempty data-generation-shot-id`);
        continue;
      }
      if (slot.duplicateSrc || !slot.src) {
        failures.push(`${slotLabel} must declare exactly one nonempty local src`);
        continue;
      }
      const resolved = resolveCompositionLocalFile(projectDir, slot.compositionFile, slot.src);
      if (!resolved) {
        failures.push(`${slotLabel} src must be a plain project-local relative path: ${slot.src}`);
        continue;
      }
      const manifestAsset = declaredGeneratedVideoFiles.get(resolved.relative);
      if (!manifestAsset) {
        failures.push(`${slotLabel} src is not declared by the generated-video manifest: ${slot.src}`);
        continue;
      }
      if (manifestAsset.id !== slot.shotId) failures.push(`${slotLabel} src belongs to manifest shot ${manifestAsset.id}`);
    }
  }

  if (failures.length) throw new Error(failures.join("; "));
  return result;
}
