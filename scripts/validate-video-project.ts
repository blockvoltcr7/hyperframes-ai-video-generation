#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { assertProjectReady, readProjectContract } from "../runner/project-contracts.js";
import { REPO_ROOT, resolveRepoPath } from "../runner/paths.js";

const args = process.argv.slice(2);
const projectArg = args.find((arg) => !arg.startsWith("--"));
if (!projectArg) throw new Error("Usage: npm run project:validate -- videos/<slug> [--require-review]");
const projectDir = resolveRepoPath(projectArg);
if (path.dirname(projectDir) !== path.join(REPO_ROOT, "videos")) throw new Error("Project must be an immediate child of videos/");

const requireReview = args.includes("--require-review");
try {
  const result = await assertProjectReady(projectDir, { requireReview });
  console.log(JSON.stringify({ ok: true, workflow: result.manifest.workflow, sourceDigest: result.digest, qaStatus: result.qa?.status }, null, 2));
} catch (error) {
  const diagnostic = await readProjectContract(projectDir).catch(() => undefined);
  console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error), workflow: diagnostic?.manifest.workflow, sourceDigest: diagnostic?.digest }, null, 2));
  process.exitCode = 1;
}
