# Screenshot-anchor markers — no horizontal-bar overlays on source-screenshot bar charts

When a phase's visual anchor is a real screenshot of a chart (a bar graph from the
source article's own carousel, a leaderboard image, an embedded data viz), DO NOT
add `width:0 → width:N` "marker-highlight" `<span>` overlays that animate horizontal
bars on top of the screenshot's existing bars. The screenshot already shows colored
bars at the correct proportions — a synthetic colored bar that grows on top of one
of them reads as a duplicate / second bar and breaks the source's authority.

This was a real failure mode on `videos/claude-personal-guidance/` — a P2/P3
implementation tried to "highlight" the Health 27% bar and the Spirituality 37.9%
bar by sweeping a `.p2-mark` / `.p3-mark` rectangle over them. The result looked
like the chart was generating a second wider bar over the data, not like an
emphasis marker. User flagged it immediately. The fix was to delete every
`.p2-mark` / `.p3-mark` element + its CSS + its GSAP `tl.set` / `tl.to` lines.

## Why this fails specifically on bar charts

- The source's bars are colored, rectangular, and the same height as the marker
  overlay (typically 32-40px). Stacking a translucent rectangle over a solid
  colored rectangle looks like the bar grew, not like the bar got emphasized.
- The source chose its own color palette deliberately. A purple marker on top of
  a green bar (or vice versa) introduces a color the source never used.
- The marker has a sharp leading edge that animates left→right. The viewer's eye
  reads this as a NEW data element entering, not as an annotation of an existing
  one.

## What to use instead

Pick from these patterns when the anchor is a chart screenshot:

1. **Marker-circle (SVG ellipse)** — a hand-drawn circle stroke around a single
   data point on the chart. Different geometry, different visual register, reads
   unambiguously as "look here". This is the pattern used for `#p4-mark-circle`
   around the 9→18 counter pill in `claude-personal-guidance` (kept; not a chart).
2. **Pill-row entrance beside the chart** — synthesize 4 pct-pills (`27% Health`,
   `26% Career`, `12% Relationships`, `11% Finances`) in the phase below or beside
   the screenshot. Step-by-step reveal them at narration word anchors (per
   `step-by-step-reveal.md`). The pills carry the precision; the screenshot carries
   the proof.
3. **Scale-pulse on an existing pill** — when the narration repeats a number
   already on a pill, briefly `scale: 1 → 1.06 → 1` it to draw the eye. No new
   geometry on the screenshot itself.
4. **Stat-counter roll** — on a counter beside (not on) the screenshot, roll
   `0 → N` to a key number. The counter is its own element with its own pill
   chrome; it doesn't compete with the screenshot's bars.
5. **Subtle frame glow** — on the entire `.ss-frame` parent of the screenshot,
   pulse `box-shadow: 0 0 30px <accent>` once when the phase wants to point at
   the screenshot as a whole. This emphasizes the screenshot without drawing on
   it.

## Where this rule applies

- All Anthropic-branded shorts (`templates/shorts/anthropic/` and any video that
  forks from it).
- Any video where the visual anchor is a real screenshot of a bar chart, line
  chart, leaderboard, or table.

## Where this rule does NOT apply

- **Underline-markers on synthetic text** (e.g., `#p1-mark-1` under "tells you
  what you want", `#p5-half-mark` behind the word "HALF" inside a custom stat
  pill, `#p6-mark-push` under the phrase "push twice"). These are emphasis on
  the video's OWN typography — no source visual is competing.
- **Marker-circles** anywhere — different geometry, never visually duplicates a
  bar.
- **Sweep markers on synthetic charts** the video itself draws (e.g., a rendered
  GSAP-animated bar chart with no source screenshot beneath it). If you're
  drawing the bars, you can decorate them however you want.

## Quick self-check before declaring a chart-anchored phase done

For every `<img>` inside an `.ss-frame`:

1. Are there sibling `<span>` elements with `position: absolute; height: ~38px;
   background: rgba(...);` and a `tl.to(elem, { width: ... }, t)` animation?
2. If yes — does the screenshot already show colored bars at that height?
3. If yes — delete the marker. Add a pill-row, scale-pulse, marker-circle, or
   stat-counter beside the screenshot instead.

## Lint

`npx hyperframes lint` does NOT currently catch this — the marker is valid CSS,
valid HTML, and valid GSAP. Until lint adds a rule like
`screenshot_anchor_overlay_check`, this is a human compensation. Audit by hand
before declaring the composition done.
