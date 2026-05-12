# create-archon-short

Archon workflow that turns a topic prompt into a vertical YouTube Short rendered with [HyperFrames](https://hyperframes.heygen.com/). Each run spawns a self-contained `videos/<slug>/` project from `templates/shorts/archon/` — Archon-branded dark-blue / cyan-magenta aesthetic — researches the topic, drafts a paced narration, generates TTS, edits `index.html` with content sync'd to spoken-word frames, lints, and opens a browser preview. Render is always manual.

> Despite the repo name, this stack is **HyperFrames** (HTML/GSAP), not Remotion. Branch `video/hyperframes` is the active one; older Remotion-based work lives on prior branches in this repo's history.

## Run

```bash
# Default 30s short
archon workflow run create-archon-short --no-worktree "What is Archon for Beginners?"

# Override duration in the topic
archon workflow run create-archon-short --no-worktree "duration 45s, GPT-5 vs Claude coding showdown"

# Render the rendered MP4 (always manual — workflow never auto-renders)
npx hyperframes render videos/<slug> -o videos/<slug>/out/<slug>.mp4
```

`--no-worktree` is required (the workflow pins `worktree.enabled: false` so video artifacts land on the working branch instead of an isolated checkout).

## What the workflow does

1. **`parse-input`** (bash + bun) — derives `{topic, slug, duration, title}` from the topic phrase.
2. **`precheck`** (bash) — verifies `templates/shorts/archon/`, no existing `videos/<slug>/`, `npx` on PATH.
3. **`create-short`** (Claude) — runs the playbook in `.claude/skills/diy-yt-creator/new-archon-short.md`:
   - Researches the topic (WebFetch + WebSearch grounding)
   - Drafts a script paced to hit the duration target (heteronym audit; banned-phrase check)
   - Generates TTS via edge-tts (`en-US-AndrewNeural` default, `+25%` rate)
   - Computes phase-transition anchors from the transcript word-boundaries
   - Edits `videos/<slug>/index.html` — title, content, GSAP timeline values, audio elements
   - Runs `npx hyperframes lint` + `inspect` until clean
   - Launches `npx hyperframes preview` in the background
   - Prints the preview URL + the manual `render` command

Total: 20–30 minutes for a 30s short, depending on research depth.

## Setup

1. **Install Archon** — see https://archon.diy/docs
2. **Install Claude Code** — `curl -fsSL https://claude.ai/install.sh | bash`
3. **System deps:** Node ≥18, pnpm (`npm i -g pnpm`), Python ≥3.10 with `pip install edge-tts`, ffmpeg, jq, bun
4. **Archon credentials** in `~/.archon/.env` (machine-wide, gitignored):
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   # OR
   CLAUDE_CODE_OAUTH_TOKEN=...
   ```

Verify install:
```bash
archon validate workflows create-archon-short    # → ok
archon validate commands create-archon-short     # → ok
npx hyperframes lint templates/shorts/archon     # → 0 errors, 0 warnings
```

## Output

```
videos/<slug>/
├── index.html              ← root composition
├── meta.json, hyperframes.json, DESIGN.md, README.md
├── script.txt              ← narration source
├── audio/
│   ├── narration.wav       ← edge-tts output
│   ├── narration.mp3
│   └── narration-chunks/   ← per-sentence intermediates (gitignored)
├── transcript.json         ← word-level timestamps (may be empty if edge-tts service degrades)
├── assets/
│   ├── archon-logo.png
│   └── sfx/                ← per-video SFX subset (synced from shared/audio/sfx/)
└── out/                    ← rendered MP4 (gitignored)
```

`videos/<slug>/` is committed to git so each generation is a permanent gallery entry. Only the rendered MP4 (`out/`), per-sentence TTS chunks, and HyperFrames waveform caches are gitignored.

## Customization

- **Voice** — edit step 5+6 of `.archon/commands/create-archon-short.md`. Safe choices: `en-US-AndrewNeural` (default), `BrianNeural`, `GuyNeural`. **Never** use `*MultilingualNeural` voices — they emit empty WordBoundary arrays and break the transcript step silently.
- **Default duration** — edit `let duration = 30;` in `.archon/workflows/create-archon-short.yaml` (the `parse-input` JS).
- **Range guard** — same file: `if (duration < 10 || duration > 300)` clamps to 10s–5min.
- **Slug stopwords** — same file: `STOPWORDS` Set; add product / company names so they don't bloat slugs.

## Repo layout

```
.
├── .archon/
│   ├── workflows/create-archon-short.yaml      ← the DAG
│   ├── commands/create-archon-short.md         ← AI command driving the playbook
│   ├── plans/port-create-archon-short.md       ← origin-port reference
│   └── config.yaml
├── .claude/
│   ├── rules/                                  ← 11 project-wide rules the AI follows
│   └── skills/
│       ├── diy-yt-creator/                     ← the playbook
│       ├── hyperframes/                        ← framework patterns (palettes, refs)
│       ├── hyperframes-cli/                    ← CLI command reference
│       ├── archon/                             ← Archon workflow authoring docs
│       └── visual-diagrams/                    ← generic diagram design system
├── templates/shorts/archon/                    ← seed copied into videos/<slug>/ on every run
├── scripts/
│   ├── edge-tts-fallback.py                    ← TTS + transcript in one shot
│   └── sync-video-sfx.sh                       ← syncs shared SFX into per-video assets/sfx/
├── shared/audio/                               ← SFX library (9 cinematic cues + MANIFEST)
└── videos/<slug>/                              ← one folder per generated short
```

## Caveats

- **edge-tts WordBoundary degradation** — the service occasionally returns empty `[]` boundaries across all voices. The playbook estimates phase boundaries from character proportions in that case (±1s accuracy). Re-time when the service recovers, or port `scripts/elevenlabs-tts.py` from the source repo for production use.
- **Bun on Windows + multi-line `bun -e`** — Archon spawns inline bun scripts via Node's `execFile`; on Windows, bun truncates the script at the first newline (silent — exit 0, no error). The `parse-input` node uses a bash wrapper (`mktemp` + `bun run`) to avoid this. See CLAUDE.md → Gotchas before refactoring.
- **AI fabrication risk** — if WebFetch / WebSearch fails, the playbook may invent statistics. If you spot fabrications, restart with a source URL embedded in the topic ("Archon 1.0 launch — see https://archon.diy/blog/1.0").

## Provenance

Ported from `diy-yt-creator-hyperframes` per `.archon/plans/port-create-archon-short.md`. The plan documents which files to copy, which to skip, and the verify steps. Deviations on this branch:
- `parse-input` rewritten as `bash:` node (was `script: runtime: bun`) — fix for the Windows `bun -e` multi-line truncation bug.
- Bash node timeouts bumped from 10–15s to 30s — Windows bash startup + jq spawn × 3 routinely overruns shorter limits.
- Skipped optional `shared/logos/` (84 brand wordmarks) — only needed for non-Archon branded shorts.
