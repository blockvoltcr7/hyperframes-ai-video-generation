# shared/audio/ — Inventory

Single source of truth for SFX cues that ship with this repo. Every cue listed
here resolves to a file in `shared/audio/sfx/<cue>.mp3` and is consumable via
`bash scripts/sync-video-sfx.sh videos/<slug> <cue>`.

**Conventions:**

- Cue names are kebab-case, single-token (no spaces, no underscores).
- The `Default Volume` column is the recommended `data-volume` per
  [`.claude/rules/audio-design.md`](../../.claude/rules/audio-design.md). Override
  per video only with explicit reason.
- The `Duration` column is the actual length read via `ffprobe` after generation.
  ElevenLabs sound-effects API enforces a 0.5s minimum; cues prompted shorter
  (e.g. `pop`) are clamped to 0.5s by the API.
- See [README.md](./README.md) for how to consume a cue.

## SFX Cues

| Cue                | File                  | Duration | Default Volume | Recommended Use                                   |
| ------------------ | --------------------- | -------- | -------------- | ------------------------------------------------- |
| `impact-slam`      | impact-slam.mp3       | 0.63s    | 0.20           | Hero word reveal; pivot moment                    |
| `scale-slam`       | scale-slam.mp3        | 0.73s    | 0.20           | Stat-pill entrance; big number reveal             |
| `screen-shake`     | screen-shake.mp3      | 0.52s    | 0.15           | Hero word inline shake; layer with `impact-slam`  |
| `cinematic-whoosh` | cinematic-whoosh.mp3  | 0.84s    | 0.15           | Phase / scene change                              |
| `spring-pop`       | spring-pop.mp3        | 0.52s    | 0.15           | Card or chip entrance                             |
| `pop`              | pop.mp3               | 0.52s    | 0.13           | Small chip / list item                            |
| `glitch-zap`       | glitch-zap.mp3        | 0.52s    | 0.12           | "BUT…" pivot; regression callout                  |
| `strike-cross`     | strike-cross.mp3      | 0.63s    | 0.15           | Strikethrough moment                              |
| `sonic-logo`       | sonic-logo.mp3        | 1.52s    | 0.60           | Brand stinger at composition start (optional)     |

## Hard cap

Any cue not listed above defaults to `data-volume="0.15"`. Per
[`.claude/rules/audio-design.md`](../../.claude/rules/audio-design.md), no per-cue
SFX may exceed `0.25`. The `sonic-logo` value of `0.60` is the single documented
exception and only because it plays during cold-open silence with no concurrent
narration.

## Generation

To (re)generate any cue:

```bash
python scripts/generate-sfx-library.py                              # generate any missing cues
python scripts/generate-sfx-library.py --force --only <cue-name>    # re-prompt one cue
```

See [`scripts/generate-sfx-library.py`](../../scripts/generate-sfx-library.py)
for the prompt strings used per cue. Tune the prompt there if a generated cue
has the wrong character (reverb tail, attack curve, frequency content).
