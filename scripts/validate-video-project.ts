#!/usr/bin/env node
import path from "node:path";
import process from "node:process";
import { assertProjectReady, readProjectContract } from "../runner/project-contracts.js";
import { REPO_ROOT, resolveRepoPath } from "../runner/paths.js";

const args = process.argv.slice(2);
const requireReview = args.includes("--require-review");

function fail(error: unknown, extra: Record<string, unknown> = {}) {
  console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error), ...extra }, null, 2));
  process.exitCode = 1;
}

let projectDir: string;
try {
  const projectArg = args.find((arg) => !arg.startsWith("--"));
  if (!projectArg) throw new Error("Usage: npm run project:validate -- videos/<slug> [--require-review]");
  projectDir = resolveRepoPath(projectArg);
  if (path.dirname(projectDir) !== path.join(REPO_ROOT, "videos")) throw new Error("Project must be an immediate child of videos/");
} catch (error) {
  // Usage errors follow the same JSON contract as validation failures so callers
  // (including the Codex launcher's postcondition step) never see a raw stack trace.
  fail(error);
  process.exit(1);
}

try {
  const result = await assertProjectReady(projectDir, { requireReview });
  console.log(JSON.stringify({ ok: true, workflow: result.manifest.workflow, sourceDigest: result.digest, qaStatus: result.qa?.status }, null, 2));
} catch (error) {
  const diagnostic = await readProjectContract(projectDir).catch(() => undefined);
  fail(error, { workflow: diagnostic?.manifest.workflow, sourceDigest: diagnostic?.digest });
}
