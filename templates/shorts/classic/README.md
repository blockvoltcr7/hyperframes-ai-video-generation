# Classic Shorts Template

Vertical YouTube Short (1080x1920, 30fps, 60-180s) for any developer tool, AI workflow, engineering concept, or productivity topic. Deep navy canvas with bright blue accents — a brand-neutral "modern dev tool dark theme" that looks at home for any subject. No brand identity baked in; designed to be adopted quickly.

The full design system (colors with provenance, type scale, motion, surface detail, SFX cues, anti-patterns) lives in [DESIGN.md](./DESIGN.md). Read it before editing.

> **Wordmark note:** The top banner renders "YOUR BRAND" as a CSS placeholder — this is intentional. You MUST replace it before shipping any video. See [Make it yours](#make-it-yours) below and [assets/wordmark-placeholder.txt](./assets/wordmark-placeholder.txt) for swap instructions.

## What this template ships

A self-contained 24-second demo composition (`index.html`) showcasing the four reusable phase archetypes — same structure as `templates/shorts/anthropic/`, with a brand-neutral blue palette:

| Phase | Pattern | Use for |
|---|---|---|
| 1 — Hero slam | overline + secondary line + 200px gradient slam word + caption pill | scroll-stop hook (bright-blue->sky-blue gradient text fill) |
| 2 — Stat pill row | overline + headline + 2 huge color-rotated stat pills | numbers, benchmarks, metrics |
| 3 — Feature cards | overline + 3 labeled cards (bright-blue / soft-indigo / teal-green) | capabilities, steps, features |
| 4 — CTA URL slam | overline + URL pill + subscribe pill | closing call-to-action (sky blue) |

Each phase is mutex-visible (only one at a time), separated by a blur + crossfade transition. Entrance animations only — the transition handles the exit (per HyperFrames rule).

---

## Make it yours

**This template ships with two placeholder strings that you MUST replace before creating any real video.**

1. **Edit `#top-banner-wordmark` in `index.html`** — search for `YOUR BRAND` and replace with your actual brand name (e.g. `ARCHON`, `MYCO`, `YOUR TOOL`). This renders as a CSS gradient wordmark in the top banner. To use a logo image instead, see [assets/wordmark-placeholder.txt](./assets/wordmark-placeholder.txt) for the SVG swap pattern.

2. **Replace `your-domain.com` in Phase 4** — search for `your-domain.com` in `index.html` and replace with your real URL (e.g. `archon.diy`, `yourtool.io`, `app.example.com`).

3. **Optionally swap palette accents** — all brand colors live in `#root` as CSS variables. To match your brand, change just two values:
   ```css
   #root {
     --cyan:    #4D8FF7;   /* hero accent — swap to your primary color */
     --magenta: #7AC4F5;   /* CTA accent — swap to your secondary color */
   }
   ```
   The other accents (`--purple`, `--blue`) support Phase 3 card rotation — change them if desired, or leave as-is.

4. **Optionally drop a logo** — place a PNG or SVG in `assets/` and follow the swap pattern in [assets/wordmark-placeholder.txt](./assets/wordmark-placeholder.txt) to replace the CSS wordmark with an `<img>` tag.

**Checklist before shipping any video:**

- [ ] `YOUR BRAND` replaced with actual brand name (or SVG logo swapped in)
- [ ] `your-domain.com` replaced with real URL
- [ ] Phase content filled with real topic-specific text (no demo placeholders)
- [ ] `npx hyperframes lint videos/<slug>` passes with 0 errors
- [ ] `npx hyperframes inspect videos/<slug>` shows no overflow

---

## Spawn a new video from this template

From the repo root:

```bash
# 1. Pick a slug (kebab-case, descriptive)
SLUG="my-new-short"

# 2. Copy the template
cp -r templates/shorts/classic videos/$SLUG

# 3. Update meta.json
#    {
#      "id": "my-new-short",
#      "name": "My New Short"
#    }

# 4. Edit videos/$SLUG/index.html
#    - Replace YOUR BRAND with your actual brand name
#    - Replace your-domain.com with your real URL
#    - Replace each phase's text content (overlines, headlines, stat numbers, card labels)
#    - Adjust data-duration on #root and the phase transition timestamps if your script length differs from 24s
#    - Drop your narration at videos/$SLUG/audio/narration.wav and uncomment the <audio> block

# 5. Validate
pnpm exec hyperframes lint videos/$SLUG
pnpm exec hyperframes validate videos/$SLUG     # adds WCAG contrast audit
pnpm exec hyperframes inspect videos/$SLUG      # checks for layout overflow

# 6. Preview
pnpm exec hyperframes preview videos/$SLUG

# 7. Render
pnpm exec hyperframes render videos/$SLUG -o out/$SLUG.mp4
```

PowerShell equivalent for step 2: `Copy-Item -Recurse templates/shorts/classic videos/$SLUG`.

> Note: this repo uses **PNPM**, not NPM. The `npx` form (`npx hyperframes ...`) also works — use whichever you prefer.

## Customizing per video

Most styling is driven by CSS variables on `#root`:

```css
#root {
  --cyan:    #4D8FF7;   /* hero accent — bright blue */
  --magenta: #7AC4F5;   /* CTA accent — sky blue */
  --purple:  #8B7FE8;   /* secondary — soft indigo */
  --blue:    #5EDBA4;   /* workhorse — teal-green */
  --pad-top: 240px;     /* increase if your top banner is taller */
  /* ... */
}
```

Variable naming note: `--cyan` and `--magenta` are named for structural consistency with the archon template, not because they are literally cyan or magenta. In this template `--cyan` is bright blue and `--magenta` is sky blue. This makes diffing templates clean — only the hex values change.

Per-phase accent rotation: change a stat-pill's class from `.cyan` to `.magenta` or a feature card from `.blue` to `.purple`. The CSS rules cover all variants already.

**Hero gradient flourish:** Phase 1's slam word uses a bright-blue->sky-blue `background-clip: text` fill plus a 4-second `background-position` drift. Use this on at most ONE element per video — it's the signature classic visual moment.

## Top banner — CSS wordmark

The top banner renders "YOUR BRAND" as a CSS gradient wordmark centered at 972px width. This requires no asset files and is intentionally a placeholder. If you have a logo SVG, see [assets/wordmark-placeholder.txt](./assets/wordmark-placeholder.txt) for swap instructions.

## Adding more phases

1. Duplicate one of the four `<div class="phase">` blocks. Give it a new id (`#phase5`), add `z-index: 5; opacity: 0;`.
2. Add per-phase CSS rules (`#phase5 .phase-content { ... }`) — keep `padding: var(--pad-top) var(--pad-x) var(--pad-bottom)` so it sits below the top banner.
3. Bump `#root` `data-duration` to cover the new total.
4. Add the entrance tweens and a transition block following the existing pattern (`P1`, `T1`, `P2`, `T2` ... convention).
5. Re-run `pnpm exec hyperframes lint` after every change.

## Adding narration

1. Generate or drop your TTS audio at `audio/narration.wav` (or `.mp3`).
2. Uncomment the `<audio id="narration">` block at the bottom of `index.html`.
3. Tune `data-start` (when narration begins relative to composition 0) and `data-duration` (clip length).
4. Sync phase timestamps to spoken-word landmarks. Use `pnpm exec hyperframes transcribe` to get word-level timestamps.

## Adding SFX

Each SFX is a separate `<audio>` element on its own track index, gated by `data-start` / `data-duration`. Volume is capped per [`.agents/rules/audio-design.md`](../../../.agents/rules/audio-design.md) — never exceed `0.25` on a single per-cue SFX (sonic-logo at `0.60` is the only exception).

```html
<audio id="sfx-slam"
       class="clip"
       src="assets/sfx/scale-slam.mp3"
       data-start="1.55"
       data-duration="0.9"
       data-track-index="3"
       data-volume="0.20"></audio>
```

Place under the `<audio id="narration">` block. Use distinct `data-track-index` values so simultaneous cues don't clash.

### Sourcing the actual SFX files

The cues above are names — the audio files live in [`shared/audio/sfx/`](../../../shared/audio/). To copy them into your video's `assets/sfx/` folder, run:

```bash
bash scripts/sync-video-sfx.sh videos/<slug> impact-slam scale-slam spring-pop
```

Or list the cues you want in `videos/<slug>/sfx-cues.txt` (one per line) and run without arguments.

## Don'ts

See `DESIGN.md` "What NOT to Do" for the full list. The big ones:

- No Archon cyan (`#22D9A0`) or magenta (`#E64DCC`) — those belong to the Archon template.
- No Anthropic orange (`#E07B3C`) or cream-clay (`#C97A5C`) — those belong to the Anthropic template.
- No light canvas — dark stage only.
- No more than one accent per phase.
- No serif headlines — Inter only.
- No `<br>` in content text — use `max-width` for natural wrapping.
- No background music on Shorts — narration + SFX only.
- No `position: absolute; top: Npx` on `.phase-content` — use padding.
- No more than one bright-blue->sky-blue gradient hero slam per video.
- **Do not ship a video with the literal string `YOUR BRAND` in the top banner.**
- **Do not ship a video with the literal URL `your-domain.com` in Phase 4.**
