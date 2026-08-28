# Agent instructions (scope: this directory and subdirectories)

## Scope and layout

- This file applies to the entire repository.
- Codex project knowledge lives under `.agents/skills/`; shared composition rules live under `.agents/rules/`.
- Runtime code lives in `runner/`, `studio/`, `scripts/`, and `convex/`.
- Source templates live in `templates/`; generated projects live in `videos/`.

## Modules

| Module | Path | Ownership | Run | Verification |
|---|---|---|---|---|
| Codex generation | `.agents/`, `scripts/codex-create-short.mjs` | Current official HyperFrames skills, custom playbooks, image assets, shared rules, native Codex launcher | `npm run create:short -- --workflow adaptive --images auto --template classic --topic "<topic>"` | Launcher preflight plus generated-project checks |
| Studio | `studio/`, `runner/`, `convex/` | Local creator UI, allowlisted command runner, job/catalog state | `npm run dev` | `npm test`, `npm run typecheck`, `npm run build` |
| Media scripts | `scripts/` | TTS, transcript timing, media helpers | `python scripts/compute_timings.py videos/<slug>` | `python -m compileall scripts/` |
| Templates | `templates/` | Reusable visual systems and timing contracts | Used by the Codex generation skill | `npx --no-install hyperframes lint templates/shorts/<template>` |
| Generated videos | `videos/` | Generated compositions and media artifacts | `npx --no-install hyperframes preview videos/<slug>` | lint plus strict check |
| Shared assets | `public/`, `shared/` | Reusable SFX, music, voice, and manifests | Used by templates and scripts | Generated-video QA |
| Strategy docs | `ai_docs/` | Architecture and migration notes | none | docs review |
| Knowledge docs | `docs/` | Open Knowledge Format bundle and documentation conventions | `npm run docs:validate:okf` | OKF validator |

## Generation workflow

- Use `$faceless-explainer` for adaptive topic-to-video generation with variable scenes, captions, frame workers, and contact-sheet QA. Keep `$diy-yt-creator` for the legacy four-phase template presets.
- The Studio starts `scripts/codex-create-short.mjs`, which validates workflow/template/image policy/topic and launches `codex exec` in this repository.
- Use `$hyperframes-visual-assets` when original imagery materially improves a scene. Codex generation is the default provider; OpenAI API generation requires explicit `--api` selection and is never an automatic fallback.
- Use `npm run video:fal -- videos/<slug> --all --dry-run` to validate live Fal pricing and every `generated-video-plan.json` shot before any paid image-to-video request. Paid generation requires the explicit `--api` mode, writes resumable request ledgers and verified local MP4s under `assets/generated/video/`, and must keep remote provider URLs out of HyperFrames compositions.
- Workflows call their TTS/timing/caption/media tools, edit only the project under `videos/<slug>/`, run visual snapshots plus strict QA, and finish at preview.
- Use `$text-to-speech` for narration workflow decisions and read the provider skill, such as `$fish-audio-api`, before calling a hosted voice API. A generated project's provider config, request, immutable generation ledger, and local audio files must stay together under that project.
- For a post-generation voice replacement, regenerate narration into a new provider-specific asset directory, reject clips longer than their scenes, atomically update audio metadata and `<audio>` references, then rebuild captions from the provider's word timestamps before visual QA. Do not silently overwrite the previous voice assets.
- Preserve timing keys (`T1/T2/T3`, `P2/P3/P4`, `slam_t`, `shake_offsets`) and selectors (`#phase1-4`, hero, content, and CTA IDs) across templates, playbooks, and timing code.
- Keep `.env` local. TTS scripts read only the repository `.env` file.
- Keep `FAL_AI_API_KEY` or `FAL_KEY` in the repository `.env` file. Never print either value, and never resubmit a Fal job whose persisted `submitting` state has no request ID; reconcile that ambiguous state first to avoid duplicate billing.
- Keep `FISH_AUDIO_API_KEY` or `FISH_API_KEY` in the repository `.env` file. Never print either value or place it in project JSON, manifests, captions, or documentation.

## HyperFrames skill routing

- Use `$hyperframes` as the primary workflow entry point when creating, revising, or reviewing a HyperFrames project; follow any more specific workflow skill it routes to.
- Use `$hyperframes-core` for composition authoring and repair, including timeline structure, deterministic animation, asset paths, audio, and runtime-safe project contracts.
- Use `$hyperframes-cli` for existing-project operations such as lint, strict checks, managed preview, presentation serving, and render commands; read its operation-specific reference before running the command.
- For a finished project, pair the three skills: inspect the project with `$hyperframes`, validate its composition contract with `$hyperframes-core`, then use `$hyperframes-cli` to check and launch the managed preview.
- Reuse a healthy background preview when available, verify its URL returns HTTP 200, and hand off the Studio URL. Render only when the user explicitly requests it.
- When opening a local Studio or preview URL in the Codex browser on this machine, use the explicit loopback IP `127.0.0.1`; never use the `localhost` hostname. Preserve the preview port and URL fragment when rewriting the host.

## Required verification

- Repository code: `npm test`, `npm run typecheck`, and `npm run build`.
- Template: `npx --no-install hyperframes lint templates/shorts/<template>`.
- Generated short: `npx --no-install hyperframes lint videos/<slug>` then `npx --no-install hyperframes check videos/<slug> --json --strict --at-transitions`.
- Rendering is explicit only: `npx --no-install hyperframes render videos/<slug> --output videos/<slug>/out/<slug>.mp4`.

## Media completion states

- Treat provider success, local normalization, composition activation, visual/audio review, healthy preview, and rendered MP4 as separate evidence levels.
- A local clip or WAV is usable only after its codec, duration, expected stream shape, and persisted checksum/provenance have been verified.
- When a provider clip is shorter than its scene, preserve the canonical provider output and create a deterministic local composition derivative. Record the source and derivative hashes, transform, duration, frame rate, and purpose; never mislabel the derivative as the provider output.
- Preview handoff requires a managed background process, an HTTP 200 check, and a `127.0.0.1` URL. It is not evidence of an exported MP4.

## Conventions

- Keep edits scoped and prefer source-of-truth fixes in skills, templates, or scripts over final-render tweaks.
- Update instructions and tests whenever launcher or artifact contracts change.
- Treat `videos/` as generated state unless the request explicitly targets a generated short.
- Document non-obvious public script behavior and keep docs synchronized with flags and output schemas.

## Do not

- Do not auto-render or overwrite an existing generated project/render.
- Do not modify `.venv/` or expose `.env` through the Studio runner.
- Do not create a template without updating the Codex skill/playbook selection and Studio allowlist.
- Do not introduce provider-specific instruction trees outside `.agents/`.

## Nested instructions

- `.agents/AGENTS.md`
- `docs/AGENTS.md`
- `scripts/AGENTS.md`
- `templates/AGENTS.md`
- `videos/AGENTS.md`
- `public/AGENTS.md`
- `shared/AGENTS.md`
- `ai_docs/AGENTS.md`
