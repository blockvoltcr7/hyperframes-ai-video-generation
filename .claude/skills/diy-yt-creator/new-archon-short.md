# new-archon-short — Playbook

End-to-end pipeline that turns a **topic prompt** into a previewable HyperFrames Short in the Archon dark-blue / cyan-magenta aesthetic. Zero manual steps; ends at preview, never renders.

> **For research + scriptwriting first**: see `/diy-yt-creator:full-auto`. That orchestrator runs phases 0-3.5 (research → plan → script → critique → fact-check → retention strategy) and writes the artifacts under `videos/<slug>/` that step 4 below picks up via Branch A. Use the pipeline by default; use this skill directly only when you already have a script.

This playbook is the Archon-template analog of [new-anthropic-short.md](./new-anthropic-short.md). The shape is identical — only the template, palette, and a few template-specific quirks differ. If you've used `new-anthropic-short`, the deltas are:

- Template: `templates/shorts/archon/` (instead of `templates/shorts/anthropic/`)
- Palette: cyan / magenta / purple / blue rotation (instead of orange / purple / blue / green); orange has NO role in the Archon palette
- Hero slam: uses a cyan→magenta gradient text-fill with a 4s `background-position` drift — the signature Archon flourish. Use ONCE per video.
- Top banner: shipped as `<img id="top-banner-icon">` + CSS-rendered `<div id="top-banner-wordmark">` in the gradient. Archon's source repo currently ships only an icon PNG (no SVG wordmark) — when one lands upstream, swap the composite for a single `<img>`.
- Logo asset: `assets/archon-logo.png` is already inside the template (copied from `dynamous/Archon/assets/logo.png`). For Archon-themed videos, no logo copy step is needed.

## Inputs

User provides ONE of:

- A **topic / prompt** (e.g. _"Archon just shipped 1.0"_, _"Why agentic worktrees beat shared branches"_) — agent drafts the full script
- A **title + key facts** (e.g. _"Archon 1.0 — 20 workflows, 1 worktree per task, MIT licensed"_) — agent uses the facts verbatim, drafts the framing
- A **pre-written `script.txt`** — agent skips drafting (jump to step 5)

If the topic has no real source data and would require fabricated stats/dates, **stop and ask the user for a source URL** before proceeding. Never invent numbers.

## Outputs

A previewable HyperFrames project at `videos/<slug>/` with:

- `script.txt` — narration script
- `audio/narration.wav` — ElevenLabs TTS narration (single-call mode, MP3 fetched then decoded to WAV via ffmpeg)
- `transcript.json` — word-level timestamps
- `index.html` — composition filled with real content, transitions sync'd to spoken-word frames
- Preview studio open in the browser at the URL printed by `hyperframes preview`

The user runs render themselves: `npx hyperframes render videos/<slug> -o videos/<slug>/out/<slug>.mp4`.

---

## Steps

### 1. Confirm slug + title

Derive a kebab-case slug from the topic (3-6 words, no stopwords). Examples:

- "Archon just shipped 1.0" → `archon-1-0-launch`
- "Why agentic worktrees beat shared branches" → `agentic-worktrees-vs-branches`
- "Archon vs Claude Code Skills" → `archon-vs-skills-comparison`

Confirm with the user in one line: _"Spawning `videos/archon-1-0-launch/` — title 'Archon 1.0 Launch'. Proceed?"_ Skip confirmation if the user already gave you both.

### 2. Copy the template

```bash
cp -r templates/shorts/archon videos/<slug>
```

PowerShell: `Copy-Item -Recurse templates/shorts/archon videos/<slug>`

Verify the copy: `videos/<slug>/index.html`, `meta.json`, `hyperframes.json`, `DESIGN.md`, `README.md`, `audio/`, `assets/archon-logo.png`, `compositions/` should all exist.

### 3. Update meta.json

Replace the placeholders:

```json
{
  "id": "<slug>",
  "name": "<Title Case Name>"
}
```

### 3.5. Ask: Add Dynamous promotion?

Before any content goes in, ask the user the per-video opt-in question:

> **"Add Dynamous promotion to this Short? (y/N — default no)"**

Record the answer in `meta.json` for later audit:

```json
{
  "id": "<slug>",
  "name": "<Title Case Name>",
  "dynamousPromotion": false
}
```

#### On NO (default)

Add `"dynamousPromotion": false` to `meta.json` and proceed to Step 4 normally. The Short is identical to today's behavior.

#### On YES

1. Add `"dynamousPromotion": true` to `meta.json`.
2. Open [`videos/_template-wiring-snippet.md`](../../../videos/_template-wiring-snippet.md) and follow Steps 1–7. Specifically:
   - **Step 1** (badge) — paste-in component, fires at `t=3.0s`. Required.
   - **Step 2** (endcard) — sub-composition replacing the trailing 5.0s (sized to match YouTube end-screen window). Required.
   - **Step 3** (module interstitial) — only if `node scripts/find-dynamous-module.js <tags>` prints a real module. Skip if `NO_MATCH`.
   - **Step 4** (discount bubble) — only for tutorial / over-the-shoulder Shorts where the platform is on screen. Skip otherwise.
   - **Step 5** — append the locked outro line to `script.txt` after Branch A/B drafting (Step 4 below).
   - **Steps 6–7** — stub `videos/<slug>/description.md` and `videos/<slug>/pinned-comment.md` with the verbatim templates.
3. Run the wiring snippet's "Execution checklist" (Value Test, Friend Test, Hook Test, CTA softness, frictionless purchase) before previewing.
4. The endcard reserves the trailing 5.0s — adjust your final phase (CTA) so the host narration ends roughly 5s before total duration, leaving the endcard window to carry the close. Typical pattern: shrink the CTA phase to 3s and leave 2s of breathing room before the endcard fires.

**Don't wire any of the four artifacts on a NO answer.** A "no" never gets retroactively flipped — re-spawn the video to change the decision.

### 4. Draft the script

This step has two branches. **Try Branch A first** — if the pipeline ran, the script already exists and you should use it instead of inventing one.

#### Branch A — pipeline output exists (preferred)

If `videos/<slug>/scripts/full-script.md` exists (Phases 0-2b have run via `/diy-yt-creator:full-auto`):

1. READ `videos/<slug>/scripts/full-script.md` as the authoritative source of narration.
2. READ `videos/<slug>/plan.md` (if it exists) — pay attention to:
   - `## Composition Layout` (which phases / sub-comps the plan calls for)
   - `## Retention Component Picks` (the `retention_component_picks:` YAML block — per-scene marker / caption / audio-reactive / transition picks)
   - `## Data Timing Budget` (`data_start` / `data_duration` per scene in seconds)
3. READ `videos/<slug>/retention-strategy.md` (if it exists from Phase 3.5) — this is the most refined per-scene retention strategy and OVERRIDES the plan's picks where they differ. Phase 3.5 has access to the actual transcript timings; the plan does not.
4. Map the script's `## Scene N: <name>` sections onto the template's 4 phase archetypes (Hero / Stat / Workflow-cards / CTA). The plan's `composition_layout` tells you which scene maps to which template phase.
5. Skip Branch B's inline drafting entirely. Jump to step 4.5+ using the pipeline-supplied content.
6. If the plan calls for sub-compositions (`sub-composition` structural pick), follow CLAUDE.md key rule #5 to wire them via `data-composition-src`. The Archon Shorts template uses `inline-phase` only — sub-comps would only appear if Phase 1 explicitly chose them (rare for shorts).

If anything in the plan or retention-strategy looks wrong (e.g., it picks a retention component you don't recognize), STOP and tell the user — do NOT invent your own. The pipeline output is authoritative; if it's wrong, fix the plan first.

#### Branch B — no pipeline output (legacy / quick path)

If `videos/<slug>/scripts/full-script.md` does NOT exist, fall back to the inline drafting rules below. This is the legacy path — for any new video, prefer running `/diy-yt-creator:full-auto <topic>` first to produce a researched script, then come back here.

Map narration to the four phase archetypes the template ships:

| Phase | Duration target | What to write |
|---|---|---|
| **1 — Hero hook** | 5-7s | Mono overline (2-3 words, ALL CAPS): the section label. Secondary line (5-9 words): the setup. ONE slam word (1-2 syllables, ALL CAPS, **≤7 characters at 200px** — see "Hero word fit" below): the emotional payoff. Caption pill (4-8 words): the receipt. |
| **2 — Stat row** | 5-7s | Mono overline. Headline (5-9 words). Two huge numbers with 2-3 word labels each. Numbers MUST be real. |
| **3 — Workflow cards** | 6-8s | Mono overline. 3 labeled cards: short label / acronym (e.g. "PIV", "FIX", "RVW"), title (3-5 words), sub (3-6 words). For Archon videos, this often maps to workflow archetypes; for other Archon-adjacent topics, treat it as any 3-item dated/labeled list. |
| **4 — CTA** | 4-6s | Mono overline. URL pill (real, working URL — `archon.diy` for Archon brand videos). Subscribe pill ("Subscribe" or short variant). |

**Hero word fit (Archon-specific):** at the template's default 200px Inter 900 with `letter-spacing: -4px`, the hero slam word fits ~7 wide characters before overflowing the 920px max-width. If the user's slam word is longer (8-10 chars), drop `#p1-hero` font-size to 160-180px in step 8 — the template's CSS has a comment marking the line. Or shorten via synonym.

**Style rules for narration text (tuned for ElevenLabs single-call mode):**

- Short sentences. Periods are sentence-end full stops; commas are mid-sentence breaths.
- **`<break time="…s"/>` SSML tags between sentences are mandatory in single-call mode.** Without them ElevenLabs reads sentences as a continuous monologue and the result sounds rushed. See "Break tag layout" below for the tested durations.
- Em-dashes are fine on ElevenLabs (the older "no em-dashes" rule applied to Kokoro/edge-tts and does NOT apply here).
- **Natural abbreviations, not spaced letters.** Write `MIT`, `PR`, `DIY`, `PIV` — NOT `M I T`, `P R`, `D I Y`, `P I V`. Spaced forms were a Kokoro requirement; at ElevenLabs style ≥0.7 they trip the model and produce garbled phonemes. For long abbreviations that need extra clarity ("PIV"), separate from the expansion with an em-dash: `PIV — plan, implement, validate.`
- Numbers: write digits, not words ("21 thousand", not "twenty-one thousand") — matches the visual stat pills.
- **Selective CAPS on 1-2 power words per phase** = localized energy without retuning the voice. The hero slam word in phase 1 is always CAPS (e.g. `AGENTIC`). Add one more in phases 2 or 4 for emphasis (e.g. `FREE FOREVER`, `GET STARTED`). Don't go higher than ~2 CAPS per phase or the read feels shouty.
- Total target: 24-45s of narration. Going past 60s is fine for content-dense topics.

**Break tag layout** (these are the tested durations; deviating risks artifacts or pacing problems):

| Position | `<break time>` | Why |
|---|---|---|
| Between sentences inside a phase | `0.35s` | Natural sentence-final intonation lands; not so long it drags |
| Between list items (e.g. PIV / Fix / Review in phase 3) | `0.45s` | Slightly longer to mark each item as discrete |
| **End of each phase** | `0.4s` | **Critical**: longer than this causes a re-entry artifact (click / breath / vocalization) on the first word of the next phase |

Save to `videos/<slug>/script.txt`. Use this exact format (one phase per blank-line block, with inline break tags):

```
[phase 1 sentence one]. <break time="0.35s"/> [phase 1 sentence two]. <break time="0.35s"/> [phase 1 sentence three]. <break time="0.4s"/>

[phase 2 narration with inline breaks]. <break time="0.4s"/>

[phase 3 narration with inline breaks]. <break time="0.4s"/>

[phase 4 narration with inline breaks].
```

The blank lines between phases are NOT spoken; they help you map narration to phases when you read the transcript back later. The trailing `<break time="0.4s"/>` after each phase is what actually inserts the phase-boundary silence — the blank line alone doesn't do it in single-call mode.

### 4.5. (Optional) Ground the script in real source content

**Skip if**: the topic is text-only opinion / commentary, OR the user already provided full key facts verbatim, OR the source is reachable via plain `WebFetch` (static HTML, e.g. an Archon release-notes Markdown page on GitHub).

**Use when**: the source is a JS-rendered page (the live Archon dashboard, a SPA, a blog with dynamic content), or you need to verify a specific stat / quote / version number against the current state of the page (anti-fabrication rule, see step 4).

For text grounding, invoke `/agent-browser` directly:

```bash
agent-browser open "<source_url>" \
  && agent-browser wait --load networkidle \
  && agent-browser get text body
```

Read the output. Cross-check every stat / date / quote in the draft `script.txt` against this text. If a fact in the script can't be found in the page text, remove it or ask the user. NEVER preserve a fabricated fact just because the draft was already written.

For visual grounding (per-app screenshots used inside phase 3 cards), use the `capture-asset` sub-playbook — see step 8 below. Note the user instruction: agent-browser launches its own Chromium — never close the user's main Chrome.exe.

### 5. Generate TTS (ElevenLabs, single-call)

```bash
python scripts/elevenlabs-tts.py videos/<slug> --shorts --no-chunk
```

**Always use `--no-chunk` for shorts.** Single-call mode gives ElevenLabs the full script in one request so cross-sentence prosody flows naturally. The default chunked mode (sentence-by-sentence API calls) loses the prosodic arc and produces "polished but flat" reads where each sentence is delivered in isolation. Chunked mode has one upside — delta-regen — but on a 30s short with ~6 chunks the savings don't outweigh the prosody cost.

The script reads `videos/<slug>/script.txt`, generates audio via the ElevenLabs API, and writes BOTH `videos/<slug>/audio/narration.wav` AND `videos/<slug>/transcript.json` (word-level character-time alignment from ElevenLabs `convert_with_timestamps`). Step 6 (transcribe) is therefore SKIPPED — ElevenLabs returns alignment data inline, no Whisper pass needed.

The script loads `.env` from both `repo_root/.env` and `repo_root/.archon/.env` — most users keep ElevenLabs credentials in `.archon/.env` alongside other Archon-related secrets.

**Voice / model / settings are read from `.env`.** See `.env.example` for the full list with documented defaults. The tested-good values for an Instant Voice Clone on shorts are:

| Var | Tested-good for IVC clone | Tested-good for Eleven preset | Notes |
|---|---|---|---|
| `ELEVENLABS_VOICE_ID` | (your clone ID) | `nPczCjzI2devNBz1zQrb` (Brian) | Other preset males: Adam legacy `pNInz6obpgDQGcFmaJgB`, Daniel `onwK4e9ZLuTAKqWW03F9` |
| `ELEVENLABS_MODEL_ID` | `eleven_multilingual_v2` | `eleven_multilingual_v2` | Multilingual reads with more expressive range than turbo. Turbo (`eleven_turbo_v2_5`) is faster + cheaper but flatter |
| `ELEVENLABS_STABILITY` | `0.40` | `0.45` | **Tuning matrix**: below 0.30 → phoneme artifacts ("incoherent words"); above 0.50 → monotone |
| `ELEVENLABS_SIMILARITY_BOOST` | `0.75` | `0.75` | **Counter-intuitive**: ElevenLabs defaults this to 0.85 but high values lock the model to the static reference timbre and suppress dynamic prosody. 0.75 gives the model room to be expressive |
| `ELEVENLABS_STYLE` | `0.70` | `0.30` | **For shorts you need more excitement than the docs suggest**. Above 0.75 → artifacts return; below 0.50 → flat. Sweet spot is 0.65–0.70 |
| `ELEVENLABS_SPEED` | `1.00` | `1.00` | Long-form default |
| `ELEVENLABS_SPEED_SHORTS` | `1.15` | `1.15` | **Ceiling is 1.15**. 1.20 compresses phonemes (artifacts) and flattens sentence-final falling intonation (sentences sound mid-thought) |
| `ELEVENLABS_USE_SPEAKER_BOOST` | `true` | `true` | Recommended for vertical audio |

**Tier note**: ElevenLabs gates `pcm_*` output formats behind the Pro tier. `tts_lib.py` requests `mp3_44100_128` (available on Creator and below) and decodes to PCM via ffmpeg. ffmpeg must be on `PATH`.

**Flags**:
- `--shorts` — use `ELEVENLABS_SPEED_SHORTS` instead of `ELEVENLABS_SPEED`
- `--no-chunk` — single API call (use this for shorts)
- `--force` — re-generate every chunk (no-op with `--no-chunk`)

If `ELEVENLABS_API_KEY` is missing the script exits 2 with a clear error. If a voice-settings var is missing it KeyErrors — confirm `.env` has all the vars above before running.

### 6. ~~Transcribe for word-level sync~~ (SKIPPED — handled by step 5)

`elevenlabs-tts.py` writes `transcript.json` directly from the ElevenLabs alignment payload. Do not run `npx hyperframes transcribe` after step 5 — it would overwrite the higher-quality character-time alignment with Whisper-estimated boundaries.

### 7. Compute phase boundaries

Run the timing helper instead of reimplementing this math inline:

```bash
python scripts/compute_timings.py videos/<slug>
```

(For non-Archon templates with a different slam word, pass `--slam-word YOURWORD`.)

The script reads `videos/<slug>/script.txt` and `videos/<slug>/transcript.json`, strips `<break>` SSML tags from the script before counting tokens, filters phantom-punctuation entries out of the transcript, and prints every timing value you need:

```
phase_word_counts=[…]
phase_ends=[p1e, p2e, p3e, p4e]
total_duration=…              # = phase4_end + 1.5 (CTA tail before loop)
narration_data_duration=…     # = phase4_end (audio element data-duration)
T1, T2, T3                    # = phaseNe - 0.2 (transition fire times)
P2, P3, P4                    # = TN + 0.4 (next phase entrance anchors)
slam_t                        # ALL-CAPS slam word start time (e.g. AGENTIC)
hero_entrance                 # = slam_t - 0.4 (hero scale-in anchor)
shake_offsets=[…]             # = [slam_t + i*0.05 for i in 0..3]
gradient_drift_duration       # = phase1_end - slam_t - 0.5
ambient_breath_half_period    # = total_duration / 2
```

Take these values into step 8.

**Why a script instead of inline math:** the computation looks straightforward but has two footguns that bit us during tuning iterations — (1) `<break>` SSML tags in script.txt aren't spoken words and must be stripped before counting tokens, otherwise phase 3's em-dash separator counts as a word and shifts T3 by ~0.3-0.8s; (2) ElevenLabs occasionally emits phantom punctuation entries (standalone `.`) in the transcript around `<break>` tags. `tts_lib.clean_sync_data` filters most of these but the helper script filters again defensively. Both issues are silent — you'd just see phase boundaries land late.

### 8. Edit `videos/<slug>/index.html`

Always invoke the `/hyperframes` skill before this step — it has the framework-specific rules.

Edit in this exact order (one Edit per change):

1. **`<title>`** in `<head>` → the video title
2. **`<div id="root">`** `data-duration` → `total_duration` (rounded to 0.1s)
3. **`#top-banner`** — for **Archon-themed videos**, leave the composite (`#top-banner-icon` + `#top-banner-wordmark`) as-is; the icon already points at `assets/archon-logo.png` which the template ships. For **non-Archon videos** that need a different brand banner, replace the entire `#top-banner-content` block with a single `<img id="top-banner-logo" src="assets/<file>" alt="<Brand>">` styled like the Anthropic template's banner (`width: 972px; margin: 0 auto;`) — and copy the `<file>` from `shared/logos/` into `videos/<slug>/assets/` first (see "Real logos" below). NEVER reference `shared/logos/` directly — the studio's preview server only serves files inside the project directory.
4. **Phase 1**: `#p1-overline`, `#p1-pre`, `#p1-hero` (the slam word — keep ≤7 chars at 200px, or drop to 160-180px in CSS for longer words), `#p1-caption`. The cyan→magenta gradient text-fill on `#p1-hero` is the signature Archon flourish — use it ONCE per video. If the user's video has multiple "wow" moments, only the hero gets the gradient; subsequent slams use a solid accent (cyan, magenta, purple, or blue).
5. **Phase 2**: `#p2-overline`, `#p2-headline`, both `.stat-pill` blocks (`.stat-num` and `.stat-label`). Pill accent classes are `.cyan` and `.magenta` — bookend accents that mirror the logo gradient. If you need different pills, swap to `.purple` or `.blue` but never use orange (no role in Archon palette).
6. **Phase 3**: `#p3-overline`, all three `.tl-card` blocks (`.tl-date`, `.tl-title`, `.tl-sub`). Rotate accent classes (`cyan` → `purple` → `blue`) so no two adjacent cards share an accent. Magenta is reserved for the CTA (Phase 4) — keeping it out of Phase 3 makes the closing pop hit harder.
7. **Phase 4**: `#p4-overline`, `#p4-url` (real URL — `archon.diy` for Archon brand videos), `#p4-subscribe` (usually leave as "Subscribe"). The CTA pill uses magenta — closing accent that mirrors Phase 1's gradient start.
8. **Transition timestamps**: replace `const T1 = 5.6;`, `const T2 = 11.6;`, `const T3 = 17.6;` with computed values
9. **Phase anchors**: replace `const P2 = 6.4;`, `const P3 = 12.4;`, `const P4 = 18.4;` with computed values
10. **Progress bar tween**: change `duration: 24` (in the `#progress-fill` `fromTo`) to the new `total_duration`
11. **Ambient breath**: change `duration: 12` (yoyo half-period) to `total_duration / 2`
12. **Hero entrance + slam shake** (both tied to `slam_t`):
    - **Entrance**: replace the `tl.from("#p1-hero", { scale: 0.78, opacity: 0, duration: 0.8 }, 3.53)` anchor with `hero_entrance` (from `compute_timings.py`; = `slam_t - 0.4`). This makes the scale-in animation land exactly when the slam word is spoken. The template ships with `3.53` from the original character-proportion estimate — leaving it stale produces a visible audio/video lag where AGENTIC appears noticeably before or after the spoken word.
    - **Shake**: replace the four `tl.to("#p1-hero", { x: ...}, <time>)` offsets with `shake_offsets`.
13. **Gradient drift**: update the `tl.fromTo("#p1-hero", { backgroundPosition: ... }, ..., 1.6)` line — change `1.6` to `slam_t` and `duration: 4.0` to `gradient_drift_duration` (= `phase1_end - slam_t - 0.5`, rounded to 0.1s)
14. **Audio element**: insert just before `</div>` (the closing tag of `#root`), at the same indent level as `<div id="phase4">`:

```html
  <audio id="narration"
         class="clip"
         src="audio/narration.wav"
         data-start="0"
         data-duration="<phase4_end>"
         data-track-index="2"
         data-volume="1"></audio>
```

15. **Wire SFX from `retention-strategy.md`** (skip if the file has no `sfx_cues` blocks):
    1. Read every `sfx_cues:` YAML block under each scene's "**SFX cues**" heading in `videos/<slug>/retention-strategy.md`.
    2. Build a deduplicated cue list: `cues = unique(all sfx_cues[].cue)`.
    3. Run: `bash scripts/sync-video-sfx.sh videos/<slug> ${cues[@]}` — copies each cue's `.mp3` from `shared/audio/sfx/` into `videos/<slug>/assets/sfx/`. The script errors if any cue is not in the library; resolve before continuing.
    4. For every `sfx_cues` entry across all scenes, insert an `<audio>` element below the `<audio id="narration">` block, in source order:

       ```html
         <audio id="sfx-<cue>-<scene-index>"
                class="clip"
                src="assets/sfx/<cue>.mp3"
                data-start="<computed_start>"
                data-duration="<duration_seconds>"
                data-track-index="<track_index>"
                data-volume="<volume>"></audio>
       ```

       Use `<computed_start> = transcript[anchor_word_index].start + offset_seconds` (rounded to 0.01s).
    5. Verify every `data-volume` is ≤ `0.25` (per [`.claude/rules/audio-design.md`](../../rules/audio-design.md)). The single allowed exception is `sfx-sonic-logo` at `0.6`.
    6. Verify track-index uniqueness for any concurrent cues (overlapping `[start, start+duration)` windows on the same `data-track-index` will trip lint).

### 8.5. Lib pick (optional)

The repo ships a shared visual library at [`shared/lib/`](../../../shared/lib/). The blocks (`stat-pill-row`, `timeline-cards`, `url-cta`), components (`ambient-radial`, `progress-bar`, `top-banner-wordmark`), and effects (`hero-slam-shake.js`, `phase-crossfade.js`, `stat-pill-pop.js`) used by the Archon template are the same canonical pieces extracted from the Anthropic template — most are palette-agnostic. The Archon template re-tunes them with the cyan/magenta/purple/blue palette inline.

**There is currently no `shared/lib/visual-styles/archon-dark.md` fragment** — only `anthropic-dark.md` exists. If you find yourself needing one (e.g. authoring a new template that should match the Archon aesthetic), create one based on `templates/shorts/archon/DESIGN.md`. For routine `new-archon-short` runs, you don't need this — the spawned template already inlines the Archon design tokens.

For each lib entry you want to reuse:

- **Block** (sub-composition): copy `shared/lib/blocks/<name>/block.html` into `videos/<slug>/compositions/<name>.html`. Wire it in `index.html` per the entry's `recipe.md`. Re-tune accent CSS variables to the Archon palette (`--cyan`, `--magenta`, `--purple`, `--blue`).
- **Component** (paste-in snippet): read `shared/lib/components/<name>/component.html`. Merge its HTML / CSS / JS sections into the host `index.html` per the comments at the top of the file. Same palette re-tune note applies.
- **Effect** (GSAP recipe): read `shared/lib/effects/<name>.js`. Effects are palette-independent — paste the function body into the host `<script>` (above the timeline construction) and call it from the timeline.
- **Tokens**: skip — the Archon template's `#root` CSS variables ARE the Archon tokens. Don't override.

**Never reference `shared/lib/` paths from `data-composition-src`, `<img src>`, `<audio src>`, `<video src>`, `<link href>`, or `<script src>` at runtime.** The HyperFrames bundler / preview server (`isSafePath` / `safePath` in `@hyperframes/core`) silently rejects paths outside the project directory. Always copy the file into `videos/<slug>/` first; reference it from the local copy.

### 9. Lint

```bash
npx hyperframes lint videos/<slug>
```

Must report `0 errors`. Fix any errors before continuing:

| Error | Likely cause | Fix |
|---|---|---|
| `audio_src_not_found` (narration) | `narration.wav` missing or path wrong | Check `videos/<slug>/audio/narration.wav` exists; case-sensitive paths |
| `audio_src_not_found` (sfx) | Cue `.mp3` missing from `assets/sfx/` | Run `bash scripts/sync-video-sfx.sh videos/<slug> <missing-cue>` |
| `overlapping_gsap_tweens` | Two tweens hit the same prop at the same time | Add `overwrite: "auto"` to the later tween, or shift its start |
| `overlapping_gsap_tweens` (sfx) | Two SFX on same `data-track-index` overlap in time | Bump second SFX to next track index (3 → 4 → 5) |
| `duplicate_media_discovery_risk` | Stray `<img src=...>` text in an HTML comment | Rephrase the comment |
| `missing_track_index` | Element has timing attrs but no `data-track-index` | Add it (use 2 for narration, 3+ for SFX) |

Warnings are advisory — read them but don't block on them.

### 10. Inspect for layout overflow

```bash
npx hyperframes inspect videos/<slug>
```

Common overflows on this template:

- **Hero slam word too wide** — the 200px font + the chosen word exceeds 1080px - 120px padding. The Archon template ships at 200px which fits ~7 wide chars (e.g. "AGENTIC"). For 8-10 char slam words ("PARALLEL", "WORKTREES", "AUTONOMOUS"), drop `#p1-hero` font-size to 160-180px. The template's CSS has a comment marking this line. Alternatively, shorten the word.
- **Stat pill labels wrap onto 3 lines** — labels >18 chars overflow the 460px pill. Shorten the label.
- **Workflow card title overflows** — 40px font + long title overflows the card's 940px width minus the date chip (160px) and index badge (56px). Shorten or drop title to 36px.

Fix overflow at the CSS or content level, then re-run `inspect` until clean.

### 11. Open preview (final step — never render)

Run in background so the studio stays open while you report:

```bash
npx hyperframes preview videos/<slug>
```

Capture the URL it prints (typically `http://localhost:5173`). Note: if the live Archon dashboard is also running on port `5173`, hyperframes preview will pick a different port — read it from the CLI output, don't assume `5173`.

### 11.5. (Optional) QA the rendered preview visually

**Skip if**: lint and inspect both passed cleanly AND the user wants a fast turnaround.

**Use when**: the composition involves new content patterns (custom animations, novel card layouts, atypical font sizes), OR the user explicitly asks "verify the preview".

Sub-playbook: `/diy-yt-creator qa-composition <slug>`. It will use `agent-browser` to snapshot each phase from the running preview server and report any visual issues (overflow, missing assets, broken image icons, leftover template placeholders).

Do NOT block on this step — it's advisory. Report findings in step 12.

### 12. Report to the user

One concise message containing:

- **Slug + path**: `videos/<slug>/`
- **Total duration**: `XX.Xs`
- **Voice**: `af_heart` (or whichever was used)
- **Preview URL**: `http://localhost:<port>` (read from the CLI output)
- **Render command** (do NOT run it): `npx hyperframes render videos/<slug> -o videos/<slug>/out/<slug>.mp4`
- **Any inspect findings** that needed manual content tradeoffs (e.g. "shortened slam word from WORKTREES to AGENTIC for fit at 200px")

That's it. Stop. Wait for user to iterate or trigger render manually.

---

## Quality bar — required before reporting done

- [ ] `npx hyperframes lint videos/<slug>` → 0 errors
- [ ] `npx hyperframes inspect videos/<slug>` → no overflow on hero word, stat pills, or workflow cards
- [ ] All four phases have real content (no leftover template placeholders: "AGENTIC", "Built for parallel work.", "20 / workflows shipped", "1 / worktree per task", "PIV / FIX / RVW", "archon.diy" — unless the video is genuinely about Archon and uses these as-is)
- [ ] Phase transition timestamps computed from transcript, NOT left at template defaults
- [ ] Audio element wired with correct `data-duration`
- [ ] Hero word fits at the chosen `#p1-hero` font-size — re-check if you changed the word
- [ ] Gradient text-fill (`#p1-hero` `background-clip: text`) appears on AT MOST one element in the entire composition
- [ ] No orange anywhere in the composition (no role in Archon palette)
- [ ] Preview URL is reachable (the `hyperframes preview` background command is still running)

If any item fails, fix it before reporting. Don't claim success on a half-built composition.

---

## Real logos — when the video isn't about Archon itself

For Archon-themed videos, `assets/archon-logo.png` is already in the template — don't replace it. For videos in the Archon aesthetic that cover OTHER topics (e.g. "Why Archon picked Bun over Node"), you may want a different brand in the top banner.

The repo ships a shared logo library at `shared/logos/` (84 PNG/SVG brand wordmarks and icons). **Never use styled text or pseudo-logos when a real one exists.**

**Important: copy logos into the project's `assets/`, do NOT reference `shared/logos/` directly.** The studio's preview server only serves files inside the project directory; an `../../shared/logos/...` path 404s in the studio (it'll work in `hyperframes render` but the preview shows a broken 21px placeholder, which silently fails lint).

**Workflow when swapping the banner away from Archon:**

```bash
# Copy each logo you need into the project's assets folder
cp shared/logos/<brand>-logo-light.svg videos/<slug>/assets/
```

Then rewrite `index.html` step 8.3 — replace the `#top-banner-content` composite (`#top-banner-icon` + `#top-banner-wordmark`) with a single `<img>`:

```html
<div id="top-banner">
  <img id="top-banner-logo" src="assets/<brand>-logo-light.svg" alt="<Brand>" />
</div>
```

…and add the wordmark-only CSS rules from the Anthropic template (`#top-banner-logo { width: 972px; margin: 0 auto; }`). Remove the `#top-banner-content`, `#top-banner-icon`, `#top-banner-wordmark` rules.

**Light vs dark variants**: this template is dark-stage (`--bg: #0A0E18`). Always pick the `*-light.svg` or `*-light.png` variant when available — it has white/cream marks that contrast on dark. Avoid `*-dark` variants (they'll be near-invisible).

For per-app screenshots inside Phase 3 cards (when an `app-logo` doesn't exist in `shared/logos/`), use `/diy-yt-creator capture-asset <slug> <url> <name>` — same pattern as the Anthropic playbook.

## Don'ts

- Never auto-render — user explicitly always triggers render manually.
- Never fabricate stats, dates, URLs, or quotes. Ask for source if missing.
- Never use a styled-text pseudo-logo when a real one exists in `shared/logos/`. See "Real logos" above.
- Never modify `templates/shorts/archon/` — only the copy under `videos/<slug>/`.
- Never use the cyan→magenta gradient text-fill on more than one element per video — it's the signature Archon flourish; using it twice dilutes it.
- Never use orange as an accent — it has no role in the Archon palette. If you need a warm accent, use yellow (`#E0AD3D`) and only for warnings.
- Never reference `shared/lib/` paths from `data-composition-src`, `<img src>`, `<audio src>`, `<video src>`, `<link href>`, or `<script src>` at runtime — the HyperFrames bundler silently rejects paths outside the project directory. Always copy the file into `videos/<slug>/` first.
- Never use `Math.random()` / `Date.now()` in the generated composition (HyperFrames is deterministic).
- Never write `<br>` in content text — use `max-width` for natural wrapping (HyperFrames `/hyperframes` skill rule).
- Never animate `visibility` or `display` — use opacity (HyperFrames rule). `tl.set({visibility: ...})` IS allowed (it's a state change, not a tween).
- Never skip the `/hyperframes` skill before editing the composition HTML.
- Never run multiple `new-archon-short` invocations in parallel against the same slug.
- Never run `agent-browser` (via `capture-asset` or `qa-composition`) against `localhost` or internal IPs without explicit user approval — only public URLs by default. Exception: the live Archon dashboard at `http://localhost:5173/dashboard`, which the user has explicitly authorized for grounding Archon-topic videos.
- Never close the user's main `Chrome.exe` — `agent-browser` launches its own Chromium, but if you ever need to kill browser processes, scope to that one only.
- Never store captured PNGs in `shared/` — they belong in `videos/<slug>/assets/` per `shared/README.md`.
- Never re-run `capture-asset` against the same URL for the same video without `--force` — wasteful and may rate-limit.
