# Agent instructions (scope: this directory and subdirectories)

## Scope and layout
- **This AGENTS.md applies to:** `scripts/` and all files under it.
- **Owner:** Provider orchestration, voice generation, transcript timing, and media utility logic.
- **Key files:** `generate-fal-video.mjs`, `generate-fal-video.test.mjs`, `compute_timings.py`, `kokoro-tts.py`, `elevenlabs-tts.py`, `tts_lib.py`, `sync-video-sfx.sh`, `list_voices.py`.

## Commands (use what this repo uses)
- **Generate timings:** `python scripts/compute_timings.py videos/<slug> [--slam-word <WORD>] [--json]`
- **Validate a Fal video plan:** `npm run video:fal -- videos/<slug> --all --dry-run`
- **Run focused Fal tests:** `npx vitest run scripts/generate-fal-video.test.mjs runner/project-contracts.test.ts`
- **Run quick script checks:** `python -m compileall scripts/`
- **TTS setup:** `source .venv/bin/activate` then `pip install ...` as documented in README

## Feature map

| Feature | Owner | Key paths | Entrypoints | Tests | Docs |
|---|---|---|---|---|---|
| Timing derivation | `scripts` | `scripts/compute_timings.py` | `main()` CLI entrypoint | `python scripts/compute_timings.py videos/<slug>` against a generated slug | Module docstring + README timing notes |
| Fal image-to-video | `scripts` | `scripts/generate-fal-video.mjs`, `scripts/generate-fal-video.test.mjs` | `npm run video:fal -- videos/<slug> --all --dry-run` | Focused Vitest suite + live-price dry run | `README.md`, `docs/okf/hyperframes-ai-video-generation/concepts/generated-video.md` |
| Kokoro TTS | `scripts` | `scripts/kokoro-tts.py` | playbook command `python scripts/kokoro-tts.py --shorts` | Output file presence + hyperframes lint | `README.md` "TTS engines" section |
| ElevenLabs TTS | `scripts` | `scripts/elevenlabs-tts.py`, `scripts/tts_lib.py` | playbook command `python scripts/elevenlabs-tts.py --shorts` | `transcript.json` shape consistency | `.env.example`, `README.md` |
| Voice/asset utilities | `scripts` | `scripts/list_voices.py`, `scripts/sync-video-sfx.sh` | script invocation from workflows/manual ops | Manual smoke/manual output | `.env.example` |

## Conventions
- Keep output filenames stable: `narration.wav`, `transcript.json`, `.thumbnails` expectations remain unchanged.
- Preserve word/token filtering behavior for phantom punctuation in transcript timing calculations.
- Leave command-line flags backward compatible where feasible to avoid playbook drift.
- Keep paid Fal submission explicit, live-priced, per-shot capped, resumable by request ID, and local-output-only for HyperFrames playback.

## Common pitfalls
- `compute_timings.py` expects four phase blocks in `script.txt`; malformed formatting breaks workflow timing.
- ElevenLabs script behavior differs by package version; keep decode/output format expectations in sync with playbooks.
- `sync-video-sfx.sh` should treat `.gitkeep`-kept folders as intentional placeholders, not errors.
- A Fal ledger in `submitting` state without a request ID is ambiguous; never automatically resubmit it because the provider may already have accepted the billable request.

## Do not
- Do not add new script dependencies without keeping install docs aligned in `README.md`.
- Do not alter transcript JSON schema casually; templates and downstream tooling assume `{word, start, end}` entries.
- Do not bypass generated-video MP4 probing, manifest verification, or staged composition activation.
