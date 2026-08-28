---
type: Narration Contract
title: Provider narration and voice replacement
description: Defines safe local and hosted TTS generation, project-local Fish Audio replacement, timestamp-driven caption rebuilding, provenance, and audio QA.
resource: /videos/AGENTS.md
tags: [tts, fish-audio, narration, captions, provenance, qa]
timestamp: 2026-08-27T22:00:00Z
---

# Purpose

Allow narration engines or voices to change without breaking scene timing, captions, provenance, or the ability to recover the previous approved voice.

# Provider Routing

Use `$text-to-speech` for the narration workflow and read the selected provider skill before an API call. Kokoro and ElevenLabs use the repository scripts and the common narration/transcript contract. A generated project may carry a project-local Fish Audio generator when it needs independent per-scene WAVs and Fish native word timestamps.

Hosted provider credentials live only in the ignored repository `.env`. Fish generators may read `FISH_AUDIO_API_KEY` or `FISH_API_KEY`; they must not print either value or persist it in project JSON, logs, captions, manifests, or documentation.

# Project-local Fish Contract

A project using Fish Audio keeps these artifacts together:

* `audio_request.json`: canonical narration lines and provider selection;
* `fish-voice.json`: voice ID/title, model, prosody, encoded format, and sample rate;
* `scripts/generate-fish-voice.mjs`: explicit generation and commit behavior;
* `assets/voice-fish/*.wav`: normalized local composition assets; and
* `assets/voice-fish/generation.json`: provider endpoint, config identity, line text hashes, output hashes, durations, and native word timings.

The generator reuses a ledger item only when its text hash matches and its local file exists. It refuses to overwrite an existing line or reuse a ledger with a different voice/model. A voice or model change therefore requires a new or deliberately archived ledger/output directory.

# Generation And Commit

From the repository root, a project that implements this contract can generate all requested lines and commit them into the composition:

```bash
node videos/<slug>/scripts/generate-fish-voice.mjs --ids all --commit
```

The provider response is parsed for encoded audio and timestamp alignment. The temporary encoded file is converted with FFmpeg to local mono PCM WAV. Before commit, every narration duration must fit its owning scene. The commit atomically updates the project's audio metadata, engine/provider metadata, request metadata, and `<audio>` source/duration attributes.

# Caption Rebuild

Voice replacement invalidates the previous caption timing even when the script text is unchanged. Rebuild captions from the new `audio_meta.json`:

```bash
node .agents/skills/faceless-explainer/scripts/captions.mjs build \
  --storyboard videos/<slug>/STORYBOARD.md \
  --audio-meta videos/<slug>/audio_meta.json \
  --hyperframes videos/<slug> \
  --out videos/<slug>/caption_groups.json
```

The resulting `caption_groups.json` and `compositions/captions.html` must be treated as derived artifacts of the current voice timings, not as reusable data from the previous provider.

# Verification Gate

Before preview handoff:

1. Confirm every timeline `<audio>` path points to the provider-specific local WAV.
2. Probe every WAV for the expected PCM codec, mono channel layout, sample rate, and duration.
3. Recompute every WAV SHA-256 and compare it with the provider ledger.
4. Confirm engine metadata records the expected provider, voice, and model.
5. Inspect captions during playback, then run HyperFrames lint and the strict transition check.

Provider success or valid WAVs alone do not prove composition integration. Keep previous voice assets until timeline references, caption alignment, preview playback, and strict QA are approved.

# Relationships

See [Generation contract](generation-contract.md), [HyperFrames composition](hyperframes-composition.md), [Preview and render gates](preview-and-render.md), and [End-to-end generation](../workflows/end-to-end-generation.md).
