# DESIGN — Archon Shorts (Dark Workflow Stage)

Visual system for **YouTube Shorts** (1080x1920, 30fps, 60-180s) for videos about [Archon](https://archon.diy) — the remote agentic coding platform that runs AI workflows in isolated git worktrees. Dark, deep-blue canvas pulled directly from the live Archon dashboard, with a vibrant cyan-to-magenta accent gradient lifted from the brand logo. Designed to feel like a focused engineering tool that just shipped a feature, not a hype reel.

## Provenance

Colors and typography are derived from the canonical Archon source — not eyeballed:

- **Theme tokens:** [`packages/web/src/index.css`](https://github.com/coleam00/Archon/blob/main/packages/web/src/index.css) — `:root` OKLCH variables (`--background`, `--surface`, `--primary`, `--accent-bright`, `--node-prompt`, status colors).
- **Logo gradient:** [`assets/logo.png`](https://github.com/coleam00/Archon/blob/main/assets/logo.png) — magenta → purple → cyan-green shield. The slam-word and CTA accents pull from this gradient so the video feels brand-true even without the wordmark.
- **Typography:** Archon's web shell declares `--font-sans: 'Inter'` and `--font-mono: 'JetBrains Mono'`. Same pairing as the Anthropic shorts template — convenient and intentional.

## Style Prompt

A dark, deep-blue stage tuned for vertical video about agentic coding. Near-black canvas (the same OKLCH-derived navy as the live Archon dashboard) holds warm-white type and a bright, narrow palette of accents — cyan-green and magenta from the Archon logo gradient, plus electric blue and purple as workhorse colorways. Layout is phase-based: only one phase visible per frame, a 240px top safe-zone reserved for the Archon shield + wordmark, generous vertical breathing room. Motion is percussive and forward-leaning — slam-in hero words with a tight inline shake, stat pills that spring, timeline cards that scale-in with their accent gradient washes. Reads like a workflow status feed mid-execution: confident, technical, parallel.

## Canvas

- Resolution: **1080 x 1920** (vertical Shorts)
- Frame rate: **30fps**
- Duration target: **60-180s** (YT Shorts hard max 180s)
- Background: solid `#0A0E18`. No full-screen linear gradients (banding under H.264) — use radial highlights or solid + localized glow only.

## Colors

All hex values are sRGB approximations of the OKLCH source tokens. The OKLCH origin is in the comment for traceability — if you re-tune, edit the OKLCH first.

| Role | Hex | OKLCH origin | Usage |
|---|---|---|---|
| Background | `#0A0E18` | `oklch(0.14 0.005 260)` (`--background`) | Page canvas — Archon dashboard's primary surface |
| Surface | `#161B2C` | `oklch(0.18 0.008 260)` (`--surface`) | Cards, secondary panels |
| Surface elevated | `#1E2336` | `oklch(0.22 0.01 260)` (`--surface-elevated`) | Hover / inset surfaces |
| Primary text | `#E8E9F0` | `oklch(0.93 0.005 260)` (`--text-primary`) | Headlines, body — warm off-white |
| Secondary text | `#9A9BA3` | `oklch(0.65 0.01 260)` (`--text-secondary`) | Captions, meta — passes 4.5:1 on background |
| Accent — cyan | `#22D9A0` | logo gradient end (≈ `oklch(0.78 0.16 165)`) | Hero accent, success, primary slam |
| Accent — magenta | `#E64DCC` | logo gradient start (≈ `oklch(0.68 0.27 320)`) | Hero co-accent, CTA, "wow" moment |
| Accent — purple | `#9D5BE0` | `oklch(0.58 0.19 290)` (`--node-prompt`) | Secondary feature, mid-gradient bridge |
| Accent — blue | `#4B82EF` | `oklch(0.65 0.18 250)` (`--primary`) | Workhorse accent, technical / "command" colorway |
| Accent — yellow | `#E0AD3D` | `oklch(0.75 0.15 75)` (`--warning`) | Warnings only — never decorative |
| Accent — red | `#DC4838` | `oklch(0.6 0.2 25)` (`--error`) | Errors / regressions only — never decorative |
| Pill background | `rgba(232, 233, 240, 0.06)` | derived | Default chip / pill fill |
| Pill border | `rgba(232, 233, 240, 0.16)` | derived | Default chip / pill stroke |
| Card border | `rgba(232, 233, 240, 0.10)` | derived | Subtle frame around image crops / panels |

**Contrast verified (WCAG):**
- Primary text on background: 14.2:1 (AAA)
- Secondary text on background: 4.6:1 (AA normal)
- Cyan on background: 9.8:1 (AAA) — safe for body too
- Magenta on background: 5.6:1 (AA normal at 24px+)
- Blue on background: 5.1:1 (AA normal at 24px+)
- Purple on background: 4.4:1 (AA large only — keep on 24px+ headings/badges)

**Accent rotation rule:** Within one video, no two adjacent phases share the same accent. Cyan opens (hero), magenta closes (CTA), purple/blue rotate through the middle. Never paint a phase with more than one accent at once.

**Hero gradient (signature Archon flourish):** Big slam words may use a `linear-gradient(135deg, var(--cyan), var(--magenta))` with `background-clip: text; -webkit-background-clip: text; color: transparent` to echo the logo's gradient. Use this on at most ONE element per scene — usually the hero slam word in Phase 1.

## Typography

Same pairing as Archon's web shell: **Inter** (sans) and **JetBrains Mono** (mono). Inter carries headlines, body, hero slams. JetBrains Mono carries overlines, dates, URLs, status badges, and anything that should read as terminal output or workflow metadata.

| Role | Family | Weight | Treatment |
|---|---|---|---|
| Hero slam (gradient) | `Inter, system-ui, sans-serif` | 900 | `letter-spacing: -4px`, gradient text fill, glow `text-shadow` matched to accent |
| Hero slam (solid) | `Inter, system-ui, sans-serif` | 900 | `letter-spacing: -4px`, accent color, `text-shadow: 0 0 80px <accent>88, 0 8px 24px rgba(0,0,0,0.6)` |
| Headline | `Inter, system-ui, sans-serif` | 800-900 | `letter-spacing: -1px`, line-height 1.05 |
| Body large | `Inter, system-ui, sans-serif` | 600 | line-height 1.3 |
| Body | `Inter, system-ui, sans-serif` | 500 | line-height 1.4 |
| Section overline | `'JetBrains Mono', ui-monospace, monospace` | 700 | UPPERCASE, `letter-spacing: 5-7px`, accent color |
| Date / status chip | `'JetBrains Mono', ui-monospace, monospace` | 700-900 | `letter-spacing: 1-2px`, `font-variant-numeric: tabular-nums` |
| URL / code | `'JetBrains Mono', ui-monospace, monospace` | 600 | `letter-spacing: 2px` |

**Type scale (Shorts-tuned):**

| Role | Size |
|---|---|
| Hero slam (e.g. "WORKTREES", "AGENTIC", "PARALLEL") | 200-240px |
| Hero pre-slam line ("Run AI workflows in…") | 64-72px |
| Headline | 60-64px |
| Body large | 40-44px |
| Body | 36px |
| Section overline (mono) | 34-40px |
| Caption (mono) | 28-32px |

**Tabular numerals on stats:** add `font-variant-numeric: tabular-nums lining-nums` so digits don't jitter across springs.

## Layout

**Safe zones — non-negotiable.** A persistent Archon banner (shield icon + wordmark) sits at `top: 60px`. Every phase container MUST reserve top space for it. A slim progress bar may sit at the bottom.

```
PHASE_PAD_TOP    = 240px   (clears the top banner)
PHASE_PAD_X      = 60px    (default side padding)
PHASE_PAD_BOTTOM = 240px   (clears the progress bar + reading room)
```

`.phase-content` MUST use `width: 100%; height: 100%; padding: 240px 60px 240px; display: flex; flex-direction: column; box-sizing: border-box`. Padding positions content inward — NEVER `position: absolute; top: Npx`. Absolute-positioned content containers overflow on rendered text.

**Phase mutex:** Only one phase is visible at any frame. Use opacity + visibility crossfades on whole phases, not on individual elements. Each phase typically runs 4-12s.

## Motion Language

- **Easing:**
  - `back.out(1.7)` for slam-in hero words and stat pills (the signature spring)
  - `power3.out` for headlines and primary text rises
  - `power2.out` for body / chip / pill entrances
  - `expo.out` for high-impact one-element reveals (URL slam)
  - `sine.inOut` for ambient breathing only
  - **Avoid** `elastic` and `bounce` — they read toy-like for this brand.
- **Duration:**
  - Hero / slam word: 0.6-0.9s
  - Headline: 0.5-0.7s
  - Body / chip: 0.35-0.5s
  - Phase crossfade: 0.4s opacity + 0.5s blur
- **Direction:** Vertical y-rises dominate (`y: +40 → 0`). Hero slams use `scale: 0.78 → 1.0`. Horizontal slides only for chip rows. No rotation. No scale-pop above 1.06.
- **Stagger:** 80-140ms on body lists; 40-60ms on chip rows; 200-280ms between timeline cards.
- **Inline shake** on the impact frame of a slam word (3-6 frames, ±5-6px translate). One shake per phase max — overusing it cheapens it.
- **Gradient drift on hero slam:** the cyan→magenta gradient may slowly drift its background-position across the slam word's lifetime (`background-position: 0% 50% → 100% 50%` over 4-6s, `sine.inOut`, no repeat). Subtle — adds life without distracting.

## Surface Detail

- **Cards:** 20-26px radius, `background: linear-gradient(135deg, <accent>26, <accent>0c)` with `border: 2px solid <accent>66`, `box-shadow: 0 14px 36px <accent>33`. Inner padding 22-32px.
- **Stat pill (huge number + label):** column flex, accent gradient bg, accent border, accent glow on the digit (`text-shadow: 0 0 60px <accent>66`).
- **Date / status chip:** mono, 700-900 weight, solid accent fill, near-black `color: #0A0E18` for contrast, 14px radius.
- **URL / chip pill:** mono, `background: rgba(232,233,240,0.06)`, `border: 1.5px solid rgba(232,233,240,0.16)`, fully rounded (`border-radius: 999px`), 14-18px vertical padding.
- **Workflow node card** (Archon-specific surface — optional): 18px radius, `background: rgba(22,27,44,0.85)` (`--surface` at alpha), `border: 1.5px solid rgba(232,233,240,0.10)`, with a 4px left-edge accent stripe in the node's role color (cyan = command, purple = prompt, yellow = bash). Mirrors the dashboard's node visualization.
- **Ambient:** two slow radial drifts — a cyan one and a magenta one, each at ~10% alpha, anchored to opposite corners, sine yoyo over ~12s. Echoes the logo gradient at scale.

## Audio / SFX Cues

Canonical rules: [`.claude/rules/audio-design.md`](../../../.claude/rules/audio-design.md). Cue files live in [`shared/audio/sfx/`](../../../shared/audio/) (sync into a video via [`scripts/sync-video-sfx.sh`](../../../scripts/sync-video-sfx.sh)).

Narration is one stem per scene (or one continuous stem with `data-media-start` offsets). SFX are layered as separate `<audio>` elements at low volume, keyed to spoken-word seconds. **No background music on Shorts** (per repo audio-design rules) — narration + SFX + optional sonic-logo only.

| Cue | Use on | Default `data-volume` |
|---|---|---|
| `impact-slam` | Hero word reveal | 0.20 |
| `scale-slam` | Stat-pill entrance | 0.20 |
| `screen-shake` | Hero word inline shake | 0.15 |
| `cinematic-whoosh` | Phase / scene change | 0.15 |
| `spring-pop` | Card or chip entrance | 0.15 |
| `pop` | Small chip / list item | 0.13 |
| `glitch-zap` | Pivot, "BUT…" callout | 0.12 |
| `strike-cross` | Strikethrough moment | 0.15 |
| `sonic-logo` | Composition start (optional) | 0.60 |

Hard cap: **never** exceed `0.25` on a single per-cue SFX (sonic-logo at `0.60` is the only documented exception). Stack 2-3 quiet ones rather than one loud one.

## What NOT to Do

1. **No light canvas.** This is dark stage. Don't tint the background toward gray paper or pure black — keep the deep-blue lift.
2. **No more than one accent per phase.** Pick cyan OR magenta OR purple OR blue for that phase's chrome — don't paint a rainbow.
3. **No serif headlines.** Inter only.
4. **No flashing strobes / glitches longer than 6 frames.** This is publication-grade calm with percussive accents, not influencer chaos.
5. **No `<br>` in content text.** Use `max-width` so text wraps naturally — `<br>` causes overlap when fonts render slightly wider than estimated.
6. **No background music on Shorts.** Narration + SFX only. (BG music is reserved for long-form templates.)
7. **No `position: absolute; top: Npx` on `.phase-content`.** Content containers must use `padding` to position; absolute positioning overflows on dynamic text.
8. **No accent below 40px.** Cyan/magenta/purple/blue don't carry contrast for body — keep them on hero, headline, badges, borders, and single accent words only.
9. **No more than one gradient hero slam per scene.** The cyan→magenta text-fill is the signature flourish; using it twice in a phase dilutes it.
10. **Don't replicate the Anthropic orange.** This template is Archon's identity — orange has no role in the Archon palette. If you need a warm accent, use yellow (`#E0AD3D`) and only for warnings.
