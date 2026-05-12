# new-anthropic-short — Playbook

End-to-end pipeline that turns a **topic prompt** into a previewable HyperFrames Short in the Anthropic dark-stage aesthetic. Zero manual steps; ends at preview, never renders.

> **For research + scriptwriting first**: see `/diy-yt-creator:full-auto`. That orchestrator runs phases 0-3.5 (research → plan → script → critique → fact-check → retention strategy) and writes the artifacts under `videos/<slug>/` that step 4 below picks up via Branch A. Use the pipeline by default; use this skill directly only when you already have a script.

## Inputs

User provides ONE of:

- A **topic / prompt** (e.g. _"Anthropic just shipped Claude Code Skills"_) — agent drafts the full script
- A **title + key facts** (e.g. _"Opus 4.7 launch — 1M context, 47% on SWE-bench, $5/M tokens"_) — agent uses the facts verbatim, drafts the framing
- A **pre-written `script.txt`** — agent skips drafting (jump to step 5)

If the topic has no real source data and would require fabricated stats/dates, **stop and ask the user for a source URL** before proceeding. Never invent numbers.

## Outputs

A previewable HyperFrames project at `videos/<slug>/` with:

- `script.txt` — narration script
- `audio/narration.wav` — ElevenLabs TTS narration (via `python scripts/elevenlabs-tts.py`)
- `transcript.json` — word-level timestamps (returned directly by ElevenLabs alignment — no separate transcribe step)
- `index.html` — composition filled with real content, transitions sync'd to spoken-word frames
- Preview studio open in the browser at the URL printed by `hyperframes preview`

The user runs render themselves: `npx hyperframes render videos/<slug> -o videos/<slug>/out/<slug>.mp4`.

---

## Steps

### 1. Confirm slug + title

Derive a kebab-case slug from the topic (3-6 words, no stopwords). Examples:

- "Anthropic just shipped Claude Code Skills" → `claude-code-skills-launch`
- "Opus 4.7 ships with 1M context" → `opus-47-1m-context`
- "Why GPT-5 lost the SWE-bench crown" → `gpt5-swe-bench-loss`

Confirm with the user in one line: _"Spawning `videos/claude-code-skills-launch/` — title 'Claude Code Skills Launch'. Proceed?"_ Skip confirmation if the user already gave you both.

### 2. Copy the template

```bash
cp -r templates/shorts/anthropic videos/<slug>
```

PowerShell: `Copy-Item -Recurse templates/shorts/anthropic videos/<slug>`

Verify the copy: `videos/<slug>/index.html`, `meta.json`, `hyperframes.json`, `DESIGN.md`, `audio/`, `assets/`, `compositions/` should all exist.

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
4. Map the script's `## Scene N: <name>` sections onto the template's 4 phase archetypes (Hero / Stat / Timeline / CTA). The plan's `composition_layout` tells you which scene maps to which template phase.
5. Skip Branch B's inline drafting entirely. Jump to step 4.5+ using the pipeline-supplied content.
6. If the plan calls for sub-compositions (`sub-composition` structural pick), follow CLAUDE.md key rule #5 to wire them via `data-composition-src`. The Anthropic Shorts template uses `inline-phase` only — sub-comps would only appear if Phase 1 explicitly chose them (rare for shorts).

If anything in the plan or retention-strategy looks wrong (e.g., it picks a retention component you don't recognize), STOP and tell the user — do NOT invent your own. The pipeline output is authoritative; if it's wrong, fix the plan first.

#### Branch B — no pipeline output (legacy / quick path)

If `videos/<slug>/scripts/full-script.md` does NOT exist, fall back to the inline drafting rules below. This is the legacy path — for any new video, prefer running `/diy-yt-creator:full-auto <topic>` first to produce a researched script, then come back here.

Map narration to the four phase archetypes the template ships:

| Phase | Duration target | What to write |
|---|---|---|
| **1 — Hero hook** | 5-7s | Mono overline (2-3 words, ALL CAPS): the section label. Secondary line (5-9 words): the setup. ONE slam word (1-2 syllables, ALL CAPS): the emotional payoff. Caption pill (4-8 words): the receipt. |
| **2 — Stat row** | 5-7s | Mono overline. Headline (5-9 words). Two huge numbers with 2-3 word labels each. Numbers MUST be real. |
| **3 — Timeline** | 6-8s | Mono overline. 3 dated cards: date (e.g. "Mar 4"), title (3-5 words), sub (3-6 words). Real dates only. |
| **4 — CTA** | 4-6s | Mono overline. URL pill (real, working URL). Subscribe pill ("Subscribe" or short variant). |

**Style rules for narration text:**

- Read `.claude/references/script-library.md` first — its annotated gold-standard examples set the rhythm target. The rules below are the fence; the library is the goal.
- Short sentences. Kokoro TTS reads commas as breaths and periods as full pauses.
- Never use semicolons or em-dashes in script.txt — Kokoro stumbles. Use periods.
- Numbers: write digits, not words ("3 bugs", not "three bugs") — matches the visual stat pills.
- Total target: **~90s of narration (default)**. The 90s budget gives room for context + 1-2 evidence layers + CTA, which 45s consistently underdelivers on. Going shorter (45-60s) is allowed for thin topics; going longer (up to 180s) is fine for dense content.

Save to `videos/<slug>/script.txt`. Use this exact format (one phase per blank-line block):

```
[phase 1 narration]

[phase 2 narration]

[phase 3 narration]

[phase 4 narration]
```

The blank lines are NOT spoken; they help you map narration to phases when you read the transcript back later.

### 4.5. (Optional) Ground the script in real source content

**Skip if**: the topic is text-only opinion / commentary, OR the user already provided full key facts verbatim, OR the source is reachable via plain `WebFetch` (static HTML, e.g. a release-notes Markdown page on GitHub).

**Use when**: the source is a JS-rendered page (SPA, dashboard, blog with dynamic content), or you need to verify a specific stat / quote / version number against the current state of the page (anti-fabrication rule, see step 4).

For text grounding, invoke `/agent-browser` directly:

```bash
agent-browser open "<source_url>" \
  && agent-browser wait --load networkidle \
  && agent-browser get text body
```

Read the output. Cross-check every stat / date / quote in the draft `script.txt` against this text. If a fact in the script can't be found in the page text, remove it or ask the user. NEVER preserve a fabricated fact just because the draft was already written.

For visual grounding (per-app screenshots used inside phase 3 cards), use the `capture-asset` sub-playbook — see step 8 below.

### 4.6. Trust-signal screenshot (REQUIRED for news / blog / announcement topics)

**Required when**: the topic is an Anthropic news post, an official blog announcement, a press release, a release-note page, or any "this just happened, here's the source" framing. Examples: `anthropic.com/news/*`, `anthropic.com/research/*`, `openai.com/blog/*`, `claude.com/release-notes/*`. The screenshot is the receipt — viewers see the headline + dateline + page chrome and trust the claim within ~2-3s.

**Skip when**: the topic is opinion / commentary / explainer not tied to a single canonical source page, OR the user already supplied a screenshot.

**Capture command** (Playwright via Python — gives a clean 1024×1200 capture with cookie banners dismissed):

```bash
python -c "
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    ctx = browser.new_context(viewport={'width': 1024, 'height': 1200}, device_scale_factor=2)
    page = ctx.new_page()
    page.goto('<source_url>', wait_until='networkidle')
    for sel in ['button:has-text(\"Reject all cookies\")', 'button:has-text(\"Accept all cookies\")', 'button:has-text(\"OK\")']:
        try: page.locator(sel).first.click(timeout=2000); break
        except Exception: pass
    page.wait_for_timeout(1500)
    page.screenshot(path='videos/<slug>/assets/<slug>-source-page.png', full_page=False)
    browser.close()
"
```

(If Playwright's chromium isn't installed, use the bundled hyperframes chrome-headless-shell with `--window-size=1024,1200 --hide-scrollbars --virtual-time-budget=8000 --screenshot=...` — but cookie banners may show.)

**Wire into the composition** in step 8 — see "Trust-signal card" sub-section there.

### 5. Generate TTS + transcript (one shot, ElevenLabs)

```bash
python scripts/elevenlabs-tts.py videos/<slug> --shorts
```

This writes BOTH `videos/<slug>/audio/narration.wav` AND `videos/<slug>/transcript.json` in a single API call. Voice ID, model ID, voice settings (stability, similarity, style, speed, speaker boost), and pronunciation dictionary are all loaded from the repo-root `.env` — never hardcode them. The `--shorts` flag selects `ELEVENLABS_SPEED_SHORTS` over `ELEVENLABS_SPEED`.

The transcript is returned by ElevenLabs' alignment API — character-level timestamps grouped into whitespace-delimited word tokens. No separate transcribe step is needed (skip the legacy `npx hyperframes transcribe` path; whisper is no longer required for any new video).

If the script changes, re-run this command — it overwrites both `narration.wav` and `transcript.json` atomically.

### 6. Transcript verification

The script writes `transcript.json` directly. Confirm it lands at `videos/<slug>/transcript.json` and the last word's `end` matches the audio duration printed by the script (they should match within 0.1s). No further action needed.

### 7. Compute phase boundaries

Read `transcript.json` and identify, in seconds:

- `phase1_end` — `end` time of the last word of the phase 1 narration block
- `phase2_end` — same for phase 2
- `phase3_end` — same for phase 3
- `phase4_end` — `end` time of the last word in the file
- `total_duration` = `phase4_end + 1.5` (1.5s tail for reading the CTA before loop)

Then compute the GSAP timeline anchors:

```
T1 = phase1_end - 0.2     // start phase1→phase2 transition 0.2s before last word ends
T2 = phase2_end - 0.2
T3 = phase3_end - 0.2

P2 = T1 + 0.4             // phase2 entrance anchor (after crossfade settles)
P3 = T2 + 0.4
P4 = T3 + 0.4
```

Also identify the timestamp of the **slam word** in phase 1 — the single ALL-CAPS payoff word. That's the new value for the inline-shake offsets in the template (the four `tl.to("#p1-hero", { x: ... })` lines, currently at 1.55-1.70).

```
slam_t = transcript[<slam-word-index>].start
shake_offsets = [slam_t, slam_t + 0.05, slam_t + 0.10, slam_t + 0.15]
```

### 8. Edit `videos/<slug>/index.html`

Always invoke the `/hyperframes` skill before this step — it has the framework-specific rules.

Edit in this exact order (one Edit per change):

1. **`<title>`** in `<head>` → the video title
2. **`<div id="root">`** `data-duration` → `total_duration` (rounded to 0.1s)
3. **`#top-banner-logo`** `src` → **always reference `assets/<file>` (a copy inside the project)**, never `../../shared/logos/<file>`. The studio's preview server can only serve files inside the project directory, so external paths render as a broken 21px placeholder even though `hyperframes render` handles them. Copy the logo first: `cp shared/logos/anthropic-logo-light.svg videos/<slug>/assets/`, then set `src="assets/anthropic-logo-light.svg"`. For other brands, copy the relevant file from `shared/logos/` into the project's `assets/` (see "Real logos" below). NEVER use a styled text div when a real logo exists in `shared/logos/`.
4. **Phase 1**: `#p1-overline`, `#p1-pre`, `#p1-hero` (the slam word), `#p1-caption`. **For news/blog/announcement topics (per step 4.6 above), ALSO add a trust-signal screenshot card** — see "Trust-signal card" below.
5. **Phase 2**: `#p2-overline`, `#p2-headline`, both `.stat-pill` blocks (`.stat-num` and `.stat-label`)
6. **Phase 3**: `#p3-overline`, all three `.tl-card` blocks (`.tl-date`, `.tl-title`, `.tl-sub`). Rotate accent classes (`orange` → `purple` → `blue`) so no two adjacent cards share an accent. If the user's data needs `green`, swap that in — but only one accent per card.
7. **Phase 4**: `#p4-overline`, `#p4-url` (real URL), `#p4-subscribe` (usually leave as "Subscribe")
8. **Transition timestamps**: replace `const T1 = 5.6;`, `const T2 = 11.6;`, `const T3 = 17.6;` with computed values
9. **Phase anchors**: replace `const P2 = 6.4;`, `const P3 = 12.4;`, `const P4 = 18.4;` with computed values
10. **Progress bar tween**: change `duration: 24` (in the `#progress-fill` `fromTo`) to the new `total_duration`
11. **Ambient breath**: change `duration: 12` (yoyo half-period) to `total_duration / 2`
12. **Slam shake**: replace the four `tl.to("#p1-hero", { x: ...}, <time>)` offsets with `shake_offsets`
13. **Audio element**: insert just before `</div>` (the closing tag of `#root`), at the same indent level as `<div id="phase4">`:

```html
  <audio id="narration"
         class="clip"
         src="audio/narration.wav"
         data-start="0"
         data-duration="<phase4_end>"
         data-track-index="2"
         data-volume="1"></audio>
```

14. **Wire SFX — defaults to transition-whoosh-only** (per `templates/shorts/anthropic/DESIGN.md` § Audio / SFX Cues and `.claude/rules/audio-design.md` § Anthropic Shorts — Default Cue Set):

    **DEFAULT (apply unless the user explicitly asks for more SFX):** wire ONLY `cinematic-whoosh` cues, one per phase transition, AND each whoosh's `data-start` MUST equal `sceneT - 0.4` (the moment `repositionShapesPerPhase()` starts the shape-backdrop reposition). Skip per-element impact-slams, scale-slams, spring-pops, pops, screen-shakes, glitch-zaps, strike-crosses, sonic-logo by default — they read as cluttered against the dark-stage aesthetic and pull attention from narration. Skip the entire retention-strategy `sfx_cues` block in default mode.

    Default wiring (one whoosh per transition):

    ```html
      <!-- SFX — phase-transition whooshes only.
           data-start = (T_n - 0.4) so the whoosh fires together with the shape-backdrop
           reposition (which starts at sceneT - 0.4 inside repositionShapesPerPhase). -->
      <audio id="sfx-whoosh-t1" class="clip" src="assets/sfx/cinematic-whoosh.mp3"
             data-start="<T1 - 0.4>" data-duration="0.84" data-track-index="3" data-volume="0.11"></audio>
      <audio id="sfx-whoosh-t2" class="clip" src="assets/sfx/cinematic-whoosh.mp3"
             data-start="<T2 - 0.4>" data-duration="0.84" data-track-index="3" data-volume="0.11"></audio>
      <!-- ...one per phase boundary T1..Tn... -->
    ```

    Sync the cue file into the project: `bash scripts/sync-video-sfx.sh videos/<slug> cinematic-whoosh`.

    **OPT-IN (only when the user asks for more SFX, OR the topic explicitly requires a layered audio stack — e.g., a stat-slam moment that loses impact without `scale-slam`):** then run the full retention-strategy-driven SFX wiring below. Document the override decision inline in `videos/<slug>/orchestration-log.md`.

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
    7. **SFX density cap (HARD)**: target **~2 SFX placements per 10 seconds of narration**, maximum **2.5/10s**. The reference is `videos/anthropic-100b-deal/index.html` (1.95/10s, 15 cues over 77s). Per-cue volumes from `audio-design.md` are already calibrated; the perception of "too loud" comes from density, not gain. Density audit: count `<audio id="sfx-...">` and divide by narration duration in 10s units. If you're over 2.5/10s, drop:
       - **Layered stacks of >2 cues** at the same anchor moment (typical offender: PIVOT moments with `impact-slam + screen-shake + glitch-zap + strike-cross` — keep at most 2 of those four). The reference has zero layered stacks.
       - **Mid-stagger pops** in 3+ card grids (keep first and last card pops, drop the middle ones). Example: a 4-card vertical grid gets 2 spring-pops, not 4.
       - **Secondary-stat slams** when a primary stat already has its slam (e.g., the dimmed `105K` next to a primary `30K` — only the primary needs a `scale-slam`).
       - **Subscribe-pill pops** when an `audio-reactive-glow` is already on the pill (pick one mechanism, not both).

### 8.3.1. Screenshot-anchor markers — NO horizontal-bar overlays on chart screenshots

Per [`.claude/rules/screenshot-anchor-markers.md`](../../rules/screenshot-anchor-markers.md): when a phase's visual anchor is a real screenshot of a bar chart / leaderboard / data viz (e.g., the source article's own carousel images), do NOT add `width:0 → width:N` "marker-highlight" `<span>` overlays that animate horizontal bars on top of the screenshot's existing bars. The screenshot already shows colored bars at the correct proportions — a synthetic translucent rectangle that grows on top reads as a duplicate bar and breaks the source aesthetic.

Use these patterns instead when the anchor is a chart screenshot:

- **Marker-circles** (SVG ellipse stroke around a single data point — different geometry, reads as "look here")
- **Pill-row entrances** beside or below the screenshot (synthesize stat pills like `27% Health`, `26% Career` and step-by-step reveal them at narration word anchors)
- **Scale-pulses** on existing pills when the narration repeats their number
- **Stat-counter rolls** on a separate counter beside the screenshot
- **Subtle frame-glow** on the entire `.ss-frame` parent of the screenshot

Underline-markers on synthetic text (headlines, stat-pill words OUTSIDE the screenshot frame) are still fine. Marker-circles anywhere are fine. The rule applies only to horizontal-bar overlays drawn over real chart screenshots.

### 8.4. Trust-signal card (REQUIRED for news / blog / announcement topics)

When step 4.6 captured a source-page screenshot, wire it into Phase 1 as a "browser frame" card that holds during the spoken hook (~0.6s → ~5.5s window) so viewers see the official page chrome + headline before the slam takes over. Reference implementation: `videos/anthropic-nec-partnership/index.html` — search for `#p1-source-card`.

**HTML** (insert inside `#phase1` `.phase-content`, after `#p1-caption`):

```html
<div id="p1-source-card">
  <div id="p1-source-chrome">anthropic.com/news/anthropic-nec</div>
  <img id="p1-source-img" src="assets/<slug>-source-page.png" alt="<source title> page" crossorigin="anonymous" />
</div>
```

The chrome bar text is the visible URL (no protocol). The `::before` pseudo-element renders fake macOS traffic-light dots so the card reads as a real browser window in <2s.

**CSS** (add to the `<style>` block):

```css
/* Trust signal screenshot card (Scene 1) — 900px wide, ~90px gutter on each side */
#p1-source-card {
  position: absolute;
  top: 320px;
  left: 50%;
  transform: translateX(-50%);
  width: 900px;
  z-index: 4;
  opacity: 0;
  pointer-events: none;
}
#p1-source-chrome {
  width: 100%;
  background: rgba(28, 32, 44, 0.96);
  border: 1.5px solid rgba(255,255,255,0.18);
  border-bottom: none;
  border-radius: 14px 14px 0 0;
  padding: 14px 22px;
  font-family: var(--mono);
  font-weight: 500;
  font-size: 20px;
  letter-spacing: 0.5px;
  color: rgba(255,255,255,0.78);
  text-align: left;
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.55);
}
#p1-source-chrome::before {
  content: "● ● ●";
  color: rgba(255,255,255,0.30);
  font-size: 14px;
  letter-spacing: 5px;
  margin-right: 16px;
}
#p1-source-img {
  width: 900px;
  height: auto;
  display: block;
  border: 1.5px solid rgba(255,255,255,0.18);
  border-top: none;
  border-radius: 0 0 14px 14px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.65);
  background: #fff;
}
```

**GSAP** (add to the timeline ABOVE the existing Phase 1 entrance tweens):

```js
// Trust signal screenshot card: fade in 0.6s → out by 6.0s
tl.fromTo("#p1-source-card",
  { y: 16, opacity: 0 },
  { y: 0, opacity: 1, duration: 0.5, ease: "power2.out", immediateRender: false },
  0.6);
tl.to("#p1-source-card",
  { opacity: 0, duration: 0.5, ease: "power2.in", overwrite: "auto" },
  5.5);
```

**Phase 1 timing reconciliation**: delay `#p1-pre` (the sub-line) entrance to ~6.2s so it doesn't compete with the screenshot card. The slam (`#p1-hero`) typically lands later (7-9s) and won't conflict.

**Sizing rule**: 900px width on a 1080px canvas leaves ~90px gutter each side — enough for the dark stage to frame the card, not enough to make the screenshot feel small. Don't shrink below 800px (loses readability) or grow above 960px (eats the gutter).

**Don't**:
- Don't show the screenshot during the slam (≥6.0s) — it competes for visual attention.
- Don't link the screenshot to a specific scene's content beyond Scene 1; the trust beat is in the hook, not in the body.
- Don't use a full-page screenshot taller than ~1200px — it crowds the card past where the slam lands.

### 8.5. Lib pick (optional but recommended)

The repo ships a shared visual library at [`shared/lib/`](../../../shared/lib/). It has reusable cards, components, effects, and named visual styles — extracted from this very template. Before treating any phase as "fully custom", check whether a lib entry already does what you need.

1. Read [`shared/lib/MANIFEST.md`](../../../shared/lib/MANIFEST.md) — the catalog of every entry, with description + tags.
2. Read [`shared/lib/visual-styles/anthropic-dark.md`](../../../shared/lib/visual-styles/anthropic-dark.md) — the named-style fragment that ALSO maps which lib entries fit this aesthetic.
3. For each lib entry you want to reuse:
   - **Block** (sub-composition): copy `shared/lib/blocks/<name>/block.html` into `videos/<slug>/compositions/<name>.html`. Wire it in `index.html` per the entry's `recipe.md`.
   - **Component** (paste-in snippet): read `shared/lib/components/<name>/component.html`. Merge its HTML / CSS / JS sections into the host `index.html` per the comments at the top of the file.
   - **Effect** (GSAP recipe): read `shared/lib/effects/<name>.js`. Paste the function body into the host `<script>` (above the timeline construction) and call it from the timeline.
   - **Tokens**: copy `shared/lib/tokens/<name>.css` into `videos/<slug>/tokens/<name>.css` and add a `<link rel="stylesheet" href="tokens/<name>.css">` in `<head>`.

**Never reference `shared/lib/` paths from `data-composition-src`, `<img src>`, `<audio src>`, `<video src>`, `<link href>`, or `<script src>` at runtime.** The HyperFrames bundler / preview server (`isSafePath` / `safePath` in `@hyperframes/core`) silently rejects paths outside the project directory. Always copy the file into `videos/<slug>/` first; reference it from the local copy.

This step is optional because the spawned template already inlines the equivalents — but as you customize, lib entries are a way to swap one piece without divergence. They're also the canonical source for any new template you might author later.

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

- **Hero slam word too wide** — the 240px font + the chosen word exceeds 1080px - 120px padding. Either shorten the word (synonym) or drop `#p1-hero` font-size to 200px.
- **Stat pill labels wrap onto 3 lines** — labels >18 chars overflow the 440px pill. Shorten the label.
- **Timeline card title overflows** — 40px font + long title overflows the card's 940px width minus the date chip (160px) and index badge (56px). Shorten or drop title to 36px.

Fix overflow at the CSS or content level, then re-run `inspect` until clean.

### 11. Open preview (final step — never render)

Run in background so the studio stays open while you report:

```bash
npx hyperframes preview videos/<slug>
```

Capture the URL it prints (typically `http://localhost:5173`).

### 11.5. (Optional) QA the rendered preview visually

**Skip if**: lint and inspect both passed cleanly AND the user wants a fast turnaround.

**Use when**: the composition involves new content patterns (custom animations, novel card layouts, atypical font sizes), OR the user explicitly asks "verify the preview".

Sub-playbook: `/diy-yt-creator qa-composition <slug>`. It will use `agent-browser` to snapshot each phase from the running preview server and report any visual issues (overflow, missing assets, broken image icons, leftover template placeholders).

Do NOT block on this step — it's advisory. Report findings in step 12.

### 12. Report to the user

One concise message containing:

- **Slug + path**: `videos/<slug>/`
- **Total duration**: `XX.Xs`
- **Voice**: `am_michael` (or whichever was used)
- **Preview URL**: `http://localhost:5173`
- **Render command** (do NOT run it): `npx hyperframes render videos/<slug> -o videos/<slug>/out/<slug>.mp4`
- **Any inspect findings** that needed manual content tradeoffs (e.g. "shortened slam word from BREAKTHROUGH to MAJOR for fit")

That's it. Stop. Wait for user to iterate or trigger render manually.

---

## Quality bar — required before reporting done

- [ ] `npx hyperframes lint videos/<slug>` → 0 errors
- [ ] `npx hyperframes inspect videos/<slug>` → no overflow on hero word, stat pills, or timeline cards
- [ ] All four phases have real content (no leftover template placeholders: "DUMBER?", "anthropic.com/postmortem", "Mar 4 / Mar 26 / Apr 16", "3 separate bugs / 6 weeks stacked")
- [ ] Phase transition timestamps computed from transcript, NOT left at template defaults
- [ ] Audio element wired with correct `data-duration`
- [ ] Preview URL is reachable (the `hyperframes preview` background command is still running)

If any item fails, fix it before reporting. Don't claim success on a half-built composition.

---

## Real logos — always use them when they exist

The repo ships a shared logo library at `shared/logos/` (84 PNG/SVG brand wordmarks and icons — Anthropic, Claude, Claude Code, OpenAI, GitHub, Canva, Asana, Slack, Discord, AWS, Cloudflare, Stripe, Vercel, and many more). **Never use styled text or pseudo-logos when a real one exists.**

**Important: copy logos into the project's `assets/`, do NOT reference `shared/logos/` directly.** The studio's preview server only serves files inside the project directory; an `../../shared/logos/...` path 404s in the studio (it'll work in `hyperframes render` but the preview shows a broken 21px placeholder, which silently fails lint).

**Workflow:**

```bash
# Copy each logo you need into the project's assets folder
cp shared/logos/anthropic-logo-light.svg videos/<slug>/assets/
cp shared/logos/canva-logo.png            videos/<slug>/assets/   # if used in phase 3, etc.
```

**Common picks** (`src` value after copying):

| Where | Anthropic-style video | Other brands |
|---|---|---|
| Top banner (`#top-banner-logo` `src`) | `assets/anthropic-logo-light.svg` | Match the video's host brand (e.g. `assets/claude-logo-light.svg`, `assets/claude-code-logo-light.svg`) |
| Per-app step in phase 3 (if applicable) | `assets/<app>-logo.png` (e.g. `assets/canva-logo.png`, `assets/asana-logo.png`, `assets/slack-logo.svg`) | Same |

**Workflow inside step 8:**

1. Before editing phase 3 timeline cards, check `shared/logos/` for each named app/brand: `ls shared/logos | grep -i <app>`.
2. If a logo exists, **copy it into the project's `assets/`** and render it as `<img src="assets/<file>" alt="<App>">` inside the card's `.tl-app` slot (or replace the entire app text with the logo). Style with `height: 36-44px; width: auto; vertical-align: middle`.
3. If a logo does NOT exist, do NOT fabricate one. Either:
   - Run the `capture-asset` sub-playbook to grab a UI screenshot from the app's homepage: `/diy-yt-creator capture-asset <slug> <app_homepage_url> <app>-screenshot`. Lands at `videos/<slug>/assets/<app>-screenshot.png`. Reference as `<img src="assets/<app>-screenshot.png" alt="<App>">`. Use sparingly — screenshots are heavier than logos and may distract from the card composition. OR
   - Ask the user for the logo file (preferred for brand consistency), OR
   - Fall back to the styled mono-text app name (current default in the template), OR
   - Pick a different app already in `shared/logos/` IF the script-content allows substitution without losing factual accuracy.

**Light vs dark variants**: this template is dark-stage (`--bg: #0B0F18`). Always pick the `*-light.svg` or `*-light.png` variant when available — it has white/cream marks that contrast on dark. Avoid `*-dark` variants on this template (they'll be near-invisible).

**Never commit a video that ships with the placeholder text logo (`CLAUDE` styled div) when a real logo exists.** Lint will not catch this — it's a content rule.

## Don'ts

- Never auto-render — user explicitly always triggers render manually.
- Never fabricate stats, dates, URLs, or quotes. Ask for source if missing.
- Never use a styled-text pseudo-logo when a real one exists in `shared/logos/`. See "Real logos" above.
- Never modify `templates/shorts/anthropic/` — only the copy under `videos/<slug>/`.
- Never reference `shared/lib/` paths from `data-composition-src`, `<img src>`, `<audio src>`, `<video src>`, `<link href>`, or `<script src>` at runtime — the HyperFrames bundler silently rejects paths outside the project directory. Always copy the file into `videos/<slug>/` first.
- Never use `Math.random()` / `Date.now()` in the generated composition (HyperFrames is deterministic).
- Never write `<br>` in content text — use `max-width` for natural wrapping (HyperFrames `/hyperframes` skill rule).
- Never animate `visibility` or `display` — use opacity (HyperFrames rule).
- Never skip the `/hyperframes` skill before editing the composition HTML.
- Never run multiple `new-anthropic-short` invocations in parallel against the same slug.
- Never run `agent-browser` (via `capture-asset` or `qa-composition`) against `localhost` or internal IPs without explicit user approval — only public URLs by default.
- Never store captured PNGs in `shared/` — they belong in `videos/<slug>/assets/` per `shared/README.md`.
- Never re-run `capture-asset` against the same URL for the same video without `--force` — wasteful and may rate-limit.
