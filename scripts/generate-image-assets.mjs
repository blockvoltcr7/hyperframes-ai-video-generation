#!/usr/bin/env node

import crypto from "node:crypto";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ALLOWED_SIZES = new Set(["1024x1024", "1024x1536", "1536x1024", "auto"]);
const ALLOWED_BACKGROUNDS = new Set(["transparent", "opaque", "auto"]);
const ALLOWED_QUALITIES = new Set(["low", "medium", "high", "auto"]);
const ALLOWED_ROLES = new Set(["background", "cutout", "illustration", "texture", "plate"]);

export function parseArgs(argv) {
  const values = { project: undefined, asset: undefined, source: undefined, api: false, dryRun: false, force: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--dry-run") values.dryRun = true;
    else if (value === "--api") values.api = true;
    else if (value === "--force") values.force = true;
    else if (value === "--asset") values.asset = argv[++index];
    else if (value === "--source") values.source = argv[++index];
    else if (!value.startsWith("--") && !values.project) values.project = value;
    else throw new Error(`Unknown or incomplete argument: ${value}`);
  }
  if (!values.project) throw new Error("Usage: node scripts/generate-image-assets.mjs videos/<slug> [--dry-run | --api | --asset <id> --source <file>] [--force]");
  if (values.dryRun && values.api) throw new Error("Choose exactly one execution mode: --dry-run or --api");
  if (values.source && !values.asset) throw new Error("--source requires exactly one --asset id");
  if (values.source && values.api) throw new Error("Choose either --source or --api, not both");
  return values;
}

function loadRepoEnv() {
  const envPath = path.join(REPO_ROOT, ".env");
  if (fsSync.existsSync(envPath) && typeof process.loadEnvFile === "function") {
    process.loadEnvFile(envPath);
  }
}

function safeProjectPath(input) {
  const project = path.resolve(REPO_ROOT, input);
  const videosRoot = path.join(REPO_ROOT, "videos") + path.sep;
  if (!project.startsWith(videosRoot)) throw new Error("Project must be inside videos/");
  if (!fsSync.existsSync(project) || !fsSync.statSync(project).isDirectory()) throw new Error(`Project does not exist: ${input}`);
  // A symlinked videos/<slug> passes the string check above; resolve it like the Fal runner does.
  const realProject = fsSync.realpathSync(project);
  const realVideosRoot = fsSync.realpathSync(path.join(REPO_ROOT, "videos")) + path.sep;
  if (!realProject.startsWith(realVideosRoot)) throw new Error("Project resolves outside videos/");
  return realProject;
}

async function writeManifest(manifestPath, manifest) {
  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  const temporary = `${manifestPath}.${crypto.randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, `${JSON.stringify(manifest, null, 2)}\n`);
    await fs.rename(temporary, manifestPath);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => undefined);
    throw error;
  }
}

function outputFormat(output) {
  const extension = path.extname(output).toLowerCase();
  if (extension === ".png") return "png";
  if (extension === ".webp") return "webp";
  if (extension === ".jpg" || extension === ".jpeg") return "jpeg";
  throw new Error(`Unsupported generated image extension: ${extension || "none"}`);
}

function safeOutputPath(project, output) {
  if (path.isAbsolute(output)) throw new Error("Asset output must be project-relative");
  const normalized = output.split(path.sep).join("/");
  if (!normalized.startsWith("assets/generated/") || normalized.includes("../")) {
    throw new Error(`Asset output must stay under assets/generated/: ${output}`);
  }
  const absolute = path.resolve(project, output);
  if (!absolute.startsWith(path.join(project, "assets", "generated") + path.sep)) throw new Error(`Asset output escapes generated assets: ${output}`);
  return absolute;
}

export function validateAssetPlan(plan, project = "/repo/videos/example") {
  if (!plan || plan.version !== 1) throw new Error("asset-plan.json must use version 1");
  if (typeof plan.style_prompt !== "string" || plan.style_prompt.trim().length < 20) throw new Error("asset-plan.json needs a detailed style_prompt");
  if (!Array.isArray(plan.assets) || plan.assets.length === 0) throw new Error("asset-plan.json needs at least one asset");
  if (plan.assets.length > 8) throw new Error("A single plan may generate at most 8 assets");
  const ids = new Set();
  return plan.assets.map((asset) => {
    if (!asset || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(asset.id ?? "")) throw new Error(`Invalid asset id: ${asset?.id ?? "missing"}`);
    if (ids.has(asset.id)) throw new Error(`Duplicate asset id: ${asset.id}`);
    ids.add(asset.id);
    if (!ALLOWED_ROLES.has(asset.role)) throw new Error(`Invalid role for ${asset.id}: ${asset.role}`);
    if (typeof asset.prompt !== "string" || asset.prompt.trim().length < 20) throw new Error(`Asset ${asset.id} needs a detailed prompt`);
    if (!ALLOWED_SIZES.has(asset.size)) throw new Error(`Invalid size for ${asset.id}: ${asset.size}`);
    if (!ALLOWED_BACKGROUNDS.has(asset.background)) throw new Error(`Invalid background for ${asset.id}: ${asset.background}`);
    if (!ALLOWED_QUALITIES.has(asset.quality)) throw new Error(`Invalid quality for ${asset.id}: ${asset.quality}`);
    const format = outputFormat(asset.output);
    if (asset.background === "transparent" && !["png", "webp"].includes(format)) throw new Error(`Transparent asset ${asset.id} must use PNG or WebP`);
    safeOutputPath(project, asset.output);
    return { ...asset, format };
  });
}

export function buildImageRequest(plan, asset, model = "gpt-image-2") {
  if (model.startsWith("gpt-image-2") && asset.background === "transparent") {
    throw new Error(`GPT Image 2 does not provide transparent output for ${asset.id}; request an opaque image and use hyperframes remove-background afterward`);
  }
  const prompt = `${plan.style_prompt.trim()}\n\nAsset: ${asset.prompt.trim()}\n\nNo words, letters, logos, watermarks, UI labels, or factual charts.`;
  return { model, prompt, size: asset.size, quality: asset.quality, background: asset.background, output_format: asset.format, n: 1 };
}

function hash(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(file, "utf8"));
}

async function generate(request, apiKey) {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`OpenAI image generation failed (${response.status}): ${body.error?.message ?? "unknown error"}`);
  const encoded = body.data?.[0]?.b64_json;
  if (!encoded) throw new Error("OpenAI image response did not contain base64 image data");
  return Buffer.from(encoded, "base64");
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  loadRepoEnv();
  const project = safeProjectPath(options.project);
  const planPath = path.join(project, "asset-plan.json");
  const plan = await readJson(planPath);
  const assets = validateAssetPlan(plan, project).filter((asset) => !options.asset || asset.id === options.asset);
  if (options.asset && assets.length === 0) throw new Error(`Unknown asset id: ${options.asset}`);
  const model = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
  const requests = assets.map((asset) => ({ id: asset.id, output: asset.output, request: buildImageRequest(plan, asset, model) }));
  if (options.dryRun) {
    console.log(JSON.stringify({ project: path.relative(REPO_ROOT, project), requests }, null, 2));
    return;
  }

  const manifestPath = path.join(project, "assets", "generated", "manifest.json");
  const manifest = fsSync.existsSync(manifestPath) ? await readJson(manifestPath) : { version: 1, generator: "hyperframes-visual-assets", assets: [] };
  if (options.source) {
    const [{ id, output, request }] = requests;
    const source = path.resolve(options.source);
    if (!fsSync.existsSync(source) || !fsSync.statSync(source).isFile()) throw new Error(`Generated source does not exist: ${options.source}`);
    const destination = safeOutputPath(project, output);
    if (fsSync.existsSync(destination) && !options.force) throw new Error(`${output} already exists; pass --force to deliberately replace it`);
    const bytes = await fs.readFile(source);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    const temporary = `${destination}.${crypto.randomUUID()}.tmp`;
    await fs.writeFile(temporary, bytes);
    await fs.rename(temporary, destination);
    manifest.assets = manifest.assets.filter((item) => item.id !== id).concat({
      id,
      output,
      provider: "codex.image_generation",
      model: "gpt-image-2",
      size: request.size,
      background: "opaque",
      prompt_sha256: hash(request.prompt),
      content_sha256: hash(bytes),
      accepted_at: new Date().toISOString(),
    });
    await writeManifest(manifestPath, manifest);
    console.log(`[image-assets] accepted ${id} -> ${path.relative(REPO_ROOT, destination)}`);
    return;
  }

  if (!options.api) throw new Error("Choose --dry-run, import a Codex-generated file with --asset <id> --source <file>, or explicitly opt into API billing with --api");

  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY is required to generate images; run with --dry-run to validate the plan without spending credits");

  manifest.generator = "openai-images-api";
  for (const { id, output, request } of requests) {
    const destination = safeOutputPath(project, output);
    if (fsSync.existsSync(destination) && !options.force) {
      const recorded = manifest.assets.some((item) => item.id === id);
      console.log(`[image-assets] skip ${id}: ${output} already exists${recorded ? "" : " but is missing from manifest.json; rerun with --force to regenerate and record it"}`);
      continue;
    }
    console.log(`[image-assets] generating ${id} -> ${output}`);
    const bytes = await generate(request, process.env.OPENAI_API_KEY);
    await fs.mkdir(path.dirname(destination), { recursive: true });
    const temporary = `${destination}.${crypto.randomUUID()}.tmp`;
    await fs.writeFile(temporary, bytes);
    await fs.rename(temporary, destination);
    const entry = {
      id,
      output,
      model: request.model,
      size: request.size,
      quality: request.quality,
      background: request.background,
      output_format: request.output_format,
      prompt_sha256: hash(request.prompt),
      content_sha256: hash(bytes),
      generated_at: new Date().toISOString(),
    };
    manifest.assets = manifest.assets.filter((item) => item.id !== id).concat(entry);
    // Each billed image is recorded as soon as it lands. Writing the manifest only after the
    // whole batch meant a crash mid-batch left files on disk that a rerun would skip as
    // "already exists" without ever adding them to the manifest.
    await writeManifest(manifestPath, manifest);
  }
  await writeManifest(manifestPath, manifest);
  console.log(`[image-assets] manifest ${path.relative(REPO_ROOT, manifestPath)}`);
}

const isEntrypoint = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isEntrypoint) main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
