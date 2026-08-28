#!/usr/bin/env node

import crypto from "node:crypto";
import { execFile } from "node:child_process";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { parseEnv, promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createFalClient } from "@fal-ai/client";

const execFileAsync = promisify(execFile);
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FAL_PRICING_URL = "https://api.fal.ai/v1/models/pricing";
export const DEFAULT_FAL_ENDPOINT = "fal-ai/longcat-video/distilled/image-to-video/720p";
export const PIXVERSE_C1_ENDPOINT = "fal-ai/pixverse/c1/image-to-video";
export const LONGCAT_BILLING_FPS = 30;
export const LONGCAT_PROFILE_FRAMES = 240;
export const LONGCAT_PROFILE_DURATION_SECONDS = 8;
export const LONGCAT_OBSERVED_OUTPUT_FRAMES = 506;
const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_ATTEMPTS = 360;
const DOWNLOAD_TIMEOUT_MS = 180_000;
const MAX_COST_USD = 0.5;
const PROJECT_LEASE_NAME = ".fal-video.lock";
const TERMINAL_FAILURE_STATUSES = new Set(["FAILED", "CANCELLED", "CANCELED", "EXPIRED"]);
const SUPPORTED_IMAGE_TYPES = new Map([
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".webp", "image/webp"],
]);

const MODEL_PROFILES = new Map([
  [DEFAULT_FAL_ENDPOINT, {
    name: "LongCat 720p",
    estimateBasis: "conservative-observed-output-floor",
    validateShot(shot) {
      if (shot.durationSeconds !== LONGCAT_PROFILE_DURATION_SECONDS) {
        throw new Error(`Shot ${shot.id} durationSeconds must be ${LONGCAT_PROFILE_DURATION_SECONDS} for the calibrated LongCat execution profile`);
      }
      if (shot.numFrames !== LONGCAT_PROFILE_FRAMES) {
        throw new Error(`Shot ${shot.id} numFrames must be ${LONGCAT_PROFILE_FRAMES} for the calibrated LongCat execution profile`);
      }
      if (shot.fps !== 30) throw new Error(`Shot ${shot.id} fps must be 30 for the LongCat 720p profile`);
    },
    buildInput(shot, imageUrl) {
      return {
        image_url: imageUrl,
        prompt: shot.prompt,
        num_frames: shot.numFrames,
        num_inference_steps: 12,
        num_refine_inference_steps: 12,
        fps: shot.fps,
        ...(Number.isInteger(shot.seed) ? { seed: shot.seed } : {}),
        enable_prompt_expansion: false,
        enable_safety_checker: true,
        video_output_type: "X264 (.mp4)",
        video_quality: "high",
        video_write_mode: "balanced",
        sync_mode: false,
      };
    },
    billableSeconds(shot) {
      return Math.max(shot.durationSeconds, LONGCAT_OBSERVED_OUTPUT_FRAMES / LONGCAT_BILLING_FPS);
    },
    validateRaw(media, shot) {
      if (media.width !== 1280 || ![704, 720].includes(media.height)) {
        throw new Error(`Fal MP4 must be 1280x720 or the documented aligned 1280x704 variant; received ${media.width}x${media.height}`);
      }
      if (!Number.isFinite(media.fps) || Math.abs(media.fps - shot.fps) > 0.1) {
        throw new Error(`Fal MP4 must be ${shot.fps}fps; received ${media.fps || "unknown"}`);
      }
    },
  }],
  [PIXVERSE_C1_ENDPOINT, {
    name: "PixVerse C1 720p",
    estimateBasis: "requested-duration",
    validateShot(shot) {
      if (!Number.isInteger(shot.durationSeconds) || shot.durationSeconds < 1 || shot.durationSeconds > 15) {
        throw new Error(`Shot ${shot.id} durationSeconds must be an integer from 1 through 15 for PixVerse C1`);
      }
      if (shot.fps !== 30) throw new Error(`Shot ${shot.id} fps must be 30 for the canonical PixVerse C1 profile`);
      if (shot.numFrames !== shot.durationSeconds * shot.fps) {
        throw new Error(`Shot ${shot.id} numFrames must equal durationSeconds*fps for PixVerse C1`);
      }
    },
    buildInput(shot, imageUrl) {
      return {
        image_url: imageUrl,
        prompt: shot.prompt,
        duration: shot.durationSeconds,
        resolution: "720p",
        generate_audio_switch: false,
        ...(Number.isInteger(shot.seed) ? { seed: shot.seed } : {}),
      };
    },
    billableSeconds(shot) {
      return shot.durationSeconds;
    },
    validateRaw(media, shot) {
      if (media.width !== 1280 || media.height !== 720) {
        throw new Error(`PixVerse C1 MP4 must be 1280x720; received ${media.width}x${media.height}`);
      }
      if (!Number.isFinite(media.fps) || media.fps < 12 || media.fps > 60) {
        throw new Error(`PixVerse C1 MP4 must expose a plausible frame rate from 12 through 60fps; received ${media.fps || "unknown"}`);
      }
      if (media.durationSeconds < shot.durationSeconds * 0.75 || media.durationSeconds > shot.durationSeconds * 1.25) {
        throw new Error(`PixVerse C1 MP4 duration ${media.durationSeconds}s is too far from the requested ${shot.durationSeconds}s`);
      }
    },
  }],
]);

function modelProfile(endpointId) {
  const profile = MODEL_PROFILES.get(endpointId);
  if (!profile) throw new Error(`Unsupported Fal image-to-video endpoint: ${endpointId ?? "missing"}`);
  return profile;
}

function shotModelProfile(shot) {
  return modelProfile(shot?.model ?? DEFAULT_FAL_ENDPOINT);
}

export function parseArgs(argv) {
  const options = { project: undefined, shot: undefined, all: false, dryRun: false, api: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--dry-run") options.dryRun = true;
    else if (value === "--api") options.api = true;
    else if (value === "--all") options.all = true;
    else if (value === "--shot") options.shot = argv[++index];
    else if (!value.startsWith("--") && !options.project) options.project = value;
    else throw new Error(`Unknown or incomplete argument: ${value}`);
  }
  if (!options.project || Boolean(options.shot) === options.all) {
    throw new Error("Usage: node scripts/generate-fal-video.mjs videos/<slug> (--shot <id> | --all) (--dry-run | --api)");
  }
  if (options.dryRun === options.api) throw new Error("Choose exactly one execution mode: --dry-run or --api");
  return options;
}

export function resolveFalCredentialPolicy({ ambient = process.env, repositoryEnv = {} } = {}) {
  const candidates = [
    ["repository .env FAL_AI_API_KEY", repositoryEnv.FAL_AI_API_KEY],
    ["repository .env FAL_KEY", repositoryEnv.FAL_KEY],
    ["ambient FAL_AI_API_KEY", ambient.FAL_AI_API_KEY],
    ["ambient FAL_KEY", ambient.FAL_KEY],
  ].map(([source, value]) => [source, typeof value === "string" ? value.trim() : ""]).filter(([, value]) => value);
  const repositoryCandidates = candidates.filter(([source]) => source.startsWith("repository"));
  if (repositoryCandidates.length === 0) {
    throw new Error("Fal credentials must be configured in the repository .env file; ambient-only credentials are not accepted");
  }
  if (new Set(candidates.map(([, value]) => value)).size !== 1) {
    throw new Error(`Conflicting Fal credentials across ${candidates.map(([source]) => source).join(", ")}; remove or align the conflicting variables`);
  }
  return { apiKey: repositoryCandidates[0][1], source: repositoryCandidates[0][0] };
}

async function loadRepositoryFalCredential(ambient = process.env) {
  const envPath = path.join(REPO_ROOT, ".env");
  let repositoryEnv;
  try {
    repositoryEnv = parseEnv(await fs.readFile(envPath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") repositoryEnv = {};
    else throw new Error("Could not parse the repository .env file for Fal credentials");
  }
  return resolveFalCredentialPolicy({ ambient, repositoryEnv });
}

function normalizedRelativePath(value) {
  if (typeof value !== "string" || !value.trim() || path.isAbsolute(value)) {
    throw new Error(`Asset path must be project-relative: ${value ?? "missing"}`);
  }
  const normalized = value.replaceAll("\\", "/");
  if (normalized.split("/").includes("..")) throw new Error(`Asset path escapes the project: ${value}`);
  return normalized;
}

function isPathInside(root, candidate) {
  return candidate === root || candidate.startsWith(root + path.sep);
}

function safeProjectPath(input) {
  const requested = path.resolve(REPO_ROOT, input);
  const lexicalVideosRoot = path.join(REPO_ROOT, "videos");
  if (!isPathInside(lexicalVideosRoot, requested) || requested === lexicalVideosRoot) throw new Error("Project must be inside videos/");
  if (!fsSync.existsSync(requested) || !fsSync.statSync(requested).isDirectory()) throw new Error(`Project does not exist: ${input}`);
  const videosRoot = fsSync.realpathSync(lexicalVideosRoot);
  const project = fsSync.realpathSync(requested);
  if (!isPathInside(videosRoot, project) || project === videosRoot) throw new Error("Project symlink resolves outside videos/");
  return project;
}

export async function assertSafeProjectReadFile(project, file, label = "Project input") {
  const projectReal = await fs.realpath(project);
  let stat;
  try {
    stat = await fs.lstat(file);
  } catch (error) {
    if (error?.code === "ENOENT") throw new Error(`${label} does not exist: ${path.relative(project, file)}`);
    throw error;
  }
  if (stat.isSymbolicLink()) throw new Error(`${label} must not be a symbolic link: ${path.relative(project, file)}`);
  if (!stat.isFile()) throw new Error(`${label} must be a file: ${path.relative(project, file)}`);
  const real = await fs.realpath(file);
  if (!isPathInside(projectReal, real) || real === projectReal) throw new Error(`${label} resolves outside the project: ${path.relative(project, file)}`);
  return real;
}

export async function assertSafeProjectWritePath(project, file, label = "Project output") {
  const projectLexical = path.resolve(project);
  const projectReal = await fs.realpath(project);
  let targetStat;
  try {
    targetStat = await fs.lstat(file);
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }
  if (targetStat?.isSymbolicLink()) throw new Error(`${label} must not be a symbolic link: ${path.relative(project, file)}`);
  if (targetStat) {
    const targetReal = await fs.realpath(file);
    if (!isPathInside(projectReal, targetReal) || targetReal === projectReal) throw new Error(`${label} resolves outside the project: ${path.relative(project, file)}`);
  }

  let existingParent = path.dirname(file);
  while (true) {
    try {
      await fs.lstat(existingParent);
      break;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      const next = path.dirname(existingParent);
      if (next === existingParent) throw new Error(`${label} has no existing project parent`);
      existingParent = next;
    }
  }
  let ancestor = existingParent;
  while (isPathInside(projectLexical, ancestor)) {
    const ancestorStat = await fs.lstat(ancestor);
    if (ancestorStat.isSymbolicLink()) throw new Error(`${label} must not use a symbolic-link parent: ${path.relative(project, ancestor)}`);
    if (ancestor === projectLexical) break;
    ancestor = path.dirname(ancestor);
  }
  const parentReal = await fs.realpath(existingParent);
  if (!isPathInside(projectReal, parentReal)) throw new Error(`${label} parent resolves outside the project: ${path.relative(project, file)}`);
  return file;
}

function processAppearsAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error?.code === "EPERM";
  }
}

export async function acquireProjectLease(project, { pid = process.pid, hostname = os.hostname(), now = () => new Date() } = {}) {
  const lockPath = path.join(project, "assets", "generated", "video", PROJECT_LEASE_NAME);
  await assertSafeProjectWritePath(project, lockPath, "Fal project lease");
  await fs.mkdir(path.dirname(lockPath), { recursive: true });
  await assertSafeProjectWritePath(project, lockPath, "Fal project lease");
  const nonce = crypto.randomUUID();
  let handle;
  try {
    handle = await fs.open(lockPath, "wx", 0o600);
  } catch (error) {
    if (error?.code !== "EEXIST") throw error;
    let owner;
    try { owner = JSON.parse(await fs.readFile(lockPath, "utf8")); } catch { owner = undefined; }
    const sameHost = owner?.hostname === hostname;
    const state = sameHost && processAppearsAlive(owner?.pid) ? "owner process appears active" : "stale or unverifiable owner";
    throw new Error(`Fal project lease already exists (${state}). Leases are never broken by age; reconcile Fal request history and every shot ledger before manually removing ${path.relative(project, lockPath)}`);
  }
  const lease = { schemaVersion: 1, nonce, pid, hostname, startedAt: now().toISOString() };
  try {
    await handle.writeFile(`${JSON.stringify(lease)}\n`, "utf8");
    await handle.sync();
  } catch (error) {
    await handle.close().catch(() => undefined);
    await fs.unlink(lockPath).catch(() => undefined);
    throw error;
  }
  await handle.close();
  return {
    lockPath,
    nonce,
    async release() {
      let current;
      try { current = JSON.parse(await fs.readFile(lockPath, "utf8")); } catch { return false; }
      if (current?.nonce !== nonce) return false;
      await fs.unlink(lockPath);
      return true;
    },
  };
}

function safeAssetPath(project, relativePath, expectedPrefix) {
  const normalized = normalizedRelativePath(relativePath);
  if (!normalized.startsWith(expectedPrefix)) throw new Error(`Asset path must stay under ${expectedPrefix}: ${relativePath}`);
  const absolute = path.resolve(project, normalized);
  const prefix = path.resolve(project, expectedPrefix);
  if (absolute !== prefix && !absolute.startsWith(prefix + path.sep)) throw new Error(`Asset path escapes ${expectedPrefix}: ${relativePath}`);
  return absolute;
}

function safeVideoCopyPath(project, relativePath) {
  const normalized = normalizedRelativePath(relativePath);
  if (!/(^|\/)assets\/generated\/video\/[^/]+\.mp4$/i.test(normalized)) {
    throw new Error(`Video copy must end under assets/generated/video/: ${relativePath}`);
  }
  const absolute = path.resolve(project, normalized);
  if (absolute === project || !absolute.startsWith(project + path.sep)) throw new Error(`Video copy escapes the project: ${relativePath}`);
  return absolute;
}

function safeCompositionPath(project, relativePath) {
  const normalized = normalizedRelativePath(relativePath);
  if (path.extname(normalized).toLowerCase() !== ".html") {
    throw new Error(`Generated-video integration file must be HTML: ${relativePath}`);
  }
  const absolute = path.resolve(project, normalized);
  if (absolute === project || !absolute.startsWith(project + path.sep)) {
    throw new Error(`Generated-video integration file escapes the project: ${relativePath}`);
  }
  return { relative: normalized, absolute };
}

function assertShotId(value) {
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value ?? "")) throw new Error(`Invalid shot id: ${value ?? "missing"}`);
}

export function validateVideoPlan(plan, project = "/repo/videos/example") {
  if (!plan || plan.schemaVersion !== 1) throw new Error("generated-video-plan.json must use schemaVersion 1");
  if (plan.provider !== "fal.ai") throw new Error("Executable generated-video-plan.json must set provider to fal.ai");
  const profile = modelProfile(plan.model);
  if (typeof plan.maxCostUsd !== "number" || plan.maxCostUsd <= 0 || plan.maxCostUsd > MAX_COST_USD) {
    throw new Error("Video plan maxCostUsd must be greater than 0 and no more than $0.50");
  }
  if (!Array.isArray(plan.shots) || plan.shots.length === 0) throw new Error("Video plan requires at least one shot");
  if (!Array.isArray(plan.integrationFiles) || plan.integrationFiles.length === 0 || new Set(plan.integrationFiles).size !== plan.integrationFiles.length) {
    throw new Error("Video plan integrationFiles must be a unique, nonempty array");
  }
  const integrationFiles = plan.integrationFiles.map((file) => safeCompositionPath(project, file).relative);
  if (new Set(integrationFiles.map((file) => path.resolve(project, file))).size !== integrationFiles.length) {
    throw new Error("Video plan integrationFiles must resolve to unique composition files");
  }

  const ids = new Set();
  const shots = plan.shots.map((shot) => {
    assertShotId(shot?.id);
    if (ids.has(shot.id)) throw new Error(`Duplicate shot id: ${shot.id}`);
    ids.add(shot.id);
    if (typeof shot.prompt !== "string" || shot.prompt.trim().length < 40) throw new Error(`Shot ${shot.id} needs a detailed motion prompt`);
    if (shot.endFrame) throw new Error(`Shot ${shot.id} uses endFrame, but ${plan.model} supports only an opening frame in this runner`);
    if (shot.audioPolicy !== "none") throw new Error(`Shot ${shot.id} must use audioPolicy=none; HyperFrames owns the soundtrack`);
    if (shot.aspectRatio !== "16:9") throw new Error(`Shot ${shot.id} must use a pre-normalized 16:9 opening frame`);
    profile.validateShot(shot);
    const durationFromFrames = shot.numFrames / shot.fps;
    if (Math.abs(durationFromFrames - shot.durationSeconds) > 1 / shot.fps) {
      throw new Error(`Shot ${shot.id} durationSeconds must match numFrames/fps (${durationFromFrames.toFixed(3)}s)`);
    }
    if (shot.provider && shot.provider !== plan.provider) throw new Error(`Shot ${shot.id} provider override does not match the plan`);
    if (shot.model && shot.model !== plan.model) throw new Error(`Shot ${shot.id} model override does not match the plan`);
    if (shot.seed != null && !Number.isInteger(shot.seed)) throw new Error(`Shot ${shot.id} seed must be an integer`);

    safeAssetPath(project, shot.startFrame, "assets/generated/");
    safeAssetPath(project, shot.output, "assets/generated/video/");
    if (path.extname(shot.output).toLowerCase() !== ".mp4") throw new Error(`Shot ${shot.id} output must be MP4`);
    const copies = shot.copies ?? [];
    if (!Array.isArray(copies)) throw new Error(`Shot ${shot.id} copies must be an array`);
    for (const copy of copies) safeVideoCopyPath(project, copy);

    return {
      ...shot,
      provider: plan.provider,
      model: plan.model,
      maxCostUsd: plan.maxCostUsd,
      integrationFiles,
      copies,
      prompt: shot.prompt.trim(),
    };
  });

  const claimedVideoPaths = new Map();
  for (const shot of shots) {
    for (const [kind, relativePath] of [["output", shot.output], ...shot.copies.map((copy) => ["copy", copy])]) {
      const absolute = kind === "output"
        ? safeAssetPath(project, relativePath, "assets/generated/video/")
        : safeVideoCopyPath(project, relativePath);
      const collisionKey = absolute.normalize("NFC").toLowerCase();
      const existing = claimedVideoPaths.get(collisionKey);
      if (existing) throw new Error(`Generated-video path collision: ${relativePath} is claimed by ${existing} and ${shot.id} ${kind}`);
      claimedVideoPaths.set(collisionKey, `${shot.id} ${kind}`);
    }
  }
  return shots;
}

export function buildFalInput(shot, imageUrl) {
  if (!imageUrl) throw new Error("Fal input requires an uploaded opening-frame URL");
  return shotModelProfile(shot).buildInput(shot, imageUrl);
}

export function parseFalPricing(body, endpointId) {
  if (!body || !Array.isArray(body.prices)) throw new Error("Fal pricing response is missing prices[]");
  const matches = body.prices.filter((price) => price?.endpoint_id === endpointId);
  if (matches.length !== 1) throw new Error(`Fal pricing must contain exactly one record for ${endpointId}`);
  const price = matches[0];
  if (price.currency !== "USD") throw new Error(`Unsupported Fal pricing currency: ${price.currency ?? "missing"}`);
  if (price.unit !== "seconds") throw new Error(`Unsupported Fal pricing unit: ${price.unit ?? "missing"}`);
  if (typeof price.unit_price !== "number" || !Number.isFinite(price.unit_price) || price.unit_price < 0) {
    throw new Error("Fal pricing unit_price must be a finite nonnegative number");
  }
  return { endpointId, unitPrice: price.unit_price, unit: price.unit, currency: price.currency };
}

export function estimateVideoCost(shot, pricing) {
  if (pricing.unit !== "seconds") throw new Error(`Cannot estimate Fal cost from unit ${pricing.unit}`);
  const profile = shotModelProfile(shot);
  const requestedSeconds = shot.durationSeconds;
  const billableSeconds = profile.billableSeconds(shot);
  const observedOutputSecondsFloor = billableSeconds;
  const raw = billableSeconds * pricing.unitPrice;
  const estimatedCostUsd = Math.ceil(raw * 1_000_000) / 1_000_000;
  return {
    billableSeconds,
    requestedSeconds,
    observedOutputSecondsFloor,
    estimatedCostUsd,
    conservativeCostCeilingUsd: estimatedCostUsd,
    actualBillingUsd: null,
    estimateBasis: profile.estimateBasis,
  };
}

export function validatePersistedCost(shot, ledger) {
  if (!ledger || ledger.provider !== "fal.ai" || ledger.endpointId !== shot.model) {
    throw new Error(`Shot ${shot.id} resume ledger does not match the Fal endpoint`);
  }
  const pricing = ledger.pricing;
  if (!pricing || pricing.endpointId !== shot.model || pricing.unit !== "seconds" || pricing.currency !== "USD"
    || typeof pricing.unitPrice !== "number" || !Number.isFinite(pricing.unitPrice) || pricing.unitPrice < 0) {
    throw new Error(`Shot ${shot.id} resume ledger has invalid persisted pricing`);
  }
  const persistedBillableSeconds = Number(ledger.billableSeconds);
  const persistedEstimatedCostUsd = Number(ledger.estimatedCostUsd);
  const requestedSeconds = shot.durationSeconds;
  const persistedExpectedCost = Math.ceil(persistedBillableSeconds * pricing.unitPrice * 1_000_000) / 1_000_000;
  if (!Number.isFinite(persistedBillableSeconds) || persistedBillableSeconds < requestedSeconds
    || !Number.isFinite(persistedEstimatedCostUsd) || Math.abs(persistedEstimatedCostUsd - persistedExpectedCost) > 1e-9) {
    throw new Error(`Shot ${shot.id} resume ledger cost does not match its persisted price and frame count`);
  }
  if (persistedEstimatedCostUsd > shot.maxCostUsd) {
    throw new Error(`Persisted Fal cost estimate $${persistedEstimatedCostUsd.toFixed(4)} exceeds the $${shot.maxCostUsd.toFixed(2)} per-video limit`);
  }
  const conservative = estimateVideoCost(shot, pricing);
  const cost = {
    billableSeconds: persistedBillableSeconds,
    estimatedCostUsd: persistedEstimatedCostUsd,
    requestedSeconds,
    observedOutputSecondsFloor: conservative.observedOutputSecondsFloor,
    conservativeCostCeilingUsd: conservative.estimatedCostUsd,
    actualBillingUsd: null,
    estimateBasis: "persisted-preflight-estimate-with-current-conservative-ceiling",
  };
  return { pricing, cost };
}

async function fetchLivePricing(endpointId, apiKey, fetchImpl = fetch) {
  const url = new URL(FAL_PRICING_URL);
  url.searchParams.set("endpoint_id", endpointId);
  const response = await fetchImpl(url, {
    headers: { Authorization: `Key ${apiKey}`, Accept: "application/json" },
  });
  const body = await response.json().catch(() => undefined);
  if (!response.ok) throw new Error(`Fal pricing lookup failed (${response.status})`);
  return parseFalPricing(body, endpointId);
}

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function readJsonIfExists(file) {
  try { return await readJson(file); } catch (error) {
    if (error?.code === "ENOENT") return undefined;
    throw error;
  }
}

async function atomicWriteJson(project, file, value) {
  await assertSafeProjectWritePath(project, file, "Provider state file");
  await fs.mkdir(path.dirname(file), { recursive: true });
  await assertSafeProjectWritePath(project, file, "Provider state file");
  const temporary = `${file}.${crypto.randomUUID()}.tmp`;
  await assertSafeProjectWritePath(project, temporary, "Provider state staging file");
  await fs.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
  await fs.rename(temporary, file);
}

function jobLedgerPath(project, shotId) {
  return path.join(project, "assets", "generated", "video", "jobs", `${shotId}.json`);
}

export function shotFingerprint(shot, sourceSha256) {
  return sha256(JSON.stringify({
    provider: shot.provider,
    model: shot.model,
    startFrame: shot.startFrame,
    sourceSha256,
    output: shot.output,
    copies: shot.copies,
    prompt: shot.prompt,
    numFrames: shot.numFrames,
    fps: shot.fps,
    seed: shot.seed ?? null,
  }));
}

function parseHtmlAttributes(fragment) {
  const attributes = new Map();
  const pattern = /([^\s=/>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of fragment.matchAll(pattern)) {
    attributes.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? "");
  }
  return attributes;
}

function escapeHtmlAttribute(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function countHtmlIds(html) {
  const counts = new Map();
  for (const match of html.matchAll(/<[a-z][^>]*>/gi)) {
    const id = parseHtmlAttributes(match[0]).get("id");
    if (id) counts.set(id, (counts.get(id) ?? 0) + 1);
  }
  return counts;
}

function validateSlotId(attributes, idCounts, shot) {
  const id = attributes.get("id");
  if (!id?.trim()) throw new Error(`Generated-video slot ${shot.id} requires a stable nonempty id`);
  if (idCounts.get(id) !== 1) throw new Error(`Generated-video slot id must be unique in its composition: ${id}`);
}

function resolveCompositionMedia(project, compositionFile, value, label) {
  if (typeof value !== "string" || !value || value.includes("?") || value.includes("#")) {
    throw new Error(`${label} must be a plain project-local relative path in ${path.relative(project, compositionFile)}`);
  }
  const normalized = normalizedRelativePath(value);
  const absolute = path.resolve(path.dirname(compositionFile), normalized);
  if (absolute === project || !absolute.startsWith(project + path.sep)) {
    throw new Error(`${label} escapes the project in ${path.relative(project, compositionFile)}`);
  }
  return absolute;
}

function assertFiniteAttribute(attributes, name, { min = 0, max = Number.POSITIVE_INFINITY, integer = false } = {}) {
  const value = Number(attributes.get(name));
  if (!Number.isFinite(value) || value < min || value > max || (integer && !Number.isInteger(value))) {
    throw new Error(`Generated-video slot ${name} must be ${integer ? "an integer" : "a number"} from ${min} through ${max}`);
  }
  return value;
}

function validateSlotAttributes({ attributes, project, compositionFile, shot, active }) {
  if (active && (!attributes.has("muted") || !attributes.has("playsinline") || attributes.get("preload") !== "auto")) {
    throw new Error(`Active generated-video slot ${shot.id} must be muted, playsinline, and preload=auto`);
  }
  const prefix = active ? "" : "data-generated-";
  const srcName = active ? "src" : `${prefix}video-src`;
  const posterName = active ? "poster" : `${prefix}poster`;
  const startName = active ? "data-start" : `${prefix}start`;
  const durationName = active ? "data-duration" : `${prefix}duration`;
  const trackName = active ? "data-track-index" : `${prefix}track`;
  const src = attributes.get(srcName);
  const poster = attributes.get(posterName);
  const resolvedSrc = resolveCompositionMedia(project, compositionFile, src, srcName);
  const allowedVideos = new Set([
    safeAssetPath(project, shot.output, "assets/generated/video/"),
    ...shot.copies.map((copy) => safeVideoCopyPath(project, copy)),
  ]);
  if (!allowedVideos.has(resolvedSrc)) {
    throw new Error(`Generated-video slot ${srcName} for ${shot.id} must resolve to its canonical output or declared copy`);
  }
  const resolvedPoster = resolveCompositionMedia(project, compositionFile, poster, posterName);
  const start = assertFiniteAttribute(attributes, startName, { min: 0 });
  const duration = assertFiniteAttribute(attributes, durationName, { min: Number.EPSILON, max: shot.durationSeconds });
  const track = assertFiniteAttribute(attributes, trackName, { min: 0, integer: true });
  return { src, poster, resolvedSrc, resolvedPoster, start, duration, track };
}

export function planGeneratedVideoActivation({ html, project, compositionFile, shot }) {
  let placeholderCount = 0;
  let activeCount = 0;
  const slots = [];
  const idCounts = countHtmlIds(html);
  const placeholderPattern = /<div\b([^>]*)>\s*<\/div>/gi;
  const nextHtml = html.replace(placeholderPattern, (element, attributeFragment) => {
    const attributes = parseHtmlAttributes(attributeFragment);
    const classes = (attributes.get("class") ?? "").split(/\s+/).filter(Boolean);
    if (!classes.includes("generated-video-slot") || attributes.get("data-generation-shot-id") !== shot.id) return element;
    validateSlotId(attributes, idCounts, shot);
    const slot = validateSlotAttributes({ attributes, project, compositionFile, shot, active: false });
    placeholderCount += 1;
    slots.push(slot);
    const className = classes.join(" ");
    const preserved = ["id", "aria-hidden", "aria-label", "role"]
      .filter((name) => attributes.has(name))
      .map((name) => ` ${name}="${escapeHtmlAttribute(attributes.get(name))}"`)
      .join("");
    return `<video${preserved} class="${escapeHtmlAttribute(className)}" muted playsinline preload="auto" src="${escapeHtmlAttribute(slot.src)}" poster="${escapeHtmlAttribute(slot.poster)}" data-start="${slot.start}" data-duration="${slot.duration}" data-track-index="${slot.track}" data-generation-shot-id="${escapeHtmlAttribute(shot.id)}"></video>`;
  });

  const activePattern = /<video\b([^>]*)>(?:\s*<\/video>)?/gi;
  for (const match of html.matchAll(activePattern)) {
    const attributes = parseHtmlAttributes(match[1]);
    if (attributes.get("data-generation-shot-id") !== shot.id) continue;
    validateSlotId(attributes, idCounts, shot);
    slots.push(validateSlotAttributes({ attributes, project, compositionFile, shot, active: true }));
    activeCount += 1;
  }
  if (placeholderCount === 0 && activeCount === 0) {
    throw new Error(`No generated-video slot for ${shot.id} in ${path.relative(project, compositionFile)}`);
  }
  return { html: nextHtml, placeholderCount, activeCount, slots };
}

export async function activateGeneratedVideos(project, shots) {
  const fileStates = new Map();
  const activatedFiles = new Map(shots.map((shot) => [shot.id, []]));

  for (const shot of shots) {
    for (const relativeFile of shot.integrationFiles) {
      const { absolute: compositionFile } = safeCompositionPath(project, relativeFile);
      let state = fileStates.get(compositionFile);
      if (!state) {
        await assertSafeProjectReadFile(project, compositionFile, "Generated-video integration file");
        state = { html: await fs.readFile(compositionFile, "utf8"), changed: false };
        fileStates.set(compositionFile, state);
      }
      const planned = planGeneratedVideoActivation({ html: state.html, project, compositionFile, shot });
      for (const slot of planned.slots) {
        await assertSafeProjectReadFile(project, slot.resolvedPoster, "Generated-video poster");
        await assertSafeProjectReadFile(project, slot.resolvedSrc, "Generated-video output");
        const posterStat = await fs.stat(slot.resolvedPoster).catch(() => undefined);
        const videoStat = await fs.stat(slot.resolvedSrc).catch(() => undefined);
        if (!posterStat?.isFile()) throw new Error(`Generated-video poster is missing: ${path.relative(project, slot.resolvedPoster)}`);
        if (!videoStat?.isFile()) throw new Error(`Generated-video output is missing: ${path.relative(project, slot.resolvedSrc)}`);
      }
      state.html = planned.html;
      state.changed ||= planned.placeholderCount > 0;
      if (planned.placeholderCount > 0) activatedFiles.get(shot.id).push(relativeFile);
    }
  }

  const staged = [];
  try {
    for (const [compositionFile, state] of fileStates) {
      if (!state.changed) continue;
      await assertSafeProjectWritePath(project, compositionFile, "Generated-video integration file");
      const temporary = `${compositionFile}.${crypto.randomUUID()}.tmp`;
      await assertSafeProjectWritePath(project, temporary, "Generated-video integration staging file");
      await fs.writeFile(temporary, state.html);
      staged.push({ compositionFile, temporary });
    }
    for (const item of staged) await fs.rename(item.temporary, item.compositionFile);
  } catch (error) {
    await Promise.all(staged.map((item) => fs.unlink(item.temporary).catch(() => undefined)));
    throw error;
  }
  return activatedFiles;
}

async function preflightGeneratedVideoActivation(project, shot) {
  let hasActive = false;
  for (const relativeFile of shot.integrationFiles) {
    const { absolute: compositionFile } = safeCompositionPath(project, relativeFile);
    await assertSafeProjectReadFile(project, compositionFile, "Generated-video integration file");
    const html = await fs.readFile(compositionFile, "utf8");
    const planned = planGeneratedVideoActivation({ html, project, compositionFile, shot });
    hasActive ||= planned.activeCount > 0;
    for (const slot of planned.slots) {
      await assertSafeProjectReadFile(project, slot.resolvedPoster, "Generated-video poster");
      const posterStat = await fs.stat(slot.resolvedPoster).catch(() => undefined);
      if (!posterStat?.isFile()) throw new Error(`Generated-video poster is missing: ${path.relative(project, slot.resolvedPoster)}`);
    }
  }
  return { hasActive };
}

export function resumeDecision(existing, fingerprint) {
  if (!existing) return "submit";
  if (existing.fingerprint !== fingerprint) throw new Error("Existing Fal job belongs to different shot inputs; use a new shot id/output instead of resubmitting");
  if (existing.status === "submitting" && !existing.requestId) {
    throw new Error("Fal submission state is ambiguous: the request may have been accepted before its id was saved. Reconcile it in Fal request history; refusing to risk duplicate billing");
  }
  if (existing.status === "completed") return "completed";
  if (existing.requestId) return "resume";
  if (existing.status === "prepared") return "submit";
  throw new Error(`Cannot resume Fal job from state ${existing.status ?? "unknown"}`);
}

export async function submitFalJob({ client, endpointId, input, ledger, writeLedger }) {
  const submitting = { ...ledger, status: "submitting", updatedAt: new Date().toISOString() };
  await writeLedger(submitting);
  let queued;
  try {
    queued = await client.queue.submit(endpointId, { input });
    if (!queued?.request_id) throw new Error("missing-request-id");
  } catch (error) {
    const safeName = ["Error", "TypeError", "FetchError", "AbortError", "TimeoutError"].includes(error?.name) ? error.name : "Error";
    const safeCode = typeof error?.code === "string" && /^[A-Z0-9_]{1,40}$/.test(error.code) ? error.code : null;
    const uncertain = {
      ...submitting,
      status: "submitting",
      submissionUncertain: true,
      submissionError: {
        category: "queue-submit-error",
        name: safeName,
        code: safeCode,
        httpStatus: Number.isInteger(error?.status) ? error.status : null,
      },
      submissionFailedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await writeLedger(uncertain);
    throw new Error("Fal queue submission outcome is uncertain and was saved without sensitive details; reconcile Fal request history before any retry");
  }
  const submitted = {
    ...submitting,
    status: queued.status ?? "IN_QUEUE",
    requestId: queued.request_id,
    statusUrl: queued.status_url ?? null,
    responseUrl: queued.response_url ?? null,
    cancelUrl: queued.cancel_url ?? null,
    submittedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await writeLedger(submitted);
  return submitted;
}

export async function pollFalJob({ client, endpointId, ledger, writeLedger, sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)), pollIntervalMs = POLL_INTERVAL_MS, maxAttempts = MAX_POLL_ATTEMPTS }) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let status;
    try {
      status = await client.queue.status(endpointId, { requestId: ledger.requestId, logs: false });
    } catch {
      const error = new Error("Fal status lookup failed; rerun the same shot to resume without resubmitting");
      error.falStage = "poll";
      throw error;
    }
    ledger = {
      ...ledger,
      status: status.status,
      statusUrl: status.status_url ?? ledger.statusUrl ?? null,
      responseUrl: status.response_url ?? ledger.responseUrl ?? null,
      cancelUrl: status.cancel_url ?? ledger.cancelUrl ?? null,
      pollAttempts: (ledger.pollAttempts ?? 0) + 1,
      updatedAt: new Date().toISOString(),
    };
    await writeLedger(ledger);
    if (status.status === "COMPLETED") return ledger;
    if (TERMINAL_FAILURE_STATUSES.has(status.status)) {
      const error = new Error(`Fal video generation ended with status ${status.status}`);
      error.falStatus = status.status;
      throw error;
    }
    await sleep(pollIntervalMs);
  }
  const timedOut = { ...ledger, status: "poll-timeout", updatedAt: new Date().toISOString() };
  await writeLedger(timedOut);
  throw new Error("Fal video generation did not complete after 30 minutes; rerun the same shot to resume polling without resubmitting");
}

export function parseFalResult(result) {
  const video = result?.data?.video;
  const url = typeof video === "string" ? video : video?.url;
  if (!url) throw new Error("Fal result did not contain video.url");
  return {
    url,
    seed: result?.data?.seed ?? null,
    providerPrompt: result?.data?.prompt ?? null,
    remote: typeof video === "object" && video ? {
      contentType: video.content_type ?? null,
      fileName: video.file_name ?? null,
      fileSize: video.file_size ?? null,
    } : null,
  };
}

export function validateMp4Bytes(bytes, contentType = "") {
  if (!Buffer.isBuffer(bytes) || bytes.length < 1_024) throw new Error("Downloaded Fal video is unexpectedly small");
  if (contentType && !/^(video\/mp4|application\/(?:octet-stream|mp4))(?:;|$)/i.test(contentType)) {
    throw new Error(`Fal download returned unexpected content type ${contentType}`);
  }
  if (bytes.subarray(4, 8).toString("ascii") !== "ftyp") throw new Error("Fal download is not an MP4 file");
}

function parseFrameRate(value) {
  if (typeof value !== "string") return Number(value);
  const [numerator, denominator] = value.split("/").map(Number);
  return denominator ? numerator / denominator : numerator;
}

async function probeInputImage(file) {
  const { stdout } = await execFileAsync("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height", "-of", "json", file], { encoding: "utf8" });
  const stream = JSON.parse(stdout).streams?.[0];
  if (!stream?.width || !stream?.height) throw new Error(`Could not inspect opening frame: ${file}`);
  const ratio = stream.width / stream.height;
  if (Math.abs(ratio - 16 / 9) > 0.015) throw new Error(`Opening frame must be 16:9; received ${stream.width}x${stream.height}`);
  return { width: stream.width, height: stream.height };
}

export function validateVideoProbe(media, shot, { raw = false } = {}) {
  if (media.codec !== "h264") throw new Error(`Fal MP4 codec must be H.264; received ${media.codec ?? "unknown"}`);
  if (raw) shotModelProfile(shot).validateRaw(media, shot);
  else {
    if (media.width !== 1280 || media.height !== 720) throw new Error(`Fal MP4 must be 1280x720; received ${media.width}x${media.height}`);
    if (!Number.isFinite(media.fps) || Math.abs(media.fps - shot.fps) > 0.1) throw new Error(`Fal MP4 must be ${shot.fps}fps; received ${media.fps || "unknown"}`);
  }
  if (!Number.isInteger(media.frameCount) || media.frameCount <= 0) {
    throw new Error(`Fal MP4 must expose a positive exact video frame count; received ${media.frameCount || "unknown"}`);
  }
  if (!Number.isFinite(media.durationSeconds) || media.durationSeconds <= 0) {
    throw new Error(`Fal MP4 must expose a positive duration; received ${media.durationSeconds || "unknown"}`);
  }
  if (raw) {
    if (media.frameCount < 17 || media.frameCount > 961) {
      throw new Error(`Raw Fal MP4 frame count must be from 17 through 961; received ${media.frameCount}`);
    }
    const durationFromFrames = media.frameCount / media.fps;
    if (Math.abs(media.durationSeconds - durationFromFrames) > Math.max(2 / media.fps, 0.05)) {
      throw new Error(`Raw Fal MP4 duration ${media.durationSeconds}s does not match ${media.frameCount} frames at ${media.fps}fps`);
    }
  } else {
    if (media.frameCount !== shot.numFrames) {
      throw new Error(`Canonical Fal MP4 must contain exactly ${shot.numFrames} frames; received ${media.frameCount}`);
    }
    if (Math.abs(media.durationSeconds - shot.durationSeconds) > Math.max(1 / shot.fps, 0.02)) {
      throw new Error(`Canonical Fal MP4 duration must be ${shot.durationSeconds}s; received ${media.durationSeconds}`);
    }
  }
  if (media.hasAudio) throw new Error("Fal MP4 unexpectedly contains audio; HyperFrames owns the soundtrack");
  return media;
}

async function probeVideo(file, shot, { raw = false } = {}) {
  const { stdout } = await execFileAsync("ffprobe", ["-v", "error", "-count_frames", "-show_streams", "-show_format", "-of", "json", file], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
  const probe = JSON.parse(stdout);
  const video = probe.streams?.find((stream) => stream.codec_type === "video");
  const audio = probe.streams?.find((stream) => stream.codec_type === "audio");
  if (!video) throw new Error("Downloaded Fal MP4 has no video stream");
  const durationSeconds = Number(probe.format?.duration ?? video.duration);
  const fps = parseFrameRate(video.avg_frame_rate ?? video.r_frame_rate);
  const frameCount = Number(video.nb_read_frames ?? video.nb_frames);
  return validateVideoProbe({ codec: video.codec_name, width: video.width, height: video.height, fps, durationSeconds, frameCount, hasAudio: Boolean(audio) }, shot, { raw });
}

const LONGCAT_704_SPATIAL_FILTER = "scale=-2:720:flags=lanczos,crop=1280:720:(iw-ow)/2:(ih-oh)/2";

export function buildFalNormalizationSpec(rawMedia, shot) {
  const spatialApplied = rawMedia.height === 704;
  const temporalApplied = rawMedia.frameCount !== shot.numFrames
    || Math.abs(rawMedia.durationSeconds - shot.durationSeconds) > Math.max(1 / shot.fps, 0.02);
  const filters = [];
  if (spatialApplied) filters.push(LONGCAT_704_SPATIAL_FILTER);

  const durationRatio = shot.durationSeconds / rawMedia.durationSeconds;
  const ptsRatio = temporalApplied
    ? (shot.numFrames - 1) / (rawMedia.frameCount - 1)
    : 1;
  if (temporalApplied) {
    filters.push(
      `setpts=((${shot.numFrames}-1)/(${rawMedia.frameCount}-1))*PTS`,
      `fps=${shot.fps}:round=near:eof_action=pass`,
      `trim=end_frame=${shot.numFrames}`,
      `setpts=N/(${shot.fps}*TB)`,
    );
  }
  filters.push("format=yuv420p");

  return {
    filter: filters.join(","),
    spatial: {
      applied: spatialApplied,
      method: spatialApplied ? "centered-cover-crop" : "none",
      source: { width: rawMedia.width, height: rawMedia.height },
      target: { width: 1280, height: 720 },
    },
    temporal: {
      applied: temporalApplied,
      method: temporalApplied ? "full-clip-uniform-retime" : "none",
      sourceFrameCount: rawMedia.frameCount,
      sourceDurationSeconds: rawMedia.durationSeconds,
      targetFrameCount: shot.numFrames,
      targetDurationSeconds: shot.durationSeconds,
      durationRatio,
      ptsRatio,
      speedMultiplier: temporalApplied ? 1 / ptsRatio : 1,
      endpointPolicy: temporalApplied ? "first-and-last-frame-time-aligned" : "unchanged",
    },
  };
}

export function buildFalNormalizationArgs(input, output, rawMedia, shot) {
  const spec = buildFalNormalizationSpec(rawMedia, shot);
  return [
    "-v", "error", "-nostdin", "-y", "-i", input,
    "-map", "0:v:0", "-an",
    "-map_metadata", "-1",
    "-vf", spec.filter,
    "-c:v", "libx264", "-preset", "medium", "-crf", "18",
    "-pix_fmt", "yuv420p", "-r", String(shot.fps), "-fps_mode", "cfr",
    "-frames:v", String(shot.numFrames),
    "-movflags", "+faststart", output,
  ];
}

export async function stageCanonicalVideo(project, output, bytes, shot) {
  await assertSafeProjectWritePath(project, output, "Canonical generated video");
  await fs.mkdir(path.dirname(output), { recursive: true });
  await assertSafeProjectWritePath(project, output, "Canonical generated video");
  const token = crypto.randomUUID();
  const rawTemporary = path.join(path.dirname(output), `.${path.basename(output, ".mp4")}.${token}.raw.mp4`);
  const normalizedTemporary = path.join(path.dirname(output), `.${path.basename(output, ".mp4")}.${token}.part.mp4`);
  await assertSafeProjectWritePath(project, rawTemporary, "Raw Fal video staging file");
  await assertSafeProjectWritePath(project, normalizedTemporary, "Canonical video staging file");
  await fs.writeFile(rawTemporary, bytes);
  try {
    const rawMedia = await probeVideo(rawTemporary, shot, { raw: true });
    const normalizationSpec = buildFalNormalizationSpec(rawMedia, shot);
    const normalizationRequired = normalizationSpec.spatial.applied || normalizationSpec.temporal.applied;
    let temporary = rawTemporary;
    const normalization = {
      applied: normalizationRequired,
      reason: normalizationRequired ? "provider-output-normalized-to-plan" : "source-already-canonical",
      ...normalizationSpec,
      filter: normalizationRequired ? normalizationSpec.filter : null,
      codec: normalizationRequired ? "libx264" : "source-h264-preserved",
      crf: normalizationRequired ? 18 : null,
      preset: normalizationRequired ? "medium" : null,
      audio: "absent",
    };
    if (normalizationRequired) {
      await execFileAsync("ffmpeg", buildFalNormalizationArgs(rawTemporary, normalizedTemporary, rawMedia, shot), { maxBuffer: 4 * 1024 * 1024, timeout: 180_000 });
      temporary = normalizedTemporary;
    }
    const canonicalMedia = await probeVideo(temporary, shot);
    const canonicalBytes = await fs.readFile(temporary);
    if (temporary === normalizedTemporary) await fs.unlink(rawTemporary);
    return {
      temporary,
      bytes: canonicalBytes,
      contentSha256: sha256(canonicalBytes),
      rawSha256: sha256(bytes),
      rawSizeBytes: bytes.length,
      media: { ...canonicalMedia, raw: rawMedia, normalization },
    };
  } catch (error) {
    await Promise.all([rawTemporary, normalizedTemporary].map((file) => fs.unlink(file).catch(() => undefined)));
    throw error;
  }
}

async function publishCanonicalVideo(project, output, staged) {
  await assertSafeProjectWritePath(project, output, "Canonical generated video");
  if (fsSync.existsSync(output)) {
    await assertSafeProjectReadFile(project, output, "Existing canonical generated video");
    const existing = await fs.readFile(output);
    if (sha256(existing) !== staged.contentSha256) {
      await fs.unlink(staged.temporary).catch(() => undefined);
      throw new Error(`${path.relative(project, output)} already exists with different canonical content`);
    }
    await fs.unlink(staged.temporary).catch(() => undefined);
    return;
  }
  await fs.rename(staged.temporary, output);
}

async function materializeCopies(project, canonical, copies) {
  await assertSafeProjectReadFile(project, canonical, "Canonical generated video");
  const bytes = await fs.readFile(canonical);
  const expectedHash = sha256(bytes);
  for (const copy of copies) {
    await assertSafeProjectWritePath(project, copy, "Generated-video copy");
    if (fsSync.existsSync(copy)) {
      await assertSafeProjectReadFile(project, copy, "Existing generated-video copy");
      const existing = await fs.readFile(copy);
      if (sha256(existing) !== expectedHash) throw new Error(`Video copy already exists with different content: ${copy}`);
      continue;
    }
    await fs.mkdir(path.dirname(copy), { recursive: true });
    await assertSafeProjectWritePath(project, copy, "Generated-video copy");
    const temporary = path.join(path.dirname(copy), `.${path.basename(copy, ".mp4")}.${crypto.randomUUID()}.part.mp4`);
    await fs.writeFile(temporary, bytes);
    await fs.rename(temporary, copy);
  }
}

export function buildBillingEstimate(shot, ledger) {
  const conservative = estimateVideoCost(shot, ledger.pricing);
  return {
    persistedPreflightEstimateUsd: ledger.estimatedCostUsd,
    persistedEstimatedBillableSeconds: ledger.billableSeconds,
    currentConservativeCeilingUsd: conservative.estimatedCostUsd,
    currentConservativeSeconds: conservative.billableSeconds,
    actualBillingUsd: null,
    status: "not-reconciled",
    basis: "provider-price-times-conservative-generated-seconds",
  };
}

export function buildManifestEntry({ shot, ledger, sourceSha256, contentSha256, rawSha256, result, media, sizeBytes, rawSizeBytes }) {
  const billingEstimate = buildBillingEstimate(shot, ledger);
  return {
    id: shot.id,
    asset: shot.output,
    kind: "generated-video",
    copies: shot.copies,
    source: shot.startFrame,
    sourceSha256,
    prompt: shot.prompt,
    promptSha256: sha256(shot.prompt),
    provider: "fal.ai",
    model: shot.model,
    requestId: ledger.requestId,
    seed: result.seed ?? shot.seed ?? null,
    estimatedCostUsd: ledger.estimatedCostUsd,
    billingEstimate,
    pricing: ledger.pricing,
    media: { ...media, sizeBytes },
    canonical: {
      sha256: contentSha256,
      sizeBytes,
      codec: media.codec,
      width: media.width,
      height: media.height,
      fps: media.fps,
      frameCount: media.frameCount,
      durationSeconds: media.durationSeconds,
      hasAudio: media.hasAudio,
    },
    rawDownload: {
      sha256: rawSha256,
      sizeBytes: rawSizeBytes,
      codec: media.raw.codec,
      width: media.raw.width,
      height: media.raw.height,
      fps: media.raw.fps,
      frameCount: media.raw.frameCount,
      durationSeconds: media.raw.durationSeconds,
      hasAudio: media.raw.hasAudio,
      remote: result.remote,
    },
    integrationFiles: shot.integrationFiles,
    sha256: contentSha256,
    reviewed: false,
    c2pa: { status: "unsigned" },
    generatedAt: new Date().toISOString(),
  };
}

const TRANSIENT_LEDGER_ERROR_FIELDS = ["lastError", "submissionError", "submissionUncertain", "submissionFailedAt"];

function clearTransientLedgerErrors(ledger) {
  const cleaned = { ...ledger };
  for (const field of TRANSIENT_LEDGER_ERROR_FIELDS) delete cleaned[field];
  return cleaned;
}

export function buildCompletedLedger({ shot, ledger, result, staged, now = new Date() }) {
  const completedAt = now.toISOString();
  return {
    ...clearTransientLedgerErrors(ledger),
    status: "completed",
    resultSeed: result.seed,
    rawSha256: staged.rawSha256,
    rawSizeBytes: staged.rawSizeBytes,
    raw: {
      sha256: staged.rawSha256,
      sizeBytes: staged.rawSizeBytes,
      ...staged.media.raw,
    },
    contentSha256: staged.contentSha256,
    canonicalSizeBytes: staged.bytes.length,
    canonical: {
      sha256: staged.contentSha256,
      sizeBytes: staged.bytes.length,
      codec: staged.media.codec,
      width: staged.media.width,
      height: staged.media.height,
      fps: staged.media.fps,
      frameCount: staged.media.frameCount,
      durationSeconds: staged.media.durationSeconds,
      hasAudio: staged.media.hasAudio,
    },
    billingEstimate: buildBillingEstimate(shot, ledger),
    media: staged.media,
    completedAt,
    updatedAt: completedAt,
  };
}

let manifestWriteQueue = Promise.resolve();

async function updateManifestNow(project, entry) {
  const manifestPath = path.join(project, "assets", "generated", "video", "manifest.json");
  await assertSafeProjectWritePath(project, manifestPath, "Generated-video manifest");
  if (fsSync.existsSync(manifestPath)) await assertSafeProjectReadFile(project, manifestPath, "Generated-video manifest");
  const manifest = await readJsonIfExists(manifestPath) ?? { schemaVersion: 1, generator: "fal-image-to-video", provider: "fal.ai", assets: [] };
  if (manifest.schemaVersion !== 1 || !Array.isArray(manifest.assets)) throw new Error("Generated-video manifest has an unsupported schema");
  manifest.generator = "fal-image-to-video";
  manifest.provider = "fal.ai";
  manifest.generatedAt = new Date().toISOString();
  manifest.assets = manifest.assets.filter((asset) => asset.id !== entry.id).concat(entry);
  await atomicWriteJson(project, manifestPath, manifest);
  return manifestPath;
}

async function updateManifest(project, entry) {
  const operation = manifestWriteQueue.then(() => updateManifestNow(project, entry));
  manifestWriteQueue = operation.catch(() => undefined);
  return operation;
}

async function validateCompletedManifest(project, context) {
  const manifestPath = path.join(project, "assets", "generated", "video", "manifest.json");
  await assertSafeProjectReadFile(project, manifestPath, "Generated-video manifest");
  const manifest = await readJsonIfExists(manifestPath);
  const entry = manifest?.assets?.find((asset) => asset.id === context.shot.id);
  if (!entry) throw new Error(`Completed Fal job is missing manifest entry ${context.shot.id}`);
  await assertSafeProjectReadFile(project, context.paths.output, "Canonical generated video");
  const bytes = await fs.readFile(context.paths.output);
  const contentSha256 = sha256(bytes);
  if (entry.provider !== "fal.ai" || entry.model !== context.shot.model || entry.asset !== context.shot.output || entry.sha256 !== contentSha256
    || (context.existing?.contentSha256 && context.existing.contentSha256 !== contentSha256)) {
    throw new Error(`Completed Fal manifest entry ${context.shot.id} does not match the verified local output`);
  }
  return manifestPath;
}

async function outputState(project, shot) {
  const output = safeAssetPath(project, shot.output, "assets/generated/video/");
  const copies = shot.copies.map((copy) => safeVideoCopyPath(project, copy));
  return { output, copies, ledgerPath: jobLedgerPath(project, shot.id) };
}

async function preflightShot(project, shot) {
  const firstFrame = safeAssetPath(project, shot.startFrame, "assets/generated/");
  await assertSafeProjectReadFile(project, firstFrame, "Opening frame");
  const stat = await fs.stat(firstFrame).catch(() => undefined);
  if (!stat?.isFile()) throw new Error(`Opening frame does not exist: ${path.relative(REPO_ROOT, firstFrame)}`);
  const extension = path.extname(firstFrame).toLowerCase();
  const mimeType = SUPPORTED_IMAGE_TYPES.get(extension);
  if (!mimeType) throw new Error(`Unsupported opening-frame image type: ${extension || "none"}`);
  const image = await probeInputImage(firstFrame);
  const sourceBytes = await fs.readFile(firstFrame);
  const sourceSha256 = sha256(sourceBytes);
  const fingerprint = shotFingerprint(shot, sourceSha256);
  const paths = await outputState(project, shot);
  await assertSafeProjectWritePath(project, paths.output, "Canonical generated video");
  for (const copy of paths.copies) await assertSafeProjectWritePath(project, copy, "Generated-video copy");
  await assertSafeProjectWritePath(project, paths.ledgerPath, "Fal job ledger");
  if (fsSync.existsSync(paths.ledgerPath)) await assertSafeProjectReadFile(project, paths.ledgerPath, "Fal job ledger");
  const activation = await preflightGeneratedVideoActivation(project, shot);
  const existing = await readJsonIfExists(paths.ledgerPath);
  let decision = resumeDecision(existing, fingerprint);
  let pricing;
  let cost;
  if (decision !== "submit") ({ pricing, cost } = validatePersistedCost(shot, existing));
  const context = { shot, firstFrame, sourceBytes, sourceSha256, fingerprint, paths, existing, decision, cost, pricing, image, mimeType, activation };
  if (decision === "resume" && fsSync.existsSync(paths.output)) {
    try {
      await assertSafeProjectReadFile(project, paths.output, "Existing canonical generated video");
      await probeVideo(paths.output, shot);
      await validateCompletedManifest(project, context);
      decision = "completed";
      context.decision = decision;
    } catch {
      // A partial local result is not trusted; the known request id remains resumable.
    }
  }
  if (decision === "submit" && activation.hasActive) {
    throw new Error(`Shot ${shot.id} has an active video slot but no completed local artifact; restore the inert placeholder before submitting`);
  }
  if (decision !== "completed" && !existing?.requestId) {
    for (const candidate of [paths.output, ...paths.copies]) {
      if (fsSync.existsSync(candidate)) throw new Error(`${path.relative(project, candidate)} already exists; choose a new output path instead of overwriting it`);
    }
  }
  return context;
}

export async function downloadFalVideo(url, fetchImpl = fetch, { timeoutMs = DOWNLOAD_TIMEOUT_MS } = {}) {
  const signal = AbortSignal.timeout(timeoutMs);
  try {
    const response = await fetchImpl(url, { headers: { Accept: "video/mp4,application/octet-stream" }, signal });
    if (!response.ok) {
      const error = new Error(`Fal video download failed (${response.status}); rerun the same shot to resume without resubmitting`);
      error.falStage = "download";
      throw error;
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    validateMp4Bytes(bytes, response.headers.get("content-type") ?? "");
    return bytes;
  } catch (error) {
    if (error?.falStage === "download") throw error;
    const timedOut = signal.aborted || error?.name === "TimeoutError" || error?.name === "AbortError";
    const wrapped = new Error(timedOut
      ? `Fal video download timed out after ${Math.ceil(timeoutMs / 1000)} seconds; rerun the same shot to resume without resubmitting`
      : "Fal video download failed; rerun the same shot to resume without resubmitting");
    wrapped.falStage = "download";
    throw wrapped;
  }
}

async function finalizeShot(project, context, ledger, client) {
  let rawResult;
  try {
    rawResult = await client.queue.result(context.shot.model, { requestId: ledger.requestId });
  } catch {
    const error = new Error("Fal result lookup failed; rerun the same shot to resume without resubmitting");
    error.falStage = "result";
    throw error;
  }
  const result = parseFalResult(rawResult);
  const rawBytes = await downloadFalVideo(result.url);
  const staged = await stageCanonicalVideo(project, context.paths.output, rawBytes, context.shot);
  await publishCanonicalVideo(project, context.paths.output, staged);
  await materializeCopies(project, context.paths.output, context.paths.copies);
  const entry = buildManifestEntry({
    shot: context.shot,
    ledger,
    sourceSha256: context.sourceSha256,
    contentSha256: staged.contentSha256,
    rawSha256: staged.rawSha256,
    result,
    media: staged.media,
    sizeBytes: staged.bytes.length,
    rawSizeBytes: staged.rawSizeBytes,
  });
  const manifestPath = await updateManifest(project, entry);
  const completed = buildCompletedLedger({ shot: context.shot, ledger, result, staged });
  await atomicWriteJson(project, context.paths.ledgerPath, completed);
  return { entry, manifestPath, ledger: completed };
}

async function prepareShotSubmission(project, context, client) {
  let ledger = context.existing;
  if (context.decision === "completed") {
    if (!fsSync.existsSync(context.paths.output)) throw new Error(`Completed Fal ledger exists but ${context.shot.output} is missing`);
    await probeVideo(context.paths.output, context.shot);
    await materializeCopies(project, context.paths.output, context.paths.copies);
    await validateCompletedManifest(project, context);
    if (TRANSIENT_LEDGER_ERROR_FIELDS.some((field) => Object.hasOwn(ledger, field))) {
      ledger = clearTransientLedgerErrors(ledger);
      await atomicWriteJson(project, context.paths.ledgerPath, ledger);
    }
    return { context, alreadyCompleted: true, ledger };
  }

  if (context.decision === "submit") {
    let imageUrl = ledger?.imageUrl;
    if (!imageUrl) {
      imageUrl = await client.storage.upload(new Blob([context.sourceBytes], { type: context.mimeType }), { lifecycle: { expiresIn: "1d" } });
    }
    ledger = {
      schemaVersion: 1,
      provider: "fal.ai",
      endpointId: context.shot.model,
      shotId: context.shot.id,
      status: "prepared",
      fingerprint: context.fingerprint,
      startFrame: context.shot.startFrame,
      sourceSha256: context.sourceSha256,
      output: context.shot.output,
      copies: context.shot.copies,
      promptSha256: sha256(context.shot.prompt),
      imageUrl,
      pricing: { ...context.pricing, checkedAt: new Date().toISOString() },
      billableSeconds: context.cost.billableSeconds,
      estimatedCostUsd: context.cost.estimatedCostUsd,
      requestedSeconds: context.cost.requestedSeconds,
      observedOutputSecondsFloor: context.cost.observedOutputSecondsFloor,
      actualBillingUsd: null,
      costEstimateBasis: context.cost.estimateBasis,
      createdAt: ledger?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await atomicWriteJson(project, context.paths.ledgerPath, ledger);
    const input = buildFalInput(context.shot, imageUrl);
    ledger = await submitFalJob({
      client,
      endpointId: context.shot.model,
      input,
      ledger,
      writeLedger: (next) => atomicWriteJson(project, context.paths.ledgerPath, next),
    });
  }

  return { context, alreadyCompleted: false, ledger };
}

async function completePreparedShot(project, prepared, client) {
  const { context } = prepared;
  let { ledger } = prepared;
  if (prepared.alreadyCompleted) {
    return { alreadyCompleted: true, output: context.paths.output, manifestPath: path.join(project, "assets", "generated", "video", "manifest.json"), ledger };
  }
  try {
    if (ledger.status !== "COMPLETED") {
      ledger = await pollFalJob({
        client,
        endpointId: context.shot.model,
        ledger,
        writeLedger: (next) => atomicWriteJson(project, context.paths.ledgerPath, next),
      });
    }
    return await finalizeShot(project, context, ledger, client);
  } catch (error) {
    const persisted = await readJsonIfExists(context.paths.ledgerPath) ?? ledger;
    const interrupted = {
      ...persisted,
      status: typeof error?.falStatus === "string"
        ? error.falStatus
        : (typeof error?.falStage === "string" ? `${error.falStage}-error` : "processing-error"),
      lastError: error instanceof Error ? error.message : String(error),
      updatedAt: new Date().toISOString(),
    };
    await atomicWriteJson(project, context.paths.ledgerPath, interrupted);
    throw error;
  }
}

export async function runFalVideo(options, project) {
  const planPath = path.join(project, "generated-video-plan.json");
  await assertSafeProjectReadFile(project, planPath, "Generated-video plan");
  const plan = await readJson(planPath);
  const shots = validateVideoPlan(plan, project);
  const selected = options.all ? shots : shots.filter((shot) => shot.id === options.shot);
  if (!selected.length) throw new Error(`Unknown shot id: ${options.shot}`);

  const contexts = [];
  for (const shot of selected) contexts.push(await preflightShot(project, shot));

  const needsSubmission = contexts.some((context) => context.decision === "submit");
  const needsRemoteResume = options.api && contexts.some((context) => context.decision === "resume");
  let credential;
  if (needsSubmission || needsRemoteResume) credential = await loadRepositoryFalCredential();

  if (needsSubmission) {
    const pricingByEndpoint = new Map();
    for (const context of contexts.filter((item) => item.decision === "submit")) {
      let pricing = pricingByEndpoint.get(context.shot.model);
      if (!pricing) {
        pricing = await fetchLivePricing(context.shot.model, credential.apiKey);
        pricingByEndpoint.set(context.shot.model, pricing);
      }
      const cost = estimateVideoCost(context.shot, pricing);
      if (!Number.isFinite(cost.estimatedCostUsd) || cost.estimatedCostUsd > context.shot.maxCostUsd) {
        throw new Error(`Estimated Fal cost $${cost.estimatedCostUsd.toFixed(4)} exceeds the $${context.shot.maxCostUsd.toFixed(2)} per-video limit`);
      }
      context.pricing = pricing;
      context.cost = cost;
    }
  }

  if (options.dryRun) {
    const conservativeTotal = Math.ceil(contexts.reduce((sum, context) => sum
      + (context.cost.conservativeCostCeilingUsd ?? context.cost.estimatedCostUsd), 0) * 1_000_000) / 1_000_000;
    const persistedEstimateTotal = Math.ceil(contexts.reduce((sum, context) => sum + context.cost.estimatedCostUsd, 0) * 1_000_000) / 1_000_000;
    console.log(JSON.stringify({
      project: path.relative(REPO_ROOT, project),
      provider: "fal.ai",
      wouldSubmit: false,
      shots: contexts.map((context) => ({
        id: context.shot.id,
        model: context.shot.model,
        startFrame: context.shot.startFrame,
        inputSize: context.image,
        output: context.shot.output,
        copies: context.shot.copies,
        numFrames: context.shot.numFrames,
        fps: context.shot.fps,
        durationSeconds: context.shot.durationSeconds,
        estimatedCostUsd: context.cost.estimatedCostUsd,
        conservativeCostCeilingUsd: context.cost.conservativeCostCeilingUsd ?? context.cost.estimatedCostUsd,
        actualBillingUsd: null,
        maxCostUsd: context.shot.maxCostUsd,
        execution: context.decision,
      })),
      persistedPreflightEstimateTotalUsd: persistedEstimateTotal,
      conservativeCostCeilingTotalUsd: conservativeTotal,
      actualBillingTotalUsd: null,
    }, null, 2));
    return;
  }

  const needsClient = contexts.some((context) => context.decision !== "completed");
  if (needsClient && !credential) credential = await loadRepositoryFalCredential();
  const client = needsClient ? createFalClient({ credentials: credential.apiKey }) : undefined;
  const prepared = [];
  for (const context of contexts) {
    const action = context.decision === "completed" ? "validating local completion" : (context.decision === "resume" ? "resuming" : "submitting");
    console.error(`[fal-video] ${action} ${context.shot.id}`);
    prepared.push(await prepareShotSubmission(project, context, client));
  }
  const settled = await Promise.allSettled(prepared.map((item) => completePreparedShot(project, item, client)));
  const failed = settled.filter((result) => result.status === "rejected");
  if (failed.length) {
    const reason = failed[0].reason instanceof Error ? failed[0].reason.message : "provider processing failed";
    throw new Error(`${failed.length} Fal video shot${failed.length === 1 ? "" : "s"} did not finalize; every known request remains resumable and no composition slots were activated. ${reason}`, { cause: failed[0].reason });
  }
  const results = settled.map((result) => result.value);
  const activatedFiles = await activateGeneratedVideos(project, contexts.map((context) => context.shot));
  const completed = results.map((result, index) => {
    const context = contexts[index];
    return {
      id: context.shot.id,
      output: path.relative(REPO_ROOT, context.paths.output),
      copies: context.paths.copies.map((copy) => path.relative(REPO_ROOT, copy)),
      requestId: result.ledger?.requestId ?? null,
      estimatedCostUsd: context.cost.estimatedCostUsd,
      conservativeCostCeilingUsd: context.cost.conservativeCostCeilingUsd ?? context.cost.estimatedCostUsd,
      actualBillingUsd: null,
      alreadyCompleted: Boolean(result.alreadyCompleted),
      activatedFiles: activatedFiles.get(context.shot.id),
    };
  });
  console.log(JSON.stringify({ ok: true, provider: "fal.ai", completed }, null, 2));
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const project = safeProjectPath(options.project);
  const lease = options.api ? await acquireProjectLease(project) : undefined;
  try {
    await runFalVideo(options, project);
  } finally {
    if (lease && !await lease.release()) {
      console.error(`[fal-video] lease ownership changed; retained ${path.relative(project, lease.lockPath)} for manual reconciliation`);
    }
  }
}

const isEntrypoint = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isEntrypoint) main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
