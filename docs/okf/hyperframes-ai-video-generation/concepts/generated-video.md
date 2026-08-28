---
type: Generated Media Contract
title: Fal image-to-video execution contract
description: Defines the explicit, cost-capped Fal path from a reviewed opening frame to verified local MP4s, safe composition activation, and fresh QA.
resource: /scripts/generate-fal-video.mjs
tags: [fal, image-to-video, generated-video, provenance, qa]
timestamp: 2026-08-27T17:57:38Z
---

# Purpose

Keep paid image-to-video generation explicit, resumable, and separate from normal Codex composition generation while ensuring HyperFrames consumes only verified local media.

# Source Of Truth

* [Fal generator](../../../../scripts/generate-fal-video.mjs)
* [Fal generator tests](../../../../scripts/generate-fal-video.test.mjs)
* [Generated-video plan schema](../../../../runner/project-contracts.ts)
* [Project README](../../../../README.md)

# Executable Plan

The canonical file is `videos/<slug>/generated-video-plan.json` with `schemaVersion: 1`. Fal execution requires:

* plan-level `provider: fal.ai`, a supported pinned model (`fal-ai/longcat-video/distilled/image-to-video/720p` or `fal-ai/pixverse/c1/image-to-video`), a per-shot `maxCostUsd` no greater than `$0.50`, and a unique non-empty `integrationFiles` allowlist;
* one or more uniquely identified shots with a detailed prompt, opening frame, local MP4 output, frame count, 30 fps, matching duration, `aspectRatio: 16:9`, and `audioPolicy: none`;
* no end frame, remote output path, or undeclared composition file; and
* optional `copies` only at project-local paths ending in `assets/generated/video/<file>.mp4`.

The opening frame must already exist under `assets/generated/`, use PNG, JPEG, or WebP, and be pre-normalized to 16:9. Executable LongCat shots use the calibrated profile of exactly 240 frames at 30 fps (eight seconds). PixVerse C1 shots use an integer duration from one to fifteen seconds, a matching `durationSeconds × 30` canonical frame count, 720p output, and disabled provider audio; acceptable raw frame rates are normalized back to 30 fps. Model-incompatible durations or frame counts are rejected before pricing or submission.

# Cost And Submission Gates

Dry run validates the selected shots and queries authenticated live pricing for any shot that would require a new submission, without uploading an opening frame or submitting a generation job. Known-request and completed shots instead validate their persisted pricing so they remain resumable offline:

```bash
npm run video:fal -- videos/<slug> --shot <shot-id> --dry-run
npm run video:fal -- videos/<slug> --all --dry-run
```

New submissions and remote request resumption read `FAL_AI_API_KEY` or `FAL_KEY` from the ignored repository `.env`; completed local shots need neither credential nor a fresh price lookup. The repository file is canonical, ambient-only credentials are rejected, and conflicting nonempty aliases fail closed. The key must never be printed or copied into plans, manifests, compositions, or OKF documentation.

Paid generation requires an explicit operator decision and the `--api` mode. The live estimate must remain within the plan’s per-shot cap; `--all` reports a batch total but does not create a separate total-batch spending cap. Batch submission is not a billing transaction: an earlier shot can already have a persisted paid request ID if a later submission or completion fails, so preserve the ledgers and resume instead of starting over.

```bash
npm run video:fal -- videos/<slug> --shot <shot-id> --api
npm run video:fal -- videos/<slug> --all --api
```

# Resumability And Outputs

* Each shot has a durable ledger at `assets/generated/video/jobs/<shot-id>.json`.
* A known request ID is resumed rather than submitted again. A `submitting` ledger without a request ID is ambiguous and must be reconciled in Fal request history before any retry.
* Existing output files are not overwritten. Changed persisted inputs require a new shot ID and a non-colliding output path rather than mutation of the old job.
* The downloaded result is accepted only after MP4-container and FFprobe checks confirm silent H.264 at the planned duration and frame rate, with raw dimensions of exactly 1280 by 720 or Fal's aligned 1280 by 704 variant. The aligned variant is deterministically center-crop normalized to canonical 1280 by 720 before hashing, copying, manifest publication, or composition activation; both raw and canonical provenance are recorded.
* The canonical clip, declared copies, and `assets/generated/video/manifest.json` use local project paths. Remote provider URLs are transport metadata and must never be composition sources.

# Composition Activation

Before submission, every file in `integrationFiles` must contain a valid empty `.generated-video-slot` for every selected shot. The inert slot names its shot ID, local video and poster paths, start, duration, and track. The reviewed poster remains visible while the slot is inert.

After every selected job has completed, its canonical MP4 and copies have been verified, and its manifest entry has been written, the generator stages the allowlisted HTML changes. It upgrades the inert slots to muted, `playsinline`, poster-backed HyperFrames video elements. If any selected output or slot fails validation, no selected slot is activated; successful media and ledgers may still remain available for a safe resume.

# Composition Derivatives

The canonical MP4 remains the verified provider output. When an approved clip must fill a longer scene, do not resubmit the provider request and do not rely on a runtime playback-rate workaround. Create a deterministic project-local composition derivative at the exact scene duration, using a compatible H.264/yuv420p/30-fps contract and seek-safe keyframes.

Record the derivative separately in `generated-video-plan.json` and `assets/generated/video/manifest.json`: source/output paths and hashes, dimensions, codec, frame rate/count, duration, transform, and purpose. Never rewrite the canonical provider facts to describe the derivative.

Inert slots remain poster-backed during pre-generation and failure recovery. After review, an explicitly full-scene video layer may remove its active poster/still fallback only when the derivative covers the whole scene and early/late frame extraction proves reliable decoding.

# Review Gate

Generated-video manifest entries begin with `reviewed: false`. Activation changes governed project sources, so any earlier QA report becomes stale. Before render, inspect the activated clips in preview, refresh snapshots/contact-sheet evidence, include reviewed generated-video provenance in a source-fresh `qa/report.json`, and rerun the strict transition check.

# Relationships

See [Visual asset policy](visual-assets.md), [Narration and voice](narration-and-voice.md), [HyperFrames composition](hyperframes-composition.md), [Preview and render gates](preview-and-render.md), and [End-to-end generation](../workflows/end-to-end-generation.md).
