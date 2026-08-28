#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const lock = JSON.parse(await fs.readFile(path.join(root, "skills-lock.json"), "utf8"));
const failures = [];

async function filesUnder(skillRoot, directory = skillRoot, files = []) {
  for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await filesUnder(skillRoot, absolute, files);
    else files.push(absolute);
  }
  return files;
}

for (const [name, entry] of Object.entries(lock.skills)) {
  const skillRoot = path.join(root, ".agents", "skills", name);
  const stat = await fs.stat(skillRoot).catch(() => null);
  if (!stat?.isDirectory()) { failures.push(`${name}: locked skill directory is missing`); continue; }
  const files = (await filesUnder(skillRoot)).sort((a, b) => path.relative(skillRoot, a).localeCompare(path.relative(skillRoot, b)));
  const hash = crypto.createHash("sha256");
  for (const file of files) {
    hash.update(path.relative(skillRoot, file).split(path.sep).join("/"));
    hash.update(await fs.readFile(file));
  }
  const actual = hash.digest("hex");
  if (actual !== entry.computedHash) failures.push(`${name}: expected ${entry.computedHash}, got ${actual}`);
}

if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Verified ${Object.keys(lock.skills).length} project skill hashes.`);
}
