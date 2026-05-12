# hyperframes-ai-video-generation

Turn a topic prompt into a polished, AI-voiced vertical YouTube Short. One command, fire and forget.

```bash
archon workflow run create-archon-short --no-worktree "What is Archon for Beginners?"
```

That's it. The Archon DAG researches the topic, drafts a paced narration, generates ElevenLabs TTS, edits an HTML+GSAP composition, lints it, and opens a browser preview at `http://localhost:3002`. Render is always manual — `npx hyperframes render videos/<slug>` when you're ready.

The stack: **[Archon](https://archon.diy)** (workflow harness) + **[Claude Code](https://claude.ai/code)** (planning + composition editing) + **[HyperFrames](https://hyperframes.heygen.com/)** (HTML/GSAP video framework) + **[ElevenLabs](https://elevenlabs.io)** (voice with word-level timestamps). Total runtime per short: ~20-30 min depending on research depth.

## Quick Start

Three install commands, one config file, one workflow run.

### 1. Install Claude Code

```bash
# macOS / Linux / WSL
curl -fsSL https://claude.ai/install.sh | bash

# Windows (PowerShell)
irm https://claude.ai/install.ps1 | iex
```

Then `claude /login` once to authenticate.

### 2. Install Archon (binary, no setup wizard needed)

```bash
# macOS / Linux
curl -fsSL https://archon.diy/install | bash

# Windows (PowerShell)
irm https://archon.diy/install.ps1 | iex

# Homebrew
brew install coleam00/archon/archon
```

Point Archon at Claude Code (binary installs don't bundle it):

```bash
# macOS / Linux / WSL — add to ~/.bashrc or ~/.zshrc
export CLAUDE_BIN_PATH="$HOME/.local/bin/claude"

# Windows (PowerShell profile)
$env:CLAUDE_BIN_PATH = "$env:USERPROFILE\.local\bin\claude.exe"
```

You do **NOT** need to run `archon setup` — that's for the source-install path. The binary just works against this repo's pre-configured `.archon/` directory.

### 3. Install system deps

You need Node ≥18, Python ≥3.10, ffmpeg, jq, and bun.

```bash
# macOS (Homebrew)
brew install node python ffmpeg jq oven-sh/bun/bun

# Windows (winget + bun installer)
winget install OpenJS.NodeJS Python.Python.3.12 Gyan.FFmpeg jqlang.jq
irm bun.sh/install.ps1 | iex

# Linux (Debian / Ubuntu)
sudo apt install -y nodejs npm python3 python3-pip ffmpeg jq
curl -fsSL https://bun.sh/install | bash
```

Then the Python TTS deps:

```bash
pip install elevenlabs python-dotenv
```

### 4. Clone + configure

```bash
git clone https://github.com/coleam00/hyperframes-ai-video-generation
cd hyperframes-ai-video-generation
cp .env.example .archon/.env
```

Open `.archon/.env` and fill in:

- `ELEVENLABS_API_KEY` — your key from [elevenlabs.io](https://elevenlabs.io)
- `ELEVENLABS_VOICE_ID` — either your clone's ID or a preset (Brian `nPczCjzI2devNBz1zQrb` is the documented default)
- The other 7 settings ship with the **tested-good defaults** for shorts (see "Voice tuning" below for what they mean).

### 5. Run it

```bash
archon workflow run create-archon-short --no-worktree "Your topic here"
```

20-30 minutes later the studio opens with the finished short. Render with `npx hyperframes render videos/<slug> -o videos/<slug>/out/<slug>.mp4`.

---

## What the workflow does

A three-node Archon DAG (`.archon/workflows/create-archon-short.yaml`):

1. **`parse-input`** (bash + bun) — derives `{topic, slug, duration, title}` from the topic phrase.
2. **`precheck`** (bash) — verifies `templates/shorts/archon/` exists, `videos/<slug>/` doesn't, `npx` is on PATH.
3. **`create-short`** (Claude) — runs the playbook at `.claude/skills/diy-yt-creator/new-archon-short.md`:
   - Researches the topic (WebFetch + WebSearch grounding)
   - Drafts narration paced to the duration target — with mandatory SSML `<break>` tags between sentences and natural abbreviations (MIT, not M I T)
   - Generates ElevenLabs TTS via `python scripts/elevenlabs-tts.py --shorts --no-chunk` — single-call mode for cross-sentence prosody
   - Computes phase-transition anchors via `python scripts/compute_timings.py` (strips break tags, filters phantom punctuation)
   - Edits `videos/<slug>/index.html` — title, content, GSAP timeline anchors, audio element
   - Runs `npx hyperframes lint` + `inspect` until clean
   - Launches `npx hyperframes preview` in the background
   - Prints the preview URL + the manual `render` command

## Voice tuning

The defaults in `.env.example` are the tested sweet spot for an Instant Voice Clone on shorts:

| Setting | Default | Effect of going up | Effect of going down |
|---|---|---|---|
| `ELEVENLABS_STABILITY=0.40` | | More monotone | Phoneme artifacts ("incoherent words") |
| `ELEVENLABS_STYLE=0.70` | | Artifacts return at high style + low stability | Flatter, less excitement |
| `ELEVENLABS_SIMILARITY_BOOST=0.75` | | Locks to reference timbre, suppresses prosody | Drifts further from the reference voice |
| `ELEVENLABS_SPEED_SHORTS=1.15` | | Compresses phonemes + sentence-final intonation (sentences sound mid-thought) | Slower, more breathing room |
| `ELEVENLABS_MODEL_ID=eleven_multilingual_v2` | | `eleven_v3` is more expressive but drifts further from clone voice | `eleven_turbo_v2_5` is faster + cheaper but flatter |

See the comment block inside `.env.example` for the full tuning matrix. If a clone sounds monotone, the first knob is stability ↓. If it sounds garbled, stability ↑ first.

Script-level rules (enforced by the playbook): SSML `<break time="0.35s"/>` between sentences, `<break time="0.4s"/>` at phase boundaries (NOT 0.65s — causes re-entry artifacts), natural abbreviations only, selective CAPS on 1-2 power words per phase.

## Output

```
videos/<slug>/
├── index.html              ← root composition (HTML + GSAP timeline)
├── meta.json, hyperframes.json, DESIGN.md, README.md
├── script.txt              ← narration source (with <break> tags inline)
├── audio/
│   ├── narration.wav       ← ElevenLabs TTS (MP3 decoded to PCM via ffmpeg)
│   ├── narration.mp3       ← compressed copy
│   └── narration-chunks/   ← per-chunk intermediates if you use chunked mode (gitignored)
├── transcript.json         ← word-level timestamps from ElevenLabs alignment
├── assets/
│   ├── archon-logo.png
│   └── sfx/                ← per-video SFX subset (synced from shared/audio/sfx/)
└── out/                    ← rendered MP4 (gitignored)
```

`videos/<slug>/` is committed to git so every generation is a permanent gallery entry. Only the rendered MP4, per-chunk TTS intermediates, and HyperFrames waveform caches are gitignored.

## Customization

- **Voice ID** — set `ELEVENLABS_VOICE_ID` in `.archon/.env`. Documented presets: Brian `nPczCjzI2devNBz1zQrb`, Adam (legacy) `pNInz6obpgDQGcFmaJgB`, Daniel `onwK4e9ZLuTAKqWW03F9`. Or use your own clone's ID.
- **Voice tuning matrix** — see `.env.example` and the table above.
- **Default duration** — edit `let duration = 30;` in `.archon/workflows/create-archon-short.yaml` (the `parse-input` JS).
- **Range guard** — same file: `if (duration < 10 || duration > 300)` clamps to 10s-5min.
- **Slug stopwords** — same file: `STOPWORDS` Set; add product/company names so they don't bloat slugs.
- **Script style rules** — `.claude/skills/diy-yt-creator/new-archon-short.md` step 4 documents break-tag layout, CAPS guidance, abbreviation conventions.

## Repo layout

```
.
├── .archon/
│   ├── workflows/create-archon-short.yaml      ← the DAG
│   ├── commands/create-archon-short.md         ← AI command driving the playbook
│   ├── plans/port-create-archon-short.md       ← origin-port reference
│   └── config.yaml
├── .claude/
│   ├── rules/                                  ← project-wide rules the AI follows
│   └── skills/
│       ├── diy-yt-creator/                     ← the playbook
│       ├── hyperframes/                        ← framework patterns (palettes, refs)
│       ├── hyperframes-cli/                    ← CLI command reference
│       └── archon/                             ← Archon workflow authoring docs
├── templates/shorts/archon/                    ← seed copied into videos/<slug>/ on every run
├── scripts/
│   ├── elevenlabs-tts.py                       ← single-call ElevenLabs TTS with MP3 + ffmpeg decode
│   ├── tts_lib.py                              ← chunked-generation lib (delta-regen + alignment)
│   ├── compute_timings.py                      ← derives phase boundaries, slam_t, hero entrance, etc.
│   ├── list_voices.py                          ← list available ElevenLabs preset voices
│   ├── edge-tts-fallback.py                    ← TTS fallback (no API key needed)
│   └── sync-video-sfx.sh                       ← syncs shared SFX into per-video assets/sfx/
├── shared/audio/                               ← SFX library (cinematic cues + MANIFEST)
└── videos/<slug>/                              ← one folder per generated short
```

## Caveats

- **ElevenLabs PCM output is Pro-tier only.** `scripts/tts_lib.py` requests `mp3_44100_128` (available on Creator and below) and decodes to PCM via ffmpeg. If you're on Pro and want pure PCM, edit `tts_lib.py` to switch `output_format`.
- **Phantom punctuation in transcripts.** ElevenLabs occasionally emits a standalone `.` word around `<break>` tags. `clean_sync_data` in `tts_lib.py` filters these defensively so phase-boundary math doesn't drift.
- **Break-tag re-entry artifacts.** Phase-boundary `<break>` durations of 0.65s+ can cause an audible click/breath when the model resumes. The playbook uses 0.4s for phase breaks and 0.35s for inter-sentence breaks — proven artifact-free in 20+ test runs.
- **Speed ceiling is 1.15.** Going to 1.20 compresses phonemes (more garbled output) AND flattens sentence-final intonation (sentences sound mid-thought, like they didn't end).
- **Bun on Windows + multi-line `bun -e`.** Archon spawns inline bun scripts via Node's `execFile`; on Windows, bun truncates the script at the first newline (silent — exit 0, no error). The `parse-input` node uses a bash wrapper (`mktemp` + `bun run`) to avoid this. See `CLAUDE.md` → Gotchas before refactoring.
- **AI fabrication risk.** If WebFetch / WebSearch fails, the playbook may invent statistics. If you spot fabrications, restart with a source URL embedded in the topic ("Archon 1.0 launch — see https://archon.diy/blog/1.0").
- **Repo name is historical.** This stack pivoted from Remotion to HyperFrames mid-2026. The repo name reflects the original Remotion-based project; the active stack on `main` is HyperFrames.

## Provenance

Ported from `diy-yt-creator-hyperframes`. The original Remotion-based work lives on prior branches; current `main` is HyperFrames + ElevenLabs single-call with the tuned settings matrix documented above. Voice settings, break-tag durations, and the MP3 + ffmpeg decode pipeline were all validated over a live tuning session — see git log for the iteration history.

## License

MIT
