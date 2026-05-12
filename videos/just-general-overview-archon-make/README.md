# Archon Shorts Template

Vertical YouTube Short (1080x1920, 30fps, 60-180s) for videos about [Archon](https://archon.diy) — the remote agentic coding platform that runs AI workflows in isolated git worktrees. Dark, deep-blue stage with a cyan-to-magenta accent gradient pulled directly from the Archon logo.

The full design system (colors with provenance, type scale, motion, surface detail, SFX cues, anti-patterns) lives in [DESIGN.md](./DESIGN.md). Read it before editing.

## What this template ships

A self-contained 24-second demo composition (`index.html`) showcasing the four reusable phase archetypes — same structure as `templates/shorts/anthropic/`, rebranded for Archon:

| Phase | Pattern | Use for |
|---|---|---|
| 1 — Hero slam | overline + secondary line + 200px gradient slam word + caption pill | scroll-stop hook (cyan→magenta gradient text fill) |
| 2 — Stat pill row | overline + headline + 2 huge color-rotated stat pills | "X workflows / Y worktrees" receipts |
| 3 — Workflow cards | overline + 3 labeled cards (cyan / purple / blue) | workflow archetypes, feature lists |
| 4 — CTA URL slam | overline + URL pill + subscribe pill | closing call-to-action (magenta) |

Each phase is mutex-visible (only one at a time), separated by a blur + crossfade transition. Entrance animations only — the transition handles the exit (per HyperFrames rule).

## Provenance — colors come from Archon source

All accents are traceable to canonical Archon assets in `dynamous/Archon`, not eyeballed:

- Theme tokens: `packages/web/src/index.css` — `:root` OKLCH variables (`--background`, `--surface`, `--primary`, `--accent-bright`, `--node-prompt`, `--success`, `--warning`, `--error`).
- Logo gradient: `assets/logo.png` — magenta → purple → cyan-green shield. The cyan + magenta accents in the slam word, stat pills, and CTA pull from this gradient.
- Typography: `--font-sans: 'Inter'`, `--font-mono: 'JetBrains Mono'` — declared in Archon's web shell.

If you re-tune the palette, edit [DESIGN.md](./DESIGN.md) first (which holds the OKLCH origin per token), then propagate hex values into `index.html`'s `--cyan`, `--magenta`, etc.

## Add Dynamous promotion? (opt-in, ask each new video)

Before you wire content, decide:

> **"Add Dynamous promotion to this Short? (y/N — default no)"**

- **No** (default) — skip this section. Proceed to "Spawn a new Archon-themed video" below.
- **Yes** — open [`videos/_template-wiring-snippet.md`](../../../videos/_template-wiring-snippet.md) and follow Step 0 onward. Wires the persistent badge (artifact 1) + endcard (artifact 2). Optionally also the module interstitial (artifact 3) when the topic matches a curriculum module, and the discount bubble (artifact 4) when the platform is visibly on screen.

Existing videos are NOT retroactively touched. The decision is per video. Record the choice in `videos/<slug>/meta.json` as `"dynamousPromotion": true|false` for later audit.

## Spawn a new Archon-themed video from this template

From the repo root:

```bash
# 1. Pick a slug (kebab-case, descriptive)
SLUG="my-archon-short"

# 2. Copy the template
cp -r templates/shorts/archon videos/$SLUG

# 3. Update meta.json
#    {
#      "id": "my-archon-short",
#      "name": "My Archon Short"
#    }

# 4. Edit videos/$SLUG/index.html
#    - Replace each phase's text content (overlines, headlines, stat numbers, card labels, URL)
#    - Adjust data-duration on #root and the phase transition timestamps if your script length differs from 24s
#    - Drop your narration at videos/$SLUG/audio/narration.wav and uncomment the <audio> block
#    - The top banner already points at assets/archon-logo.png — keep it as-is for Archon videos

# 5. Validate
pnpm exec hyperframes lint videos/$SLUG
pnpm exec hyperframes validate videos/$SLUG     # adds WCAG contrast audit
pnpm exec hyperframes inspect videos/$SLUG      # checks for layout overflow

# 6. Preview
pnpm exec hyperframes preview videos/$SLUG

# 7. Render
pnpm exec hyperframes render videos/$SLUG -o out/$SLUG.mp4
```

PowerShell equivalent for step 2: `Copy-Item -Recurse templates/shorts/archon videos/$SLUG`.

> Note: this repo uses **PNPM**, not NPM. The `npx` form (`npx hyperframes ...`) also works — use whichever you prefer.

## Customizing per video

Most styling is driven by CSS variables on `#root`:

```css
#root {
  --cyan:    #22D9A0;   /* hero accent — Archon logo gradient end */
  --magenta: #E64DCC;   /* CTA accent — Archon logo gradient start */
  --purple:  #9D5BE0;   /* secondary — node-prompt color */
  --blue:    #4B82EF;   /* workhorse — dashboard primary */
  --pad-top: 240px;     /* increase if your top banner is taller */
  /* ... */
}
```

Per-phase accent rotation: change a stat-pill's class from `.cyan` to `.magenta` or a workflow card from `.blue` to `.purple`. The CSS rules cover all variants already.

**Hero gradient flourish:** Phase 1's slam word uses a cyan→magenta `background-clip: text` fill plus a 4-second `background-position` drift. Use this on at most ONE element per video — it's the signature Archon visual moment. If you don't need the gradient drift, replace `#p1-hero` with a solid-color slam (use `var(--cyan)` for the color and remove the `background-*` and `filter: drop-shadow` rules — copy the solid pattern from `templates/shorts/anthropic/index.html#p1-hero`).

## Logo / banner

Archon's source repo currently ships only `assets/logo.png` (the shield icon — already copied into `assets/archon-logo.png` here). The top banner composes:

- The icon PNG at 110x110 on the left
- A CSS-rendered "ARCHON" wordmark at 96px / Inter 900 with the cyan→magenta gradient fill on the right

If a real Archon SVG wordmark lands upstream later, swap the `#top-banner-content` div for a single `<img>` at ~972px wide and remove the `#top-banner-icon` + `#top-banner-wordmark` rules. The Anthropic template's banner pattern shows the SVG-only approach.

## Adding more phases

1. Duplicate one of the four `<div class="phase">` blocks. Give it a new id (`#phase5`), add `z-index: 5; opacity: 0;`.
2. Add per-phase CSS rules (`#phase5 .phase-content { ... }`) — keep `padding: var(--pad-top) var(--pad-x) var(--pad-bottom)` so it sits below the top banner.
3. Bump `#root` `data-duration` to cover the new total.
4. Add the entrance tweens and a transition block following the existing pattern (`P1`, `T1`, `P2`, `T2` … convention).
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

The cues above are names — the audio files live in [`shared/audio/sfx/`](../../../shared/audio/). To copy them into your video's `assets/sfx/` (required because HyperFrames rejects paths outside the project dir at runtime), run:

```bash
bash scripts/sync-video-sfx.sh videos/<slug> impact-slam scale-slam spring-pop
```

Or list the cues you want in `videos/<slug>/sfx-cues.txt` (one per line) and run without arguments. Volume caps and the full per-cue table are in [`.claude/rules/audio-design.md`](../../../.claude/rules/audio-design.md); the cue catalog with default volumes lives in [`shared/audio/MANIFEST.md`](../../../shared/audio/MANIFEST.md).

## Don'ts

See `DESIGN.md` "What NOT to Do" for the full list. The big ones:

- No light canvas — this is dark stage only.
- No more than one accent per phase.
- No serif headlines — Inter only.
- No `<br>` in content text — use `max-width` for natural wrapping.
- No background music on Shorts — narration + SFX only.
- No `position: absolute; top: Npx` on `.phase-content` — use padding.
- No more than one cyan→magenta gradient hero slam per video.
- Don't reuse the Anthropic orange. Orange has no role in the Archon palette.
