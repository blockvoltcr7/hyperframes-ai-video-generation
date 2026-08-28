#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const projectDir = resolve(scriptDir, "..");
const repoDir = resolve(projectDir, "../..");
const requestPath = join(projectDir, "audio_request.json");
const configPath = join(projectDir, "fish-voice.json");
const outputDir = join(projectDir, "assets", "voice-fish");
const ledgerPath = join(outputDir, "generation.json");
const endpoint = "https://api.fish.audio/v1/tts/stream/with-timestamp";

function parseEnv(path) {
  const env = {};
  if (!existsSync(path)) return env;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (!match) continue;
    let value = match[2].trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value;
  }
  return env;
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJsonAtomic(path, value) {
  const temporary = `${path}.tmp`;
  writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
  renameSync(temporary, path);
}

function round3(value) {
  return Number(value.toFixed(3));
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function parseIds(argv, available) {
  const index = argv.indexOf("--ids");
  if (index < 0 || !argv[index + 1] || argv[index + 1] === "all") return available;
  const wanted = argv[index + 1].split(",").map((id) => id.trim()).filter(Boolean);
  const unknown = wanted.filter((id) => !available.includes(id));
  if (unknown.length) throw new Error(`Unknown narration id(s): ${unknown.join(", ")}`);
  return wanted;
}

function parseSse(body) {
  const events = [];
  for (const block of body.split(/\r?\n\r?\n/)) {
    const data = block
      .split(/\r?\n/)
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (data) events.push(JSON.parse(data));
  }
  return events;
}

function globalWords(alignmentByChunk) {
  const words = [];
  for (const [chunkSeq, item] of [...alignmentByChunk.entries()].sort(([a], [b]) => a - b)) {
    const offset = Number(item.offset || 0);
    for (const segment of item.alignment?.segments || []) {
      const text = String(segment.text || "").trim();
      if (!text) continue;
      words.push({
        id: `w${words.length}`,
        text,
        start: round3(offset + Number(segment.start)),
        end: round3(offset + Number(segment.end)),
        chunk_seq: chunkSeq,
      });
    }
  }
  return words;
}

function durationSeconds(path) {
  return round3(
    Number(
      execFileSync(
        "ffprobe",
        ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", path],
        { encoding: "utf8" },
      ).trim(),
    ),
  );
}

function sceneDurations(indexHtml) {
  return [...indexHtml.matchAll(/class="scene"[^>]*data-composition-id="(\d\d)-[^"]+"[^>]*data-duration="([\d.]+)"/g)]
    .reduce((result, match) => ({ ...result, [match[1]]: Number(match[2]) }), {});
}

function commitProject(lines, generated, config) {
  if (generated.length !== lines.length) {
    throw new Error(`Commit requires all ${lines.length} narration files; found ${generated.length}.`);
  }

  const indexPath = join(projectDir, "index.html");
  let indexHtml = readFileSync(indexPath, "utf8");
  const allowedDurations = sceneDurations(indexHtml);
  for (const voice of generated) {
    const allowance = allowedDurations[voice.id];
    if (!allowance) throw new Error(`Could not resolve scene duration for ${voice.id}.`);
    if (voice.duration_s > allowance) {
      throw new Error(
        `Narration ${voice.id} is ${voice.duration_s}s but its scene is ${allowance}s. Increase speed or retime before commit.`,
      );
    }
  }

  const audioMetaPath = join(projectDir, "audio_meta.json");
  const audioMeta = readJson(audioMetaPath);
  audioMeta.voices = generated.map((voice, index) => ({
    frame: index + 1,
    path: voice.path,
    duration_s: voice.duration_s,
    words: voice.words.map(({ id: _id, chunk_seq: _chunkSeq, ...word }) => word),
  }));
  writeJsonAtomic(audioMetaPath, audioMeta);

  const engineMetaPath = join(projectDir, "audio_engine_meta.json");
  const engineMeta = readJson(engineMetaPath);
  engineMeta.tts_provider = "fish-audio";
  engineMeta.voice_id = config.voice_id;
  engineMeta.voice_title = config.voice_title;
  engineMeta.tts_model = config.model;
  engineMeta.voices = generated.map((voice) => ({
    id: voice.id,
    path: voice.path,
    duration_s: voice.duration_s,
    words: voice.words.map(({ chunk_seq: _chunkSeq, ...word }) => word),
  }));
  engineMeta.total_duration_s = round3(generated.reduce((sum, voice) => sum + voice.duration_s, 0));
  writeJsonAtomic(engineMetaPath, engineMeta);

  const request = readJson(requestPath);
  request.provider = "fish-audio";
  request.voice = config.voice_title;
  request.fish = { voice_id: config.voice_id, model: config.model };
  writeJsonAtomic(requestPath, request);

  for (const voice of generated) {
    const pattern = new RegExp(
      `(id="el-${voice.id}-[^"]+-voice"[^>]*src=")[^"]+("[^>]*data-duration=")[^"]+(")`,
    );
    if (!pattern.test(indexHtml)) throw new Error(`Could not find audio element ${voice.id} in index.html.`);
    indexHtml = indexHtml.replace(pattern, `$1${voice.path}$2${voice.duration_s}$3`);
  }
  const temporaryIndex = `${indexPath}.tmp`;
  writeFileSync(temporaryIndex, indexHtml);
  renameSync(temporaryIndex, indexPath);
}

async function generateLine(line, config, key) {
  const payload = {
    text: line.text,
    reference_id: config.voice_id,
    temperature: config.temperature,
    top_p: config.top_p,
    prosody: { speed: config.speed, volume: 0, normalize_loudness: true },
    chunk_length: 300,
    normalize: true,
    format: config.format,
    sample_rate: config.sample_rate,
    latency: config.latency,
    repetition_penalty: 1.2,
    condition_on_previous_chunks: true,
  };
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      model: config.model,
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const detail = (await response.text()).slice(0, 1000);
    throw new Error(`Fish Audio ${response.status}: ${detail}`);
  }

  const events = parseSse(await response.text());
  const audioChunks = [];
  const alignmentByChunk = new Map();
  for (const event of events) {
    if (event.audio_base64) audioChunks.push(Buffer.from(event.audio_base64, "base64"));
    if (event.alignment != null) {
      alignmentByChunk.set(Number(event.chunk_seq), {
        offset: Number(event.chunk_audio_offset_sec || 0),
        alignment: event.alignment,
      });
    }
  }
  if (!audioChunks.length) throw new Error(`Fish Audio returned no audio for ${line.id}.`);

  const encoded = Buffer.concat(audioChunks);
  const encodedPath = join(outputDir, `${line.id}.${config.format}`);
  const wavPath = join(outputDir, `${line.id}.wav`);
  writeFileSync(encodedPath, encoded);
  try {
    execFileSync(
      "ffmpeg",
      ["-hide_banner", "-loglevel", "error", "-y", "-i", encodedPath, "-ac", "1", "-ar", "44100", "-c:a", "pcm_s16le", wavPath],
      { stdio: "inherit" },
    );
  } finally {
    if (existsSync(encodedPath)) unlinkSync(encodedPath);
  }

  const wav = readFileSync(wavPath);
  const words = globalWords(alignmentByChunk);
  if (!words.length) throw new Error(`Fish Audio returned no timestamp alignment for ${line.id}.`);
  return {
    id: line.id,
    text_sha256: sha256(Buffer.from(line.text)),
    path: `assets/voice-fish/${line.id}.wav`,
    duration_s: durationSeconds(wavPath),
    sha256: sha256(wav),
    words,
  };
}

async function main() {
  const argv = process.argv.slice(2);
  const shouldCommit = argv.includes("--commit");
  const env = { ...parseEnv(join(repoDir, ".env")), ...process.env };
  const key = env.FISH_AUDIO_API_KEY || env.FISH_API_KEY;
  if (!key) throw new Error("Set FISH_AUDIO_API_KEY or FISH_API_KEY in the repository .env file.");

  const request = readJson(requestPath);
  const config = readJson(configPath);
  const lines = request.lines;
  const ids = parseIds(argv, lines.map((line) => line.id));
  mkdirSync(outputDir, { recursive: true });

  const ledger = existsSync(ledgerPath)
    ? readJson(ledgerPath)
    : {
        provider: "fish-audio",
        endpoint,
        voice_id: config.voice_id,
        voice_title: config.voice_title,
        model: config.model,
        config_sha256: sha256(Buffer.from(JSON.stringify(config))),
        items: [],
      };
  if (ledger.voice_id !== config.voice_id || ledger.model !== config.model) {
    throw new Error("Existing Fish ledger uses a different voice or model; move it aside before regenerating.");
  }

  for (const id of ids) {
    const line = lines.find((item) => item.id === id);
    const textHash = sha256(Buffer.from(line.text));
    const existing = ledger.items.find((item) => item.id === id);
    const existingPath = join(projectDir, existing?.path || "");
    if (existing && existing.text_sha256 === textHash && existsSync(existingPath)) {
      console.log(`reuse ${id}: ${existing.path} (${existing.duration_s}s)`);
      continue;
    }
    if (existing || existsSync(join(outputDir, `${id}.wav`))) {
      throw new Error(`Refusing to overwrite Fish narration ${id}; remove or archive its ledger entry and file first.`);
    }
    console.log(`generate ${id}: ${config.voice_title}`);
    const item = await generateLine(line, config, key);
    ledger.items.push(item);
    ledger.items.sort((a, b) => a.id.localeCompare(b.id));
    writeJsonAtomic(ledgerPath, ledger);
    console.log(`saved ${id}: ${item.path} (${item.duration_s}s, ${item.words.length} words)`);
  }

  if (shouldCommit) {
    const generated = lines.map((line) => ledger.items.find((item) => item.id === line.id)).filter(Boolean);
    commitProject(lines, generated, config);
    console.log(`committed ${generated.length} Fish narration tracks to the HyperFrames project`);
  }
}

main().catch((error) => {
  console.error(`fish voice generation failed: ${error.message}`);
  process.exitCode = 1;
});
