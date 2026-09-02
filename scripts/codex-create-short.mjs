#!/usr/bin/env node

import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import policy from "../runner/generation-policy.json" with { type: "json" };

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ALLOWED_TEMPLATES = new Set(policy.templates);
const ALLOWED_WORKFLOWS = new Set(policy.workflows);
const ALLOWED_IMAGE_MODES = new Set(policy.imageModes);

export function readArgs(argv) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const key = argv[index];
    const value = argv[index + 1];
    if (!key?.startsWith("--") || value === undefined) {
      throw new Error("Usage: node scripts/codex-create-short.mjs --workflow <adaptive|template> --template <classic|archon|anthropic> --images <off|auto|required> --topic <topic>");
    }
    values.set(key.slice(2), value);
  }
  return values;
}

export function parseTopic(raw) {
  const durationPatterns = [
    /\bduration\s*[:=]?\s*(\d{1,3})\s*(?:s|sec|seconds?)?\b/i,
    /\b(\d{1,3})\s*-?\s*seconds?\b/i,
    /\b(\d{1,3})\s*s\b/i,
  ];
  let duration = 30;
  let durationPhrase;
  for (const pattern of durationPatterns) {
    const match = raw.match(pattern);
    if (match) {
      duration = Number.parseInt(match[1], 10);
      durationPhrase = match[0];
      break;
    }
  }
  if (duration < 10 || duration > 300) throw new Error(`Duration ${duration}s is outside the supported 10-300s range`);

  const topic = (durationPhrase ? raw.replace(durationPhrase, " ") : raw).replace(/\s+/g, " ").trim();
  const stopwords = new Set(["the", "a", "an", "of", "for", "to", "with", "about", "on", "in", "and", "or", "is", "are", "from", "as", "by", "at"]);
  const slug = topic.toLowerCase().replace(/[^a-z0-9\s-]/g, " ").split(/\s+/).filter((word) => word && !stopwords.has(word)).slice(0, 6).join("-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  if (!slug) throw new Error("Could not derive a project slug from the topic");
  return { topic, slug, duration };
}

function preflight(workflow, template, slug) {
  const templatePath = path.join(REPO_ROOT, "templates", "shorts", template);
  const outputPath = path.join(REPO_ROOT, "videos", slug);
  const skillName = workflow === "adaptive" ? "faceless-explainer" : "diy-yt-creator";
  const skillPath = path.join(REPO_ROOT, ".agents", "skills", skillName, "SKILL.md");
  if (workflow === "template" && !fs.existsSync(templatePath)) throw new Error(`Template does not exist: templates/shorts/${template}`);
  if (!fs.existsSync(skillPath)) throw new Error(`Codex project skill is missing: .agents/skills/${skillName}/SKILL.md`);
  if (fs.existsSync(outputPath)) throw new Error(`videos/${slug} already exists; choose a different topic or remove it explicitly`);
  const release = JSON.parse(execFileSync("npx", ["--no-install", "hyperframes", "upgrade", "--check", "--json"], { cwd: REPO_ROOT, encoding: "utf8" }));
  if (release.updateAvailable) throw new Error(`HyperFrames ${release.current} is stale; update to ${release.latest} before generation`);
  const skills = JSON.parse(execFileSync("npx", ["--no-install", "hyperframes", "skills", "check", "--dir", ".agents/skills", "--json"], { cwd: REPO_ROOT, encoding: "utf8" }));
  if (skills.summary?.outdated || skills.summary?.coreMissing || skills.summary?.missing) throw new Error("Project HyperFrames skills are missing or stale; update them before generation");
}

export function main(argv = process.argv.slice(2)) {
try {
  const values = readArgs(argv);
  const workflow = values.get("workflow") ?? policy.defaults.workflow;
  const template = values.get("template") ?? policy.defaults.template;
  const images = values.get("images") ?? policy.defaults.images;
  const rawTopic = values.get("topic")?.trim();
  if (!ALLOWED_WORKFLOWS.has(workflow)) throw new Error(`Generation workflow is not enabled: ${workflow}`);
  if (!ALLOWED_TEMPLATES.has(template)) throw new Error(`Template is not enabled: ${template}`);
  if (!ALLOWED_IMAGE_MODES.has(images)) throw new Error(`Image policy is not enabled: ${images}`);
  if (!rawTopic) throw new Error("A topic is required");

  const parsed = parseTopic(rawTopic);
  preflight(workflow, template, parsed.slug);
  const imagePolicy = images === "off"
    ? "Image policy: off. Do not generate images; use native HTML/SVG, verified source media, or registry items."
    : images === "required"
      ? "Image policy: required. Invoke $hyperframes-visual-assets and use Codex image generation for at least one story-justified original asset; preserve its provenance and fail the generation if no acceptable asset can be produced."
      : "Image policy: auto. Invoke $hyperframes-visual-assets when an original image materially improves a scene; otherwise prefer native HTML/SVG or registry visuals. Image failure must degrade to a documented fallback.";
  const prompt = workflow === "adaptive" ? [
    "$faceless-explainer",
    "Create one autonomous 9:16 faceless explainer for YouTube Shorts using the project-scoped HyperFrames workflow.",
    `Topic: ${parsed.topic}`,
    `Target duration: ${parsed.duration} seconds.`,
    `Expected output folder: videos/${parsed.slug}.`,
    imagePolicy,
    "Use variable scene count, narration captions, information-bearing visual beats, transitions, snapshot/contact-sheet QA, and the official HyperFrames domain skills.",
    "This is a Short: use narration plus sparse transition SFX only; do not add background music.",
    "Create workflow-run.json (schemaVersion 1) with a resumable node ledger, delivery profile, locale list, provider/model/cost metadata when known, input/output hashes, attempts, and approval states.",
    "Create qa/report.json (schemaVersion 1) only after lint, strict transition checks, snapshots, contact-sheet review, audio/caption review, and provenance review pass. Its sourceDigest must match the governed project files.",
    "Do not modify or self-update .agents/skills during this job; the launcher already verified the immutable project skill set.",
    "Work autonomously through the workflow, but stop after checks, snapshots, and a reachable preview. Do not render, commit, or push.",
    "Follow the repository AGENTS.md and every selected skill completely. Repository instructions override any workflow step that would auto-render.",
  ].join("\n") : [
    "$diy-yt-creator",
    `Create one ${template} YouTube Short using .agents/skills/diy-yt-creator/new-${template}-short.md.`,
    `Topic: ${parsed.topic}`,
    `Target duration: ${parsed.duration} seconds.`,
    `Expected output folder: videos/${parsed.slug}.`,
    imagePolicy,
    "Work autonomously through research, script, visual planning, TTS, timing, composition, visual QA, strict check, and preview.",
    "Invoke $hyperframes-registry before hand-building reusable visuals.",
    "Create workflow-run.json and qa/report.json using the repository project contract. The report must be source-fresh and backed by strict transition checks and reviewed contact-sheet evidence.",
    "Do not modify or self-update .agents/skills during this job; the launcher already verified the immutable project skill set.",
    "Follow the repository AGENTS.md and every selected skill completely.",
    "Do not render, commit, push, or modify the source template.",
  ].join("\n");

  console.log(`[codex-generation] workflow=${workflow} template=${template} images=${images} slug=${parsed.slug} duration=${parsed.duration}s`);
  const childEnv = { ...process.env, HYPERFRAMES_NO_TELEMETRY: process.env.HYPERFRAMES_NO_TELEMETRY ?? "1", HYPERFRAMES_SKIP_SKILLS: "1" };
  const child = spawn("codex", ["exec", "-C", REPO_ROOT, "-s", "danger-full-access", "--color", "never", prompt], { cwd: REPO_ROOT, env: childEnv, stdio: "inherit", shell: false });
  for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
  child.on("error", (error) => { console.error(`[codex-generation] ${error.message}`); process.exitCode = 1; });
  child.on("close", (code, signal) => {
    if (signal) console.error(`[codex-generation] stopped by ${signal}`);
    if (code !== 0) { process.exitCode = code ?? 1; return; }
    const validation = spawn("npx", ["tsx", "scripts/validate-video-project.ts", `videos/${parsed.slug}`], { cwd: REPO_ROOT, env: childEnv, stdio: "inherit", shell: false });
    validation.on("error", (error) => { console.error(`[codex-generation] postcondition failed: ${error.message}`); process.exitCode = 1; });
    validation.on("close", (validationCode) => { process.exitCode = validationCode ?? 1; });
  });
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
}
}

if (path.resolve(process.argv[1] ?? "") === fileURLToPath(import.meta.url)) main();
