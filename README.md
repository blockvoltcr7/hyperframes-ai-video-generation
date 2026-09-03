# HyperFrames AI Video Generation

A Codex-native workspace for turning a topic into a previewable vertical video. Codex uses project-scoped skills to research the topic, write narration, generate aligned TTS, fill a HyperFrames composition, validate it, and open a local preview.

The active stack is:

- **Codex CLI** for agentic generation.
- **Project skills** under `.agents/skills/` for video, TTS, and visual guidance.
- **HyperFrames** for HTML/GSAP composition, validation, preview, and render.
- **Kokoro**, **ElevenLabs**, or project-local **Fish Audio** for narration with word-level timestamps.
- **Framehouse Studio** for the local project catalog, generation controls, preflight, preview, and render jobs.
- **Codex image generation** plus a reviewable asset-plan/provenance layer for original illustrations when they materially improve the story.
- **fal.ai image-to-video** for explicitly approved, cost-capped motion clips that become local HyperFrames media.

Project knowledge is also maintained as an [Open Knowledge Format bundle](docs/okf/hyperframes-ai-video-generation/index.md). Validate it with `npm run docs:validate:okf` after changing runtime, workflow, asset, or operator behavior.

Archon and Claude are not runtime dependencies. The `archon` and `anthropic` template names remain available only as visual/content presets.

## Quick start

Prerequisites:

- Node.js 22+
- Python 3.10+
- FFmpeg
- Codex CLI, authenticated for `codex exec`
- `espeak-ng` and the Kokoro Python packages for local TTS, or credentials for ElevenLabs/Fish Audio

Install project dependencies:

```bash
npm install
python -m venv .venv
source .venv/bin/activate
pip install python-dotenv kokoro soundfile numpy
```

Copy the environment template and configure only the media providers you use:

```bash
cp .env.example .env
```

The Python scripts read the repository `.env`. Do not commit it.

Create a short directly:

```bash
npm run create:short -- --workflow adaptive --template classic --topic "What is RAG?"
```

Optional duration phrases are parsed from the topic:

```bash
npm run create:short -- --workflow adaptive --template classic --topic "duration 45s, Kubernetes operators"
```

Omitting `--workflow` now defaults to `adaptive` (`$faceless-explainer`). Pass `--workflow template` for the legacy four-phase `$diy-yt-creator` playbooks.

Available templates:

| Template | Purpose |
|---|---|
| `classic` | Brand-neutral dark editorial system; the default |
| `archon` | Existing cyan/magenta Archon-branded visual preset |
| `anthropic` | Existing warm orange/cream Anthropic-branded visual preset |

The launcher validates the workflow, template, image policy, duration, project slug, project skill, and output collision before running `codex exec`.

- `--workflow adaptive` invokes the current `$faceless-explainer` workflow: variable scenes, storyboard-driven motion, narration captions, registry/media routing, frame workers, and snapshot/contact-sheet QA.
- `--workflow template` invokes the existing `$diy-yt-creator` four-phase playbooks.
- `--images off|auto|required` controls whether original Codex-generated imagery is prohibited, selectively allowed with a fallback, or required as a completion gate.

CLI example:

```bash
npm run create:short -- --workflow adaptive --images auto --template classic --topic "How vector databases power semantic search, duration 45s"
```

For image asset plans, validate the canonical requests without generating anything:

```bash
npm run assets:generate -- videos/<slug> --dry-run
```

Codex generation uses the project-scoped `$media-use` and `$hyperframes-visual-assets` skills. API-key generation is a separate explicit path (`--api`) and is never selected automatically.

For a fal.ai image-to-video plan, validate every selected shot and the current live price without submitting a billable request:

```bash
npm run video:fal -- videos/<slug> --shot <shot-id> --dry-run
npm run video:fal -- videos/<slug> --all --dry-run
```

The canonical `generated-video-plan.json` keeps creative intent and execution settings together. Two executable profiles are supported. `fal-ai/longcat-video/distilled/image-to-video/720p` remains the calibrated legacy profile: a pre-normalized 16:9 opening frame, exactly 240 frames at 30 fps for an eight-second silent H.264 clip. `fal-ai/pixverse/c1/image-to-video` supports a pre-normalized 16:9 opening frame and an integer duration from one to fifteen seconds; the plan expresses the corresponding `durationSeconds × 30` canonical frame count, requests 720p with provider audio disabled, and normalizes acceptable provider frame rates back to 30 fps. Both profiles publish a provider-neutral local output under `assets/generated/video/`. A shot may also declare `copies` under nested project-local `assets/generated/video/` directories so a deck and its linear-video companion can reuse the same paid generation. The plan must explicitly allowlist its HyperFrames composition files with `integrationFiles`, such as `["index.html", "video/index.html"]`; the generator never scans or rewrites arbitrary HTML.

New submissions and remote request resumption require `FAL_AI_API_KEY` (or the SDK-compatible `FAL_KEY`) in the ignored repository `.env` file. The repository file is canonical: conflicting nonempty repository/ambient Fal aliases fail closed without printing their values, and ambient-only credentials are rejected. A fully downloaded completed shot can be validated, mirrored, and activated offline without credentials or a fresh price lookup. Paid submission additionally requires the explicit `--api` flag:

```bash
npm run video:fal -- videos/<slug> --shot <shot-id> --api
npm run video:fal -- videos/<slug> --all --api
```

Before submission, the generator queries Fal's live pricing API and refuses missing, malformed, non-USD, unfamiliar-unit, or above-cap pricing. LongCat estimates conservatively price the greater of requested frames and its observed 506-frame output floor; PixVerse C1 estimates use the requested duration because its published unit is seconds. Persisted historical estimates remain resume metadata, never a claim about actual billing. The `$0.50` ceiling applies per shot, `actualBillingUsd` stays `null` until authoritative usage is reconciled, and `--all` reports the conservative batch ceiling separately. The runner writes a durable per-shot job ledger before polling, resumes known request IDs using persisted pricing instead of billing twice, and bounds each CDN body download at three minutes. Raw media must be silent H.264 and exactly 1280×720 or the documented aligned 1280×704 variant. LongCat requires 30 fps; PixVerse C1 accepts 12–60 fps within its duration tolerance before deterministic normalization to the plan's 30 fps contract. The runner counts every raw frame, preserves the full temporal span with an endpoint-aligned uniform retime, and center-crop normalizes 704-line media to verified 1280×720 before canonical hashing, copies, and publication. Raw and canonical hashes, dimensions, frame counts, durations, and normalization parameters are recorded in both the manifest and completion ledger. The overall clip/copy/manifest sequence is resumable rather than transactionally atomic. An interrupted `submitting` state without a request ID is saved in sanitized form and deliberately will not be resubmitted automatically; reconcile it in Fal request history first.

Paid runs hold an exclusive project lease from preflight through download, manifest publication, and slot activation. Locks are never stolen based on age, output/copy destinations are globally collision-checked with conservative case/Unicode normalization, and symbolic-link write paths are rejected. Reconcile a stale lease against Fal request history and every job ledger before manually removing it.

Compositions keep generated-video layers inert as empty `.generated-video-slot` elements with `data-generation-shot-id`, local video/poster paths, and generated start/duration/track metadata. The generator validates every slot before submission. For `--all`, it waits until every selected shot, canonical MP4, declared copy, and manifest entry succeeds before staging any HTML change; only then does it atomically upgrade the slots to muted, `playsinline`, poster-backed HyperFrames `<video>` elements. If any selected shot fails, all slots remain on their PNG fallback.

Generated-video ledgers, clips, mirrors, and provenance live under `assets/generated/video/`. Remote Fal URLs are transport only; HyperFrames compositions must reference the verified local MP4. After every selected shot succeeds, the runner stages each allowlisted composition update and replaces that file through a temp-file rename; this is per-file atomicity, not a cross-file transaction. Generated clips start with `reviewed: false`, so visual review and fresh strict QA remain required before render.

When an approved provider clip is shorter than the composition scene, do not resubmit a paid job or hide the mismatch behind a browser playback-rate override. Preserve the canonical provider MP4 and create a deterministic local composition derivative at the exact scene duration. Record the source and derivative hashes, codec, dimensions, frame rate/count, duration, transform, and reason in the plan/manifest. For a scene explicitly designed to remain video throughout, remove the active slot's poster/still fallback only after the derivative passes early- and late-frame extraction without a black or stale frame.

Generation ends at preview. It never renders, commits, or pushes automatically.

## Framehouse Studio

Start the Vite UI and local runner:

```bash
npm run dev
```

The Studio provides:

- a catalog of generated `videos/<slug>/` projects;
- Codex-native generation with an allowlisted template selector;
- local toolchain preflight checks;
- strict HyperFrames validation;
- preview and explicit render jobs;
- a durable local job ledger, recent output, cancellation, managed preview ownership, and explicit preview shutdown.

The runner binds to `127.0.0.1:4317` (override with `STUDIO_RUNNER_PORT`). It uses argument arrays with `shell: false`, restricts project paths to allowlisted repository roots, protects environment files, allows only known templates, and serializes generation/render mutations. Each job runs in its own process group, so cancelling a job or stopping the runner (`SIGINT`/`SIGTERM`) also stops the HyperFrames CLI, esbuild, and headless Chrome it spawned; interrupted jobs are recorded as `cancelled` in `.studio/state/jobs.json`. The API answers `404` for unknown projects or jobs, `409` when a job conflicts with running work or an existing render, and `400` for invalid requests.

## Generation pipeline

```text
topic + template
      ↓
scripts/codex-create-short.mjs
      ↓
codex exec + project AGENTS.md + .agents/skills
      ↓
adaptive storyboard or template copy → research → script → TTS → transcript
      ↓
captions + visual/media plan → composition → lint → snapshots → strict check
      ↓
previewable videos/<slug>/ project
```

Required generated artifacts:

- `script.txt`
- `audio/narration.wav`
- `transcript.json`
- `index.html`
- `meta.json`
- template-local assets and configuration

## Validation and render

Run repository checks:

```bash
npm test
npm run typecheck
npm run build
python -m compileall scripts
```

Validate a generated short:

```bash
npx --no-install hyperframes lint videos/<slug>
npx --no-install hyperframes check videos/<slug> --json --strict --at-transitions
```

Open a preview:

```bash
npx --no-install hyperframes preview videos/<slug> --no-open
```

Render only when explicitly ready:

```bash
npx --no-install hyperframes render videos/<slug> --output videos/<slug>/out/<slug>.mp4
```

## Project knowledge

Codex instruction sources:

```text
AGENTS.md
.agents/
├── AGENTS.md
├── rules/
└── skills/
    ├── diy-yt-creator/
    ├── hyperframes/
    ├── hyperframes-cli/
    ├── text-to-speech/
    └── visual-diagrams/
```

The generation skill is the routing layer. Its template playbooks share the same contract: copy the source template, write a four-phase script, generate timestamped narration, preserve timing selectors/constants, run lint and strict QA, then preview.

When adding a template:

1. Add `templates/shorts/<template>/` with its design, pronunciation, metadata, and composition contract.
2. Add `.agents/skills/diy-yt-creator/new-<template>-short.md`.
3. Add the template to the skill routing table.
4. Add it to the allowlists in `scripts/codex-create-short.mjs`, `runner/commands.ts`, and the Studio selector.
5. Lint the template and run a disposable Codex generation smoke.

## TTS

Kokoro is the local default:

```bash
python scripts/kokoro-tts.py videos/<slug> --shorts
```

ElevenLabs is the premium alternative:

```bash
python scripts/elevenlabs-tts.py videos/<slug> --shorts --no-chunk
```

Both produce `audio/narration.wav` and the same flat `transcript.json` word-timestamp contract. `scripts/compute_timings.py` is engine-independent.

Generated projects may also opt into a project-local Fish Audio replacement flow when discrete scene narration is more useful than one narration file. Read `$fish-audio-api` before provider calls. Keep `FISH_AUDIO_API_KEY` or `FISH_API_KEY` only in the ignored repository `.env`, and keep the request, voice/model config, generator, provider-specific output directory, and immutable generation ledger inside the generated project.

For a project that includes `scripts/generate-fish-voice.mjs`:

```bash
node videos/<slug>/scripts/generate-fish-voice.mjs --ids all --commit
node .agents/skills/faceless-explainer/scripts/captions.mjs build \
  --storyboard videos/<slug>/STORYBOARD.md \
  --audio-meta videos/<slug>/audio_meta.json \
  --hyperframes videos/<slug> \
  --out videos/<slug>/caption_groups.json
```

The generator must refuse silent overwrite, reject narration longer than its scene, normalize local WAV output, persist text/audio hashes and native word timings, and atomically update the project's audio metadata and timeline references. Rebuild captions from those new timings, verify every WAV against its ledger, then run snapshots and the strict HyperFrames transition check. Preserve the old provider assets until the replacement is approved.

## Repository layout

```text
.agents/        Codex project skills and shared rules
runner/         Local allowlisted job runner
studio/         Vite + React creator UI
convex/         Studio metadata/job state support
scripts/        Codex launcher, TTS, timing, and media tools
templates/      Reusable HyperFrames visual systems
videos/         Generated projects (gitignored)
public/         Bundled media assets
shared/         Shared SFX and manifests
ai_docs/        Architecture and migration notes
```
