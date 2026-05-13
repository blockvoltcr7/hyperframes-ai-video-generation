# Anthropic Shorts Template

Vertical YouTube Short (1080x1920, 30fps, 60-180s) for videos covering Anthropic, Claude, and the Claude ecosystem. Dark, near-black stage with a warm orange-to-cream accent gradient inspired by Anthropic's published dark-stage brand identity.

The full design system (colors with provenance, type scale, motion, surface detail, SFX cues, anti-patterns) lives in [DESIGN.md](./DESIGN.md). Read it before editing.

> **Wordmark note:** The top banner renders "ANTHROPIC" as a CSS wordmark — no Anthropic trademark assets are shipped in this repo. See [assets/anthropic-wordmark.txt](./assets/anthropic-wordmark.txt) for instructions on swapping in an SVG if you have one.

## What this template ships

A self-contained 24-second demo composition (`index.html`) showcasing the four reusable phase archetypes — same structure as `templates/shorts/archon/`, rebranded for Anthropic:

| Phase | Pattern | Use for |
|---|---|---|
| 1 — Hero slam | overline + secondary line + 200px gradient slam word + caption pill | scroll-stop hook (orange->cream gradient text fill) |
| 2 — Stat pill row | overline + headline + 2 huge color-rotated stat pills | benchmark numbers, model stats |
| 3 — Feature cards | overline + 3 labeled cards (orange / purple / slate-blue) | model capabilities, new features |
| 4 — CTA URL slam | overline + URL pill + subscribe pill | closing call-to-action (cream-clay) |

Each phase is mutex-visible (only one at a time), separated by a blur + crossfade transition. Entrance animations only — the transition handles the exit (per HyperFrames rule).

## Provenance — colors inspired by Anthropic's public brand

Colors are inspired by Anthropic's published visual identity, not invented:

- **Canvas:** Near-black `#0B0F18` — pulled from the dark-stage treatment Anthropic uses in Claude launch videos and on anthropic.com.
- **Orange accent:** `#E07B3C` — Anthropic's brand orange from their published identity.
- **Cream-clay:** `#C97A5C` — Anthropic's warmer secondary tone.
- **Typography:** Inter (sans) + JetBrains Mono (mono) — consistent with Anthropic's own web type.

This is NOT an official Anthropic template and is not affiliated with Anthropic PBC. If Anthropic publishes official brand assets (SVG wordmark, design tokens), update per the swap instructions in [assets/anthropic-wordmark.txt](./assets/anthropic-wordmark.txt).

## Spawn a new Anthropic-themed video from this template

From the repo root:

```bash
# 1. Pick a slug (kebab-case, descriptive)
SLUG="my-anthropic-short"

# 2. Copy the template
cp -r templates/shorts/anthropic videos/$SLUG

# 3. Update meta.json
#    {
#      "id": "my-anthropic-short",
#      "name": "My Anthropic Short"
#    }

# 4. Edit videos/$SLUG/index.html
#    - Replace each phase's text content (overlines, headlines, stat numbers, card labels, URL)
#    - Adjust data-duration on #root and the phase transition timestamps if your script length differs from 24s
#    - Drop your narration at videos/$SLUG/audio/narration.wav and uncomment the <audio> block
#    - The top banner renders the ANTHROPIC wordmark in CSS — no asset changes needed

# 5. Validate
pnpm exec hyperframes lint videos/$SLUG
pnpm exec hyperframes validate videos/$SLUG     # adds WCAG contrast audit
pnpm exec hyperframes inspect videos/$SLUG      # checks for layout overflow

# 6. Preview
pnpm exec hyperframes preview videos/$SLUG

# 7. Render
pnpm exec hyperframes render videos/$SLUG -o out/$SLUG.mp4
```

PowerShell equivalent for step 2: `Copy-Item -Recurse templates/shorts/anthropic videos/$SLUG`.

> Note: this repo uses **PNPM**, not NPM. The `npx` form (`npx hyperframes ...`) also works — use whichever you prefer.

## Customizing per video

Most styling is driven by CSS variables on `#root`:

```css
#root {
  --cyan:    #E07B3C;   /* hero accent — Anthropic orange */
  --magenta: #C97A5C;   /* CTA accent — cream-clay */
  --purple:  #A78BCE;   /* secondary — muted purple */
  --blue:    #7DA3B8;   /* workhorse — slate-blue */
  --pad-top: 240px;     /* increase if your top banner is taller */
  /* ... */
}
```

Variable naming note: `--cyan` and `--magenta` are named for structural consistency with the archon template, not because they are literally cyan or magenta. In this template `--cyan` is Anthropic orange and `--magenta` is cream-clay. This makes diffing the two templates clean — only the hex values change.

Per-phase accent rotation: change a stat-pill's class from `.cyan` to `.magenta` or a feature card from `.blue` to `.purple`. The CSS rules cover all variants already.

**Hero gradient flourish:** Phase 1's slam word uses an orange->cream `background-clip: text` fill plus a 4-second `background-position` drift. Use this on at most ONE element per video — it's the signature Anthropic visual moment.

## Top banner — CSS wordmark

The top banner renders "ANTHROPIC" as a CSS gradient wordmark centered at 972px width. This requires no asset files. If you have an official Anthropic SVG wordmark, see [assets/anthropic-wordmark.txt](./assets/anthropic-wordmark.txt) for swap instructions.

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

Each SFX is a separate `<audio>` element on its own track index, gated by `data-start` / `data-duration`. Volume is capped per [`.claude/rules/audio-design.md`](../../../.claude/rules/audio-design.md) — never exceed `0.25` on a single per-cue SFX (sonic-logo at `0.60` is the only exception).

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

- No cyan (`#22D9A0`) or magenta (`#E64DCC`) — those belong to the Archon template.
- No electric blue (`#4B82EF`) — use the quieter slate-blue (`#7DA3B8`) instead.
- No light canvas — dark stage only.
- No more than one accent per phase.
- No serif headlines — Inter only.
- No `<br>` in content text — use `max-width` for natural wrapping.
- No background music on Shorts — narration + SFX only.
- No `position: absolute; top: Npx` on `.phase-content` — use padding.
- No more than one orange->cream gradient hero slam per video.
- Do not present this template as an official Anthropic asset.
