# hyperframes-ai-video-generation

Turn a topic prompt into a polished, AI-voiced vertical YouTube Short. One command, fire and forget.

```bash
archon workflow run create-classic-short --no-worktree "What is RAG?"
```

That's it. The workflow researches the topic, drafts a paced narration, generates TTS (free Kokoro locally, or paid ElevenLabs — your choice), edits an HTML+GSAP composition, lints it, and opens a browser preview. Render is always manual — `npx hyperframes render videos/<slug>` when you're ready.

The repo ships with **three templates out of the box** — `classic` (brand-neutral default, blue + dark), `archon` (Archon-branded), `anthropic` (Anthropic-branded) — and you can [build your own brand](#want-a-different-brand-or-look) by asking your coding agent.

> ## 🚀 Just tell your coding agent to do it
>
> The fastest way through this whole README is to **not** read it yourself. Open this repo in [Claude Code](https://claude.ai/code) (or any agentic coding tool) and paste one of these:
>
> **To generate a video with a shipped template:**
>
> > _"Read the README and set everything up so I can generate my first video. The topic is: **[your idea or URL here]**."_
>
> **To build your own brand/style first, then generate:**
>
> > _"Read the README. Look at `templates/shorts/classic/`, `templates/shorts/archon/`, and `templates/shorts/anthropic/` as references, then create a new short template for **[your brand name, URL, or vibe — e.g. "my SaaS at example.com", "a cyberpunk dev tool", "Linear"]**. Pick the palette, gradient, wordmark, and CTA URL yourself based on the brand. When the template is built and lints clean, generate my first video with it. The topic is: **[your idea or URL here]**."_
>
> The agent will install the system deps, walk you through any keys it needs (Kokoro is free / no key required; ElevenLabs needs an API key), optionally clone + restyle a template for your brand, run the matching `archon workflow run create-<brand>-short`, and hand you the preview URL. You just supply the inputs.

The stack: **[Archon](https://archon.diy)** (workflow harness) + **[Claude Code](https://claude.ai/code)** (planning + composition editing) + **[HyperFrames](https://hyperframes.heygen.com/)** (HTML/GSAP video framework) + **[Kokoro](https://github.com/hexgrad/kokoro)** (free local TTS, default) or **[ElevenLabs](https://elevenlabs.io)** (paid premium TTS) — both return word-level timestamps. Total runtime per short: ~20-30 min depending on research depth.

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

You do **NOT** need to run `archon setup` — that's only for the source-install path (which clones the Archon repo). The binary just works against this repo's pre-configured `.archon/` directory. On first workflow run, Archon lazily creates `~/.archon/archon.db` (SQLite, single file, no schema setup required).

### 3. Install system deps

You need Node ≥22, Python ≥3.10, ffmpeg, jq, and bun.

```bash
# macOS (Homebrew)
brew install node python ffmpeg jq oven-sh/bun/bun

# Windows (winget + bun installer)
winget install OpenJS.NodeJS Python.Python.3.12 Gyan.FFmpeg jqlang.jq
irm bun.sh/install.ps1 | iex

# Linux (Debian / Ubuntu) — apt's `nodejs` is too old on most LTS releases;
# use NodeSource for Node 22.
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt install -y nodejs python3 python3-venv python3-pip ffmpeg jq unzip
curl -fsSL https://bun.sh/install | bash
```

Then the Python TTS deps. Use a virtualenv so `pip` doesn't fight your system Python (Ubuntu 24.04+ blocks bare `pip install` via PEP 668):

```bash
python3 -m venv .venv
source .venv/bin/activate           # macOS / Linux
# .venv\Scripts\activate            # Windows PowerShell

# Pick ONE of these — see "TTS engines" below for the tradeoff.

# Free local TTS (Kokoro, no API key)
pip install kokoro python-dotenv soundfile numpy

# OR commercial TTS (ElevenLabs, paid API)
pip install elevenlabs python-dotenv
```

If you chose Kokoro, also install **espeak-ng** system-wide (needed for phoneme conversion):

```bash
# macOS
brew install espeak

# Ubuntu / Debian
sudo apt install espeak-ng

# Windows: download the .msi installer
# https://github.com/espeak-ng/espeak-ng/releases
```

Activate the venv (`source .venv/bin/activate`) in any shell where you'll run `archon workflow run` — the workflow's TTS step calls `python scripts/kokoro-tts.py` or `python scripts/elevenlabs-tts.py` and needs the chosen package on the active interpreter's path.

### 4. Clone + configure

```bash
git clone https://github.com/coleam00/hyperframes-ai-video-generation
cd hyperframes-ai-video-generation
cp .env.example .archon/.env
```

Open `.archon/.env` and fill in the TTS settings for whichever engine you picked:

**For Kokoro (free, local):**
- `KOKORO_VOICE=af_heart` (or any voice from the [Kokoro voice catalog](https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md))
- `KOKORO_LANG_CODE=a` (`a`=American English, `b`=British, `j`=Japanese, etc.)
- Speed defaults already shipped — see `.env.example`.

**For ElevenLabs (paid, premium quality):**
- `ELEVENLABS_API_KEY` — your key from [elevenlabs.io](https://elevenlabs.io)
- `ELEVENLABS_VOICE_ID` — either your clone's ID or a preset (Brian `nPczCjzI2devNBz1zQrb` is the documented default)
- The other 7 settings ship with the **tested-good defaults** for shorts (see "Voice tuning" below).

### 5. Run it

Pick a template aesthetic. **`classic` is the default** — brand-neutral, works for any topic:

```bash
# Classic (brand-neutral dark theme, bright blue + sky blue) — DEFAULT
archon workflow run create-classic-short --no-worktree "Your topic here"

# Archon-themed (dark blue + cyan/magenta gradient hero)
archon workflow run create-archon-short --no-worktree "Your topic here"

# Anthropic-themed (near-black + warm orange/cream gradient hero)
archon workflow run create-anthropic-short --no-worktree "Your topic here"
```

Want a different brand? See "[Want a different brand or look?](#want-a-different-brand-or-look)" below — the fastest path is asking your coding agent to clone an existing template and re-skin it.

20-30 minutes later the studio opens with the finished short. Render with `npx hyperframes render videos/<slug> -o videos/<slug>/out/<slug>.mp4`.

---

## What the workflow does

Each template ships with its own three-node Archon workflow at `.archon/workflows/create-<template>-short.yaml` — all three are structurally identical, only the template path and brand strings differ:

1. **`parse-input`** (bash + bun) — derives `{topic, slug, duration, title}` from the topic phrase.
2. **`precheck`** (bash) — verifies `templates/shorts/<template>/` exists, `videos/<slug>/` doesn't, `npx` is on PATH.
3. **`create-short`** (Claude) — runs the matching playbook at `.claude/skills/diy-yt-creator/new-<template>-short.md`:
   - Researches the topic (WebFetch + WebSearch grounding)
   - Drafts narration paced to the duration target — with mandatory SSML `<break>` tags between sentences and natural abbreviations (MIT, not M I T)
   - Generates TTS via `python scripts/kokoro-tts.py --shorts` (default, free) or `python scripts/elevenlabs-tts.py --shorts --no-chunk` (paid)
   - Computes phase-transition anchors via `python scripts/compute_timings.py` (strips break tags, filters phantom punctuation)
   - Edits `videos/<slug>/index.html` — title, content, GSAP timeline anchors, audio element
   - Runs `npx hyperframes lint` + `inspect` until clean
   - Launches `npx hyperframes preview` in the background
   - Prints the preview URL + the manual `render` command

## Want a different brand or look?

The repo ships **three templates** out of the box at `templates/shorts/`:

| Template | Aesthetic | Workflow |
|---|---|---|
| `classic/` **(default)** | Deep navy + bright blue / sky blue gradient hero, "YOUR BRAND" wordmark, `your-domain.com` CTA — placeholders ready for you to swap | `archon workflow run create-classic-short --no-worktree "<topic>"` |
| `archon/` | Dark blue + cyan→magenta gradient hero, Archon logo banner, `archon.diy` CTA | `archon workflow run create-archon-short --no-worktree "<topic>"` |
| `anthropic/` | Near-black + warm orange→cream gradient hero, "ANTHROPIC" wordmark banner, `anthropic.com` CTA | `archon workflow run create-anthropic-short --no-worktree "<topic>"` |

**The classic template is the brand-neutral default.** Use it for any topic that isn't specifically about Archon or Anthropic — you'll need to swap the `YOUR BRAND` wordmark and `your-domain.com` CTA for your own (one-line CSS edits, documented in the template's README).

All three templates share the same 4-phase narrative shape (Hero → Stat row → Cards → CTA), the same 11-step playbook, the same TTS pipeline, the same `compute_timings.py` math. The deltas are: CSS palette, brand strings, default CTA URL, and a per-template pronunciation map.

### Adding your own template (let your coding agent do it)

If neither template fits — you want a different brand, palette, or visual identity — **the fastest path is to ask your coding agent to clone one and re-skin it**. Open this repo in Claude Code (or any agentic coding tool) and use one of the two prompt patterns below depending on how much input you have.

#### Option A — you have your brand specs ready

Use this when you already know your palette, brand name, and CTA URL. Most concrete, fewest decisions delegated to the agent:

> _"Create a new short template at `templates/shorts/<your-brand>/` by cloning `templates/shorts/anthropic/` and restyling it for **\<your brand name\>**. Specifically:_
>
> 1. _Palette: `--bg = <hex>`, `--accent-1 = <hex>` (hero/signature accent), `--accent-2 = <hex>` (CTA), `--accent-3 = <hex>` (secondary), `--accent-4 = <hex>` (workhorse). The hero gradient text-fill should be `--accent-1 → --accent-2`._
> 2. _Top banner: CSS-rendered wordmark reading **"\<BRAND IN ALL CAPS\>"** in the hero gradient, OR drop an SVG into `assets/` and follow the swap pattern in `templates/shorts/anthropic/DESIGN.md`._
> 3. _Default CTA URL: **<your-domain>**._
> 4. _Update `meta.json`, `hyperframes.json`, `DESIGN.md`, `README.md`, `PRONUNCIATION.md` for the new brand. Keep class names (`.cyan`, `.magenta`, etc.) identical to the anthropic template so `compute_timings.py` and the playbook work unchanged._
> 5. _Add a sibling playbook at `.claude/skills/diy-yt-creator/new-<brand>-short.md` mirroring `new-anthropic-short.md` — same 11 steps, just with the new template path, palette names, and CTA URL._
> 6. _Add an Archon workflow at `.archon/workflows/create-<brand>-short.yaml` and command at `.archon/commands/create-<brand>-short.md` mirroring the anthropic versions. Keep the parse-input logic identical; only the workflow name, description, template path, and command reference change._
> 7. _Add the new template's row to the table in this repo's README and to `.claude/skills/diy-yt-creator/SKILL.md`._
> 8. _Run `npx hyperframes lint templates/shorts/<your-brand>` to confirm clean."_

#### Option B — let the agent design it for you (use the shipped templates as reference)

Use this when you don't want to pick hex codes yourself, or you want the agent to study a website / brand guide and translate that into a working template. Hand it the inspiration and let it derive the rest:

> _"Look at the two existing short templates at `templates/shorts/archon/` and `templates/shorts/anthropic/` as reference for the structure and design system. Then design a new short template for **\<your brand or vibe — e.g. "Linear", "a cyberpunk dev tool with green-on-black terminal vibes", "my SaaS company's brand at https://example.com">**. You decide the palette, the gradient direction, the wordmark treatment, and the CTA URL — pick choices that match the brand's actual identity (visit the site if a URL was provided; otherwise use your judgment). Then create the template at `templates/shorts/<slug>/` along with the playbook, workflow YAML, command file, and SKILL.md entry. Mirror the file structure of the anthropic template exactly. When you're done, show me the palette you picked and why, run `npx hyperframes lint templates/shorts/<slug>` to confirm it's clean, and tell me how to invoke the new workflow."_

This path delegates more taste to the agent. It works best when the brand has a discoverable identity online (website, logo, brand site) or a well-known aesthetic the model can draw on. The agent will report back with the choices it made so you can override anything that doesn't feel right.

Both options take **5-15 minutes of wall-clock time** depending on how specific you are. The agent will copy the files, do the find-and-replace, run lint, and report what changed.

### Going further — bigger structural changes

If you want to change the *shape* of the video (not just the brand) — different number of phases, different card counts in phase 3, a hub-and-spoke structural pattern instead of phase mutex, a long-form 16:9 layout — that's a bigger lift. The cleanest pattern is still "clone an existing template, then modify," but you'll also need to update `scripts/compute_timings.py` to compute boundaries for your new phase count, and rewrite the GSAP timeline math in `index.html`. Ask the agent to walk you through it:

> _"I want a 5-phase short template (Hero → Problem → Solution → Receipt → CTA) instead of the 4-phase default. Clone `templates/shorts/archon/`, add a `#phase5` div, extend the GSAP timeline with `T4`/`P5` anchors, update `scripts/compute_timings.py` to compute boundaries for 5 phases (the current logic assumes 4), and write a playbook for it."_

Both the agent and the codebase are designed to make these changes one-file-at-a-time and lintable at every step.

## TTS engines

The workflow generates narration via one of two TTS pipelines. Pick whichever fits your situation — the rest of the workflow is identical (same playbook, same composition edit, same lint pass):

| Engine | Cost | Quality | Voice cloning | Setup | Best for |
|---|---|---|---|---|---|
| **[Kokoro](https://github.com/hexgrad/kokoro)** (default) | Free | High (MOS 4.5 on the [LMSYS Eval](https://huggingface.co/blog/leaderboard-tts)) | No (preset voices only) | `pip install kokoro` + espeak-ng | Anyone testing the workflow, no-budget creators, fully offline use |
| **[ElevenLabs](https://elevenlabs.io)** | ~$5/M chars | Premium | Yes (Instant Voice Clone) | `pip install elevenlabs` + API key | Production channels, voice-cloned narration, max polish |

**Which Python script runs:** the create-* workflows call whichever TTS script is paired with the playbook. By default the playbooks assume Kokoro. To switch to ElevenLabs, edit the playbook step 5 to call `python scripts/elevenlabs-tts.py …` instead of `python scripts/kokoro-tts.py …` — same flags, same output contract (`narration.wav` + `transcript.json` with the same word-timestamp shape).

**Output is identical from the downstream pipeline's perspective.** Both scripts write a flat-array `transcript.json` keyed on `{word, start, end}`. `scripts/compute_timings.py`, `npx hyperframes lint`, and the GSAP timeline edits all work without modification.

**First-run cost for Kokoro:** a one-time ~325MB model download from Hugging Face. After that, generation is fully offline and runs on CPU at roughly real-time speed (a 30-second short generates in ~30-40 seconds on a modern laptop).

## Voice tuning (ElevenLabs)

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

## Remote workflow state (optional Postgres / Neon)

By default Archon stores workflow runs, conversation messages, and isolation state in a local SQLite file at `~/.archon/archon.db`. Fine for a single machine. If you want shared/remote state — multiple machines hitting the same history, queryable from a dashboard, or just durability beyond the laptop — point Archon at a Postgres database instead.

### Switch to Postgres

Set `DATABASE_URL` in `~/.archon/.env` (applies to every project on this machine) or `<project>/.archon/.env` (this project only):

```bash
# Neon (recommended for zero-ops Postgres)
DATABASE_URL=postgresql://USER:PASSWORD@ep-xxxx.region.aws.neon.tech/dbname?sslmode=require

# Self-hosted / Supabase / RDS
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/dbname
```

Verify it took:

```bash
archon doctor   # Database line should now read: reachable (postgresql)
```

That's it. No migration command — Archon initializes its schema on first connect.

### Caveats

- **One-way switch.** Setting `DATABASE_URL` does not import your existing SQLite history. Dump it manually if you care: `sqlite3 ~/.archon/archon.db .dump > archon-backup.sql`.
- **Per-repo override wins.** If you put `DATABASE_URL` in both `~/.archon/.env` and `<project>/.archon/.env`, the project file wins for workflows run inside that repo.
- **Neon free tier suspends idle.** First connect after suspend pays a cold-start (~1s). Not a problem for `archon workflow run` (long-running anyway), but `archon doctor` may feel slow on a cold DB.
- **SSL is mandatory on managed hosts.** Always append `?sslmode=require` to the Neon URL (their dashboard does this for you).

## Output

```
videos/<slug>/
├── index.html              ← root composition (HTML + GSAP timeline)
├── meta.json, hyperframes.json, DESIGN.md, README.md
├── script.txt              ← narration source (with <break> tags inline)
├── audio/
│   ├── narration.wav       ← Kokoro 24kHz PCM, or ElevenLabs (MP3 decoded via ffmpeg)
│   └── narration-chunks/   ← per-chunk intermediates if you use chunked ElevenLabs mode (gitignored)
├── transcript.json         ← word-level timestamps (same shape from either TTS engine)
├── assets/                 ← per-template assets (logos, etc.)
└── out/                    ← rendered MP4 (gitignored)
```

`videos/<slug>/` is committed to git so every generation is a permanent gallery entry. Only the rendered MP4 and per-chunk TTS intermediates are gitignored.

## Customization

- **TTS engine** — pick Kokoro (free, default) or ElevenLabs (paid) via the appropriate `.env` vars; see "TTS engines" above.
- **Voice (Kokoro)** — set `KOKORO_VOICE` in `.archon/.env`. Catalog: <https://huggingface.co/hexgrad/Kokoro-82M/blob/main/VOICES.md>.
- **Voice (ElevenLabs)** — set `ELEVENLABS_VOICE_ID` in `.archon/.env`. Documented presets: Brian `nPczCjzI2devNBz1zQrb`, Adam `pNInz6obpgDQGcFmaJgB`, Daniel `onwK4e9ZLuTAKqWW03F9`. Or use your own clone's ID.
- **Voice tuning matrix (ElevenLabs)** — see `.env.example` and the table above.
- **Default duration** — edit `let duration = 30;` in any `.archon/workflows/create-<template>-short.yaml` (the `parse-input` JS).
- **Range guard** — same file: `if (duration < 10 || duration > 300)` clamps to 10s-5min.
- **Slug stopwords** — same file: `STOPWORDS` Set; add product/company names so they don't bloat slugs.
- **Script style rules** — each playbook at `.claude/skills/diy-yt-creator/new-<template>-short.md` step 4 documents break-tag layout, CAPS guidance, abbreviation conventions.

## Repo layout

```
.
├── .archon/
│   ├── workflows/
│   │   ├── create-classic-short.yaml           ← spawns a brand-neutral short (DEFAULT)
│   │   ├── create-archon-short.yaml            ← spawns an Archon-themed short
│   │   └── create-anthropic-short.yaml         ← spawns an Anthropic-themed short
│   ├── commands/
│   │   ├── create-classic-short.md             ← AI command driving the classic playbook
│   │   ├── create-archon-short.md              ← AI command driving the Archon playbook
│   │   └── create-anthropic-short.md           ← AI command driving the Anthropic playbook
│   ├── plans/port-create-archon-short.md       ← origin-port reference
│   └── config.yaml
├── .claude/
│   ├── rules/                                  ← project-wide rules the AI follows
│   └── skills/
│       ├── diy-yt-creator/                     ← the playbooks (one per template)
│       ├── hyperframes/                        ← framework patterns (palettes, refs)
│       ├── hyperframes-cli/                    ← CLI command reference
│       └── archon/                             ← Archon workflow authoring docs
├── templates/shorts/
│   ├── classic/                                ← brand-neutral template (deep navy + blue/sky-blue) — DEFAULT
│   ├── archon/                                 ← Archon-themed template (dark blue + cyan/magenta)
│   └── anthropic/                              ← Anthropic-themed template (near-black + orange/cream)
├── scripts/
│   ├── kokoro-tts.py                           ← FREE local TTS (Apache-licensed, ~325MB model, espeak-ng)
│   ├── elevenlabs-tts.py                       ← PAID ElevenLabs TTS with MP3 + ffmpeg decode
│   ├── tts_lib.py                              ← chunked-generation lib for ElevenLabs (delta-regen)
│   ├── compute_timings.py                      ← derives phase boundaries, slam_t, hero entrance, etc.
│   └── list_voices.py                          ← list available ElevenLabs preset voices
└── videos/<slug>/                              ← one folder per generated short
```

## Caveats

- **Kokoro first run downloads ~325MB.** The Hugging Face model cache lives at `~/.cache/huggingface/`. After the first run, generation is fully offline. If you see a "model not found" error, your network blocked the download — set `HF_HUB_OFFLINE=0` and retry.
- **Kokoro needs `espeak-ng` system-wide.** This is a separate install (not in pip). See Quick Start step 3 for the OS-specific install command. If the script errors with "espeak-ng not found," that's the cause.
- **ElevenLabs PCM output is Pro-tier only.** `scripts/tts_lib.py` requests `mp3_44100_128` (available on Creator and below) and decodes to PCM via ffmpeg. If you're on Pro and want pure PCM, edit `tts_lib.py` to switch `output_format`.
- **Phantom punctuation in transcripts.** ElevenLabs occasionally emits a standalone `.` word around `<break>` tags. `clean_sync_data` in `tts_lib.py` filters these defensively so phase-boundary math doesn't drift. (Kokoro doesn't have this issue.)
- **Break-tag re-entry artifacts (ElevenLabs).** Phase-boundary `<break>` durations of 0.65s+ can cause an audible click/breath when the model resumes. The playbook uses 0.4s for phase breaks and 0.35s for inter-sentence breaks — proven artifact-free in 20+ test runs.
- **Speed ceiling is 1.15 (both engines).** Going to 1.20 compresses phonemes (more garbled output) AND flattens sentence-final intonation (sentences sound mid-thought, like they didn't end).
- **Bun on Windows + multi-line `bun -e`.** Archon spawns inline bun scripts via Node's `execFile`; on Windows, bun truncates the script at the first newline (silent — exit 0, no error). The `parse-input` node uses a bash wrapper (`mktemp` + `bun run`) to avoid this.
- **AI fabrication risk.** If WebFetch / WebSearch fails, the playbook may invent statistics. If you spot fabrications, restart with a source URL embedded in the topic ("Topic — see https://example.com/blog/").
- **Repo name is historical.** This stack pivoted from Remotion to HyperFrames mid-2026. The repo name reflects the original Remotion-based project; the active stack on `main` is HyperFrames.

## Provenance

Ported from `diy-yt-creator-hyperframes`. Current `main` is HyperFrames + (Kokoro or ElevenLabs) single-call with the tuned settings matrix documented above. ElevenLabs voice settings, break-tag durations, and the MP3 + ffmpeg decode pipeline were validated over a live tuning session. Kokoro support was added once the engine matured to MOS 4.5 with native word-level timestamps — the same `transcript.json` shape works for both engines downstream.

## License

MIT
