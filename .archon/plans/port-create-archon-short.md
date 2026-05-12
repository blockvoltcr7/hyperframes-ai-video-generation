# Plan — Port `create-archon-short` Archon workflow to a greenfield project

This plan describes everything you need to copy from this repo
(`C:\Users\Leex279\Documents\GitHub\diy-yt-creator-hyperframes`) into a fresh
target repository so the `archon workflow run create-archon-short` command
works end-to-end. Source paths are absolute. Destination paths use the
placeholder `$TARGET` (Bash) / `$env:TARGET` (PowerShell) which you set in
Step 0.

> **Read first**: every file under the source root listed below is required
> unless explicitly marked Optional. The workflow's AI command file delegates
> to the canonical playbook `.claude/skills/diy-yt-creator/new-archon-short.md`,
> which in turn references the rules under `.claude/rules/` and the
> `hyperframes` skills — if any of those are missing in the target repo, the
> AI will not have the patterns it needs to author a valid composition.

---

## 0. Set the target

Pick ONE shell and set `TARGET` to the absolute path of your destination
repo (must already exist as a git repository):

```bash
# Bash / Git Bash
export TARGET="/c/path/to/your/greenfield-repo"
export SRC="/c/Users/Leex279/Documents/GitHub/diy-yt-creator-hyperframes"
cd "$TARGET" && git status   # sanity check — must be a git repo
```

```powershell
# PowerShell
$env:TARGET = "C:\path\to\your\greenfield-repo"
$env:SRC    = "C:\Users\Leex279\Documents\GitHub\diy-yt-creator-hyperframes"
Set-Location $env:TARGET
git status   # sanity check
```

All commands below assume both variables are exported.

---

## 1. Prerequisites (install on the host)

Verify each before copying — the workflow shells out to these at runtime:

| Tool | Version | Check | Install |
|---|---|---|---|
| Node.js | ≥ 18 | `node -v` | https://nodejs.org/ |
| pnpm | ≥ 8 | `pnpm -v` | `npm i -g pnpm` |
| npx | bundled with Node | `npx --version` | (comes with Node) |
| `hyperframes` CLI | latest | `npx hyperframes --version` | resolved on-demand by npx, no install needed |
| Python | ≥ 3.10 | `python --version` | https://www.python.org/ |
| `edge-tts` package | latest | `python -c "import edge_tts; print(edge_tts.__version__)"` | `pip install edge-tts` |
| `ffmpeg` | any recent | `ffmpeg -version` | https://ffmpeg.org/ (Windows: `winget install ffmpeg` or `choco install ffmpeg`) |
| `jq` | any | `jq --version` | Git for Windows ships it; or `winget install jqlang.jq` |
| `bun` | any | `bun --version` | https://bun.sh/ — required by Archon's `script` node with `runtime: bun` |
| Archon CLI | latest | `archon version` | `npm i -g @coleam00/archon` (or per https://archon.diy/getting-started/) |

Configure Archon's home env with your AI key — once, machine-wide:

```bash
# ~/.archon/.env  (create if missing — gitignored / never committed)
# At least ONE of these must be set:
ANTHROPIC_API_KEY=sk-ant-...
# or
CLAUDE_CODE_OAUTH_TOKEN=...
```

---

## 2. Create destination directory structure

```bash
# Bash
mkdir -p "$TARGET/.archon/workflows" \
         "$TARGET/.archon/commands" \
         "$TARGET/.archon/scripts" \
         "$TARGET/.archon/plans" \
         "$TARGET/.claude/rules" \
         "$TARGET/.claude/skills/diy-yt-creator" \
         "$TARGET/.claude/skills/hyperframes" \
         "$TARGET/.claude/skills/hyperframes-cli" \
         "$TARGET/templates/shorts/archon" \
         "$TARGET/scripts" \
         "$TARGET/shared/audio/sfx" \
         "$TARGET/videos"
```

```powershell
# PowerShell
"$env:TARGET\.archon\workflows",
"$env:TARGET\.archon\commands",
"$env:TARGET\.archon\scripts",
"$env:TARGET\.archon\plans",
"$env:TARGET\.claude\rules",
"$env:TARGET\.claude\skills\diy-yt-creator",
"$env:TARGET\.claude\skills\hyperframes",
"$env:TARGET\.claude\skills\hyperframes-cli",
"$env:TARGET\templates\shorts\archon",
"$env:TARGET\scripts",
"$env:TARGET\shared\audio\sfx",
"$env:TARGET\videos" | ForEach-Object { New-Item -ItemType Directory -Force -Path $_ | Out-Null }
```

---

## 3. Copy files — required

Each row is **source absolute path → destination relative to `$TARGET`**.

### 3.1 Archon plumbing (the workflow itself)

| Source (absolute) | Destination (under `$TARGET`) |
|---|---|
| `C:\Users\Leex279\Documents\GitHub\diy-yt-creator-hyperframes\.archon\workflows\create-archon-short.yaml` | `.archon/workflows/create-archon-short.yaml` |
| `C:\Users\Leex279\Documents\GitHub\diy-yt-creator-hyperframes\.archon\commands\create-archon-short.md` | `.archon/commands/create-archon-short.md` |

```bash
# Bash
cp "$SRC/.archon/workflows/create-archon-short.yaml" "$TARGET/.archon/workflows/"
cp "$SRC/.archon/commands/create-archon-short.md"    "$TARGET/.archon/commands/"
```

```powershell
# PowerShell
Copy-Item "$env:SRC\.archon\workflows\create-archon-short.yaml" "$env:TARGET\.archon\workflows\"
Copy-Item "$env:SRC\.archon\commands\create-archon-short.md"    "$env:TARGET\.archon\commands\"
```

### 3.2 Template the workflow spawns from

The whole `templates/shorts/archon/` directory:

| Source (absolute) | Destination |
|---|---|
| `C:\Users\Leex279\Documents\GitHub\diy-yt-creator-hyperframes\templates\shorts\archon\index.html` | `templates/shorts/archon/index.html` |
| `…\templates\shorts\archon\meta.json` | `templates/shorts/archon/meta.json` |
| `…\templates\shorts\archon\hyperframes.json` | `templates/shorts/archon/hyperframes.json` |
| `…\templates\shorts\archon\DESIGN.md` | `templates/shorts/archon/DESIGN.md` |
| `…\templates\shorts\archon\README.md` | `templates/shorts/archon/README.md` |
| `…\templates\shorts\archon\assets\archon-logo.png` | `templates/shorts/archon/assets/archon-logo.png` |
| `…\templates\shorts\archon\audio\` (whole dir incl. `.gitkeep`) | `templates/shorts/archon/audio/` |
| `…\templates\shorts\archon\compositions\` (whole dir, may be empty) | `templates/shorts/archon/compositions/` |

```bash
cp -r "$SRC/templates/shorts/archon" "$TARGET/templates/shorts/"
```

```powershell
Copy-Item -Recurse "$env:SRC\templates\shorts\archon" "$env:TARGET\templates\shorts\"
```

### 3.3 Scripts the workflow shells out to

| Source (absolute) | Destination | Notes |
|---|---|---|
| `C:\Users\Leex279\Documents\GitHub\diy-yt-creator-hyperframes\scripts\edge-tts-fallback.py` | `scripts/edge-tts-fallback.py` | **Required.** TTS + transcript in one shot. |
| `C:\Users\Leex279\Documents\GitHub\diy-yt-creator-hyperframes\scripts\sync-video-sfx.sh` | `scripts/sync-video-sfx.sh` | Required only if you want SFX support. The playbook calls it from step 15 of the index.html edit when SFX cues are wired. |
| `C:\Users\Leex279\Documents\GitHub\diy-yt-creator-hyperframes\scripts\tts_lib.py` | `scripts/tts_lib.py` | Optional. Not used by edge-tts path. Skip unless you also want ElevenLabs as a backup. |

```bash
cp "$SRC/scripts/edge-tts-fallback.py" "$TARGET/scripts/"
cp "$SRC/scripts/sync-video-sfx.sh"    "$TARGET/scripts/"   # if SFX
```

```powershell
Copy-Item "$env:SRC\scripts\edge-tts-fallback.py" "$env:TARGET\scripts\"
Copy-Item "$env:SRC\scripts\sync-video-sfx.sh"    "$env:TARGET\scripts\"   # if SFX
```

### 3.4 Project-wide rules (loaded by the AI when editing compositions)

The command file explicitly cites these six rules. The remaining four under
`.claude/rules/` are transitively referenced by the playbook and are cheap
to bring along — copy the whole directory.

| Source (absolute) | Destination | Status |
|---|---|---|
| `C:\Users\Leex279\Documents\GitHub\diy-yt-creator-hyperframes\.claude\rules\shorts-typography.md` | `.claude/rules/shorts-typography.md` | Required |
| `…\rules\shorts-thumbnail-final-frame.md` | `.claude/rules/shorts-thumbnail-final-frame.md` | Required |
| `…\rules\step-by-step-reveal.md` | `.claude/rules/step-by-step-reveal.md` | Required |
| `…\rules\visual-pacing-5s.md` | `.claude/rules/visual-pacing-5s.md` | Required |
| `…\rules\tts-pronunciation.md` | `.claude/rules/tts-pronunciation.md` | Required |
| `…\rules\audio-design.md` | `.claude/rules/audio-design.md` | Required (SFX volumes, alignment audit) |
| `…\rules\registry-blocks-catalog.md` | `.claude/rules/registry-blocks-catalog.md` | Recommended |
| `…\rules\screenshot-anchor-markers.md` | `.claude/rules/screenshot-anchor-markers.md` | Recommended |
| `…\rules\sub-composition-wiring.md` | `.claude/rules/sub-composition-wiring.md` | Recommended |
| `…\rules\video-speedup.md` | `.claude/rules/video-speedup.md` | Recommended |
| `…\rules\youtube-metadata.md` | `.claude/rules/youtube-metadata.md` | Optional (only if you'll publish to YouTube) |

```bash
cp -r "$SRC/.claude/rules/." "$TARGET/.claude/rules/"
```

```powershell
Copy-Item -Recurse "$env:SRC\.claude\rules\*" "$env:TARGET\.claude\rules\"
```

### 3.5 Skills (AI playbooks the command file delegates to)

| Source (absolute) | Destination | Status |
|---|---|---|
| `C:\Users\Leex279\Documents\GitHub\diy-yt-creator-hyperframes\.claude\skills\diy-yt-creator\new-archon-short.md` | `.claude/skills/diy-yt-creator/new-archon-short.md` | **Required** — the authoritative playbook |
| `…\skills\diy-yt-creator\SKILL.md` | `.claude/skills/diy-yt-creator/SKILL.md` | Required (skill manifest) |
| `…\skills\diy-yt-creator\new-anthropic-short.md` | `.claude/skills/diy-yt-creator/new-anthropic-short.md` | Recommended — playbook references it as "shape is identical to" |
| `…\skills\diy-yt-creator\capture-asset.md` | `.claude/skills/diy-yt-creator/capture-asset.md` | Optional — only if step 4.5 grounding-via-screenshot is used |
| `…\skills\diy-yt-creator\qa-composition.md` | `.claude/skills/diy-yt-creator/qa-composition.md` | Optional — only if step 11.5 visual-QA is used |
| `…\skills\hyperframes\` (whole directory, recursive) | `.claude/skills/hyperframes/` | **Required** — framework patterns |
| `…\skills\hyperframes-cli\SKILL.md` | `.claude/skills/hyperframes-cli/SKILL.md` | **Required** — CLI command reference |

```bash
# Required minimum
cp "$SRC/.claude/skills/diy-yt-creator/SKILL.md"             "$TARGET/.claude/skills/diy-yt-creator/"
cp "$SRC/.claude/skills/diy-yt-creator/new-archon-short.md"  "$TARGET/.claude/skills/diy-yt-creator/"
cp "$SRC/.claude/skills/diy-yt-creator/new-anthropic-short.md" "$TARGET/.claude/skills/diy-yt-creator/"
cp -r "$SRC/.claude/skills/hyperframes/."                    "$TARGET/.claude/skills/hyperframes/"
cp "$SRC/.claude/skills/hyperframes-cli/SKILL.md"            "$TARGET/.claude/skills/hyperframes-cli/"

# Optional add-ons
cp "$SRC/.claude/skills/diy-yt-creator/capture-asset.md"     "$TARGET/.claude/skills/diy-yt-creator/"  # if grounding
cp "$SRC/.claude/skills/diy-yt-creator/qa-composition.md"    "$TARGET/.claude/skills/diy-yt-creator/"  # if visual QA
```

```powershell
Copy-Item "$env:SRC\.claude\skills\diy-yt-creator\SKILL.md"             "$env:TARGET\.claude\skills\diy-yt-creator\"
Copy-Item "$env:SRC\.claude\skills\diy-yt-creator\new-archon-short.md"  "$env:TARGET\.claude\skills\diy-yt-creator\"
Copy-Item "$env:SRC\.claude\skills\diy-yt-creator\new-anthropic-short.md" "$env:TARGET\.claude\skills\diy-yt-creator\"
Copy-Item -Recurse "$env:SRC\.claude\skills\hyperframes\*"              "$env:TARGET\.claude\skills\hyperframes\"
Copy-Item "$env:SRC\.claude\skills\hyperframes-cli\SKILL.md"            "$env:TARGET\.claude\skills\hyperframes-cli\"
```

### 3.6 Repo-wide CLAUDE.md (loaded into every Claude session in the repo)

This is the most important transitively-loaded doc — it carries the 13
"Key Rules" and the "Hard rules across every command" that the AI follows
when editing compositions.

| Source (absolute) | Destination |
|---|---|
| `C:\Users\Leex279\Documents\GitHub\diy-yt-creator-hyperframes\CLAUDE.md` | `CLAUDE.md` |

```bash
cp "$SRC/CLAUDE.md" "$TARGET/CLAUDE.md"
```

```powershell
Copy-Item "$env:SRC\CLAUDE.md" "$env:TARGET\CLAUDE.md"
```

> **If the target already has a `CLAUDE.md`**: do NOT overwrite. Open both
> files side-by-side and merge — at minimum, append the "Skills — USE THESE
> FIRST" table and the "Key Rules" list (especially rules 1, 2, 5, 9, 10,
> 11, 12, 13) and the SFX/audio-design pointer. The playbook assumes these
> rules are in scope.

---

## 4. Copy files — optional (only if you want SFX support)

The default `create-archon-short` run does NOT require SFX — the script can
generate a clean preview without any cue files. Skip this section unless
your videos will wire phase-transition whooshes or stat-pill slams.

### 4.1 SFX library

| Source (absolute) | Destination |
|---|---|
| `C:\Users\Leex279\Documents\GitHub\diy-yt-creator-hyperframes\shared\audio\sfx\cinematic-whoosh.mp3` | `shared/audio/sfx/cinematic-whoosh.mp3` |
| `…\shared\audio\sfx\impact-slam.mp3` | `shared/audio/sfx/impact-slam.mp3` |
| `…\shared\audio\sfx\scale-slam.mp3` | `shared/audio/sfx/scale-slam.mp3` |
| `…\shared\audio\sfx\screen-shake.mp3` | `shared/audio/sfx/screen-shake.mp3` |
| `…\shared\audio\sfx\spring-pop.mp3` | `shared/audio/sfx/spring-pop.mp3` |
| `…\shared\audio\sfx\pop.mp3` | `shared/audio/sfx/pop.mp3` |
| `…\shared\audio\sfx\glitch-zap.mp3` | `shared/audio/sfx/glitch-zap.mp3` |
| `…\shared\audio\sfx\strike-cross.mp3` | `shared/audio/sfx/strike-cross.mp3` |
| `…\shared\audio\sfx\sonic-logo.mp3` | `shared/audio/sfx/sonic-logo.mp3` |
| `…\shared\audio\MANIFEST.md` | `shared/audio/MANIFEST.md` |

```bash
cp -r "$SRC/shared/audio/." "$TARGET/shared/audio/"
```

```powershell
Copy-Item -Recurse "$env:SRC\shared\audio\*" "$env:TARGET\shared\audio\"
```

### 4.2 Logo library (for non-Archon-branded videos)

The Archon template ships `assets/archon-logo.png` — sufficient for any
video about Archon itself. Skip this section unless you'll spawn shorts
about OTHER brands (e.g., "Why Archon picked Bun over Node" needs a Bun
logo in the top banner).

| Source (absolute) | Destination |
|---|---|
| `C:\Users\Leex279\Documents\GitHub\diy-yt-creator-hyperframes\shared\logos\` (whole dir, 84 brand wordmarks) | `shared/logos/` |

```bash
cp -r "$SRC/shared/logos" "$TARGET/shared/"
```

```powershell
Copy-Item -Recurse "$env:SRC\shared\logos" "$env:TARGET\shared\"
```

---

## 5. Update `.gitignore`

Append to `$TARGET/.gitignore` (create if missing):

```gitignore
# HyperFrames render artefacts and caches
**/.waveform-cache/
**/out/
**/renders/

# TTS chunk intermediates (regen-only)
videos/*/audio/narration-chunks/

# Archon runtime artifacts — NEVER commit
.archon/state/
.archon/.env

# Local environment
.env
.env.local
```

```bash
cat >> "$TARGET/.gitignore" <<'EOF'

# HyperFrames render artefacts and caches
**/.waveform-cache/
**/out/
**/renders/

# TTS chunk intermediates (regen-only)
videos/*/audio/narration-chunks/

# Archon runtime artifacts — NEVER commit
.archon/state/
.archon/.env
EOF
```

---

## 6. Verify the install

Run, from the target repo root:

```bash
cd "$TARGET"

# 6a. Archon sees the workflow
archon workflow list | grep create-archon-short
# Expected: a row "create-archon-short" with the Use-when/Triggers/Does block

# 6b. Workflow YAML validates
archon validate workflows create-archon-short
# Expected: "create-archon-short  ok"  +  "Results: 1 valid, 0 with errors"

# 6c. Command file validates
archon validate commands create-archon-short
# Expected: "create-archon-short  ok"

# 6d. Hyperframes CLI is reachable + template lints clean
npx hyperframes lint templates/shorts/archon
# Expected: 0 errors

# 6e. Edge-TTS imports and a voice probe works
python -c "import edge_tts; print('edge-tts OK')"

# 6f. ffmpeg is reachable
ffmpeg -version | head -1

# 6g. jq is reachable (used by the precheck bash node)
jq --version

# 6h. bun is reachable (used by the parse-input script node)
bun --version
```

If ANY check fails, fix before continuing — the first-run test below will
fail at exactly that step otherwise.

---

## 7. First-run smoke test

```bash
cd "$TARGET"

# Spawn a 30-second short about Archon's worktree isolation (default duration)
archon workflow run create-archon-short --no-worktree "Archon worktree isolation in 30 seconds"
```

Expected behavior:

1. `parse-input` (bun script) emits JSON like
   `{"topic":"Archon worktree isolation in 30 seconds","slug":"archon-worktree-isolation-30","duration":30,"title":"Archon Worktree Isolation In 30 Seconds"}`
   — note: the parser will catch the literal "30 seconds" as the duration.
   Adjust your topic phrasing if this is undesirable (e.g., drop "30 seconds"
   from the topic body and let the default kick in).
2. `precheck` (bash) prints `OK slug=<slug> duration=30s topic="..."`.
3. `create-short` (Claude AI command) runs the playbook — 5-15 minutes
   depending on research depth.
4. Final report: `videos/<slug>/` ready for preview at
   `http://localhost:5173`. Render command printed but NOT executed.

Open the preview URL in a browser to confirm the composition plays cleanly.
To render manually:

```bash
npx hyperframes render videos/<slug> -o videos/<slug>/out/<slug>.mp4
```

---

## 8. Customization notes

Things you'll likely want to tweak after porting:

### 8.1 Voice override

Default is `en-US-AndrewNeural` at `+10%` rate (warm male, tech-narration).
Two next-best draft voices (both emit usable WordBoundary timing):

- `en-US-BrianNeural` — approachable, casual
- `en-US-GuyNeural` — passionate

**Never override to** `en-US-AndrewMultilingualNeural` or
`en-US-BrianMultilingualNeural` — they emit empty WordBoundary arrays and
will break the transcript step silently.

Edit `.archon/commands/create-archon-short.md` step 5+6 to change the
default. Or pass the override as part of the topic if you teach the
parse-input script to recognize voice-override syntax.

### 8.2 Duration default

Hardcoded to 30s in the bun script node (`parse-input`). To change the
default, edit `.archon/workflows/create-archon-short.yaml` line:

```js
let duration = 30;
```

### 8.3 Range guard

The parse-input script clamps duration to `[10, 300]` seconds. Adjust the
`if (duration < 10 || duration > 300)` line if you want a different range.

### 8.4 Slug stopwords

Stopwords used for slug generation are defined in `parse-input`. Add
project-specific stopwords (your company name, product names) so they
don't bloat slugs.

### 8.5 ElevenLabs production voice (out of scope for this port)

The original playbook supports ElevenLabs as a production voice. If you
want that path later, also copy:

- `C:\Users\Leex279\Documents\GitHub\diy-yt-creator-hyperframes\scripts\elevenlabs-tts.py` → `scripts/elevenlabs-tts.py`
- `C:\Users\Leex279\Documents\GitHub\diy-yt-creator-hyperframes\scripts\tts_lib.py` → `scripts/tts_lib.py`
- Add to `$TARGET/.env`: `ELEVENLABS_API_KEY=...`, `ELEVENLABS_VOICE_ID=...`,
  `ELEVENLABS_SPEED_SHORTS=1.13`

And edit step 5+6 of `.archon/commands/create-archon-short.md` to branch
on a `--production` flag.

---

## 9. Quick port checklist (one-pager summary)

```
.archon/workflows/create-archon-short.yaml
.archon/commands/create-archon-short.md
templates/shorts/archon/                         (whole directory, recursive)
scripts/edge-tts-fallback.py
scripts/sync-video-sfx.sh                        (only if SFX)
.claude/rules/                                   (whole directory, recursive)
.claude/skills/diy-yt-creator/SKILL.md
.claude/skills/diy-yt-creator/new-archon-short.md
.claude/skills/diy-yt-creator/new-anthropic-short.md
.claude/skills/hyperframes/                      (whole directory, recursive)
.claude/skills/hyperframes-cli/SKILL.md
CLAUDE.md
shared/audio/                                    (only if SFX, whole dir)
shared/logos/                                    (only for non-Archon branded videos)
.gitignore                                       (append the 3 blocks from §5)
```

Runtime deps: Node ≥18 + pnpm, Python ≥3.10 + `pip install edge-tts`,
ffmpeg, jq, bun, Archon CLI with `~/.archon/.env` configured.

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `archon workflow list` doesn't show `create-archon-short` | YAML in wrong path or invalid | `archon validate workflows create-archon-short`; check it's in `$TARGET/.archon/workflows/`, not `$TARGET/.archon/workflows/workflows/` |
| `parse-input` fails with `bun: not found` | bun missing from PATH | Install bun from https://bun.sh/ |
| `precheck` fails with `jq: command not found` | jq missing | Install jq (Git Bash on Windows usually has it; otherwise `winget install jqlang.jq`) |
| `create-short` fails at TTS step with `ModuleNotFoundError: edge_tts` | python `edge-tts` package missing | `pip install edge-tts` (make sure it's the SAME Python that the workflow shells out to — check `python --version`) |
| TTS step succeeds but transcript.json has empty `[]` | Multilingual voice was used | Verify the command uses `--voice en-US-AndrewNeural` (NOT `AndrewMultilingualNeural`) |
| `npx hyperframes lint` fails on the spawned video with `audio_src_not_found` | Wrong path or narration.wav missing | Confirm `videos/<slug>/audio/narration.wav` exists; case-sensitive on case-sensitive filesystems |
| `npx hyperframes preview` opens but the studio shows "Drop media here…" with duration `0:00/0:00` | Sub-composition wiring bug (data-composition-id mismatch) | Read `.claude/rules/sub-composition-wiring.md` — verify parent's `data-composition-id` matches the child file's root `data-composition-id` |
| AI fabricates stats or version numbers | `WebSearch` / `WebFetch` failed and the AI fell back to invention | Stop the run, restart with a source URL in the topic ("Archon 1.0 launch — see https://archon.diy/blog/1.0") |
| Workflow runs but lands on the wrong branch | Forgot `--no-worktree` | Always pass `--no-worktree` — the workflow's `worktree.enabled: false` will reject `--branch` anyway, but `--no-worktree` is explicit |

---

## 11. Tearing down (if you want to remove the workflow)

```bash
rm "$TARGET/.archon/workflows/create-archon-short.yaml"
rm "$TARGET/.archon/commands/create-archon-short.md"
# The template, scripts, rules, skills remain — they're shared infrastructure.
# To fully un-port, delete everything from the §9 checklist.
```

---

End of plan.
