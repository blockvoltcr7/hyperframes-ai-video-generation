#!/usr/bin/env node

import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { fileURLToPath, pathToFileURL } from "node:url";

const CODEX_HOME = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
const GENERATED_ROOT = path.join(CODEX_HOME, "generated_images");

function parseArgs(argv) {
  const options = { prompt: undefined, output: undefined, force: false };
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--prompt") options.prompt = argv[++index];
    else if (value === "--output") options.output = argv[++index];
    else if (value === "--force") options.force = true;
    else throw new Error(`Unknown or incomplete argument: ${value}`);
  }
  if (!options.prompt?.trim() || !options.output) throw new Error("Usage: node scripts/codex-image-generate.mjs --prompt <text> --output <file.png> [--force]");
  return options;
}

export function buildCodexImagePrompt(prompt) {
  return [
    "Use the built-in image generation tool to create exactly one image from the specification below.",
    "Do not substitute SVG, HTML, canvas, Python, or downloaded stock media.",
    "Do not ask questions. Generate the image, then end the task without commentary.",
    "",
    prompt.trim(),
  ].join("\n");
}

function featureEnabled() {
  const output = execFileSync("codex", ["features", "list"], { encoding: "utf8" });
  return /^image_generation\s+stable\s+true$/m.test(output);
}

function imageFiles(root) {
  if (!fsSync.existsSync(root)) return [];
  const files = [];
  for (const entry of fsSync.readdirSync(root, { withFileTypes: true })) {
    const absolute = path.join(root, entry.name);
    if (entry.isDirectory()) {
      for (const child of fsSync.readdirSync(absolute, { withFileTypes: true })) {
        if (!child.isFile() || !/\.(png|webp|jpe?g)$/i.test(child.name)) continue;
        const childPath = path.join(absolute, child.name);
        files.push({ path: childPath, mtimeMs: fsSync.statSync(childPath).mtimeMs });
      }
    } else if (entry.isFile() && /\.(png|webp|jpe?g)$/i.test(entry.name)) {
      files.push({ path: absolute, mtimeMs: fsSync.statSync(absolute).mtimeMs });
    }
  }
  return files;
}

export function findNewGeneratedImage(root, existingPaths, startedAt) {
  return imageFiles(root)
    .filter((item) => !existingPaths.has(item.path) && item.mtimeMs >= startedAt - 2000)
    .sort((a, b) => b.mtimeMs - a.mtimeMs)[0]?.path ?? null;
}

async function runCodex(prompt) {
  await new Promise((resolve, reject) => {
    const child = spawn("codex", ["exec", "-C", os.tmpdir(), "-s", "workspace-write", "--skip-git-repo-check", "--ephemeral", "--color", "never", "-"], {
      cwd: os.tmpdir(), env: process.env, shell: false, stdio: ["pipe", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => code === 0 ? resolve() : reject(new Error(stderr.trim().slice(-2000) || `codex exec exited ${code}`)));
    child.stdin.end(prompt);
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!featureEnabled()) throw new Error("Codex image_generation is not stable and enabled; choose images=off or use a documented fallback");
  const destination = path.resolve(options.output);
  if (fsSync.existsSync(destination) && !options.force) throw new Error(`${destination} already exists; pass --force to replace it deliberately`);
  const existingPaths = new Set(imageFiles(GENERATED_ROOT).map((item) => item.path));
  const startedAt = Date.now();
  await runCodex(buildCodexImagePrompt(options.prompt));
  const generated = findNewGeneratedImage(GENERATED_ROOT, existingPaths, startedAt);
  if (!generated) throw new Error(`Codex completed without a new image under ${GENERATED_ROOT}`);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.${process.pid}.tmp`;
  await fs.copyFile(generated, temporary);
  await fs.rename(temporary, destination);
  const stat = await fs.stat(destination);
  console.log(JSON.stringify({ ok: true, provider: "codex.image_generation", source: generated, output: destination, sizeBytes: stat.size }, null, 2));
}

const isEntrypoint = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isEntrypoint) main().catch((error) => { console.error(error instanceof Error ? error.message : String(error)); process.exitCode = 1; });
