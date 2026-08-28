# DESIGN — Classic Shorts (Dev-Tool Dark)

Visual system for **YouTube Shorts** (1080x1920, 30fps, 60-180s) covering any developer tool, AI workflow, productivity topic, or engineering concept. Deep navy canvas with bright blue accents — the generic "modern dev tool dark theme" that looks at home whether the subject is Kubernetes, RAG pipelines, AI agents, CLI tools, or anything else. No brand signature; designed to be adopted and customized.

## Provenance

This is the brand-neutral default template. Palette is a generic dev-tool dark theme — deep navy with bright blue accents. Designed to look at home for any topic. Swap `--accent-1` and `--accent-2` (mapped to `--cyan` and `--magenta` in the CSS) to match your brand without losing the structural integrity of the composition.

- **Canvas:** Deep navy `#0E1420` — one step cooler than the anthropic near-black. Inspired by the blue-shifted dark mode palettes common across VS Code, GitHub dark, and terminal emulators.
- **Bright blue accent:** `#4D8FF7` — a clean, saturated blue that reads as "primary action / hero moment" in any dev-tool context. Avoids the electric neon of Archon's cyan; avoids the muted slate of the Anthropic supporting palette. Sits in the readable, professional midrange.
- **Sky blue secondary:** `#7AC4F5` — a lighter desaturated sibling to the hero blue. Natural CTA color: warm enough to land softly after the blue opens, cool enough to stay on-palette.
- **Soft indigo:** `#8B7FE8` — bridges the blue and teal without clashing. Mid-palette bridge for Phase 3 cards.
- **Teal-green:** `#5EDBA4` — the workhorse accent. Distinct from blue/indigo, never decorative alone, adds a third dimension to Phase 3 card rotation.
- **Typography:** Inter (sans) and JetBrains Mono (mono) — same pairing used across the HyperFrames template family.

> This template ships with placeholder brand strings ("YOUR BRAND", "your-domain.com"). These are intentional — see README.md "Make it yours" for the swap checklist. **Do not ship a video with these literals still in place.**

## Style Prompt

A deep navy stage tuned for vertical video about developer tools, AI workflows, and engineering topics. The canvas is a cool dark navy, holding warm-white type and a professional blue accent palette: bright clean blue for hero moments, sky blue for CTA, soft indigo and teal-green as supporting players. Layout is the same phase-based four-act structure as all HyperFrames Shorts templates — one phase visible per frame, 240px top safe-zone reserved for the brand wordmark banner, generous vertical breathing room. Motion is percussive and grounded — slam-in hero words with a tight inline shake, stat pills that spring, feature cards that slide from the left. Reads like a clean engineering announcement from a team that ships.

## Canvas

- Resolution: **1080 x 1920** (vertical Shorts)
- Frame rate: **30fps**
- Duration target: **60-180s** (YT Shorts hard max 180s)
- Background: solid `#0E1420`. No full-screen linear gradients (banding under H.264) — use radial highlights or solid + localized glow only.

## Colors

| Role | Hex | Notes | Usage |
|---|---|---|---|
| Background | `#0E1420` | Deep navy, slightly cooler than near-black | Page canvas — dev-tool dark theme |
| Surface | `#181F33` | Slightly lifted surface | Cards, secondary panels |
| Surface elevated | `#212944` | Hover / inset surfaces | Elevated cards |
| Primary text | `#E8E9F0` | Warm off-white | Headlines, body |
| Secondary text | `#9A9BA3` | Muted gray | Captions, meta |
| Accent — bright blue | `#4D8FF7` | Clean professional blue | Hero accent, primary slam (`--cyan` variable) |
| Accent — sky blue | `#7AC4F5` | Lighter, softer secondary | CTA, "landing" moment (`--magenta` variable) |
| Accent — soft indigo | `#8B7FE8` | Blue-purple bridge | Secondary feature, mid-palette bridge (`--purple` variable) |
| Accent — teal-green | `#5EDBA4` | Calm teal, distinct from blue | Workhorse, third card color (`--blue` variable) |
| Accent — yellow | `#E0AD3D` | Warning-band only | Warnings only — never decorative |
| Accent — red | `#DC4838` | Error-band only | Errors / regressions only — never decorative |
| Pill background | `rgba(232, 233, 240, 0.06)` | Neutral chip fill | Default chip / pill fill |
| Pill border | `rgba(232, 233, 240, 0.16)` | Neutral chip stroke | Default chip / pill stroke |

**Variable name note:** The CSS variables are named `--cyan`, `--magenta`, `--purple`, `--blue` to keep the HTML structure structurally identical to the archon and anthropic templates. In the Classic template, `--cyan` maps to bright blue, `--magenta` maps to sky blue, `--purple` maps to soft indigo, and `--blue` maps to teal-green. This is intentional — anyone diffing two templates sees only CSS values change, not class names or HTML structure.

**Contrast check (approximate, WCAG):**
- Primary text on background: ~14:1 (AAA)
- Bright blue on background: ~5.0:1 (AA normal at 24px+)
- Sky blue on background: ~6.5:1 (AA normal at 24px+)
- Soft indigo on background: ~5.1:1 (AA normal at 24px+)
- Teal-green on background: ~7.2:1 (AA normal at 24px+)

**Accent rotation rule:** Within one video, no two adjacent phases share the same accent. Bright blue opens (hero), sky blue closes (CTA), soft indigo and teal-green rotate through the middle. Never paint a phase with more than one accent at once.

**Hero gradient (signature classic flourish):** Big slam words use a `linear-gradient(135deg, #4D8FF7, #7AC4F5)` (bright-blue to sky-blue) with `background-clip: text; -webkit-background-clip: text; color: transparent`. Use this on at most ONE element per scene — the hero slam word in Phase 1. The gradient echoes the palette's primary range at scale.

## Typography

Inter (sans) and JetBrains Mono (mono) — same pairing as all HyperFrames templates. Inter carries headlines, body, hero slams. JetBrains Mono carries overlines, dates, URLs, status badges, and anything that reads as system output or developer metadata.

| Role | Family | Weight | Treatment |
|---|---|---|---|
| Hero slam (gradient) | `Inter, system-ui, sans-serif` | 900 | `letter-spacing: -4px`, gradient text fill, glow `drop-shadow` matched to bright blue |
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
| Hero slam (e.g. "SHIPPED", "DONE", "BUILT") | 200-240px |
| Hero pre-slam line | 64-72px |
| Headline | 60-64px |
| Body large | 40-44px |
| Body | 36px |
| Section overline (mono) | 34-40px |
| Caption (mono) | 28-32px |

**Tabular numerals on stats:** add `font-variant-numeric: tabular-nums lining-nums` so digits don't jitter across springs.

## Layout

**Safe zones — non-negotiable.** A persistent brand wordmark banner sits at `top: 60px`. Every phase container MUST reserve top space for it. A slim progress bar sits at the bottom.

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
  - **Avoid** `elastic` and `bounce` — they read toy-like for this aesthetic.
- **Duration:**
  - Hero / slam word: 0.6-0.9s
  - Headline: 0.5-0.7s
  - Body / chip: 0.35-0.5s
  - Phase crossfade: 0.4s opacity + 0.5s blur
- **Direction:** Vertical y-rises dominate (`y: +40 -> 0`). Hero slams use `scale: 0.78 -> 1.0`. Horizontal slides only for chip rows. No rotation. No scale-pop above 1.06.
- **Stagger:** 80-140ms on body lists; 40-60ms on chip rows; 200-280ms between feature cards.
- **Inline shake** on the impact frame of a slam word (3-6 frames, +-5-6px translate). One shake per phase max.
- **Gradient drift on hero slam:** the bright-blue->sky-blue gradient may slowly drift its background-position across the slam word's lifetime (`background-position: 0% 50% -> 100% 50%` over 4-6s, `sine.inOut`, no repeat). Subtle energy, not distraction.

## Surface Detail

- **Cards:** 20-26px radius, `background: linear-gradient(135deg, <accent>26, <accent>0c)` with `border: 2px solid <accent>66`, `box-shadow: 0 14px 36px <accent>33`. Inner padding 22-32px.
- **Stat pill (huge number + label):** column flex, accent gradient bg, accent border, accent glow on the digit.
- **Date / status chip:** mono, 700-900 weight, solid accent fill, near-black `color: #0E1420` for contrast, 14px radius.
- **URL / chip pill:** mono, `background: rgba(232,233,240,0.06)`, `border: 1.5px solid rgba(232,233,240,0.16)`, fully rounded (`border-radius: 999px`), 14-18px vertical padding.
- **Ambient:** two slow radial drifts — a blue one and an indigo one, each at ~10% alpha, anchored to opposite corners, sine yoyo over ~12s. Establishes the nav-themed atmosphere at canvas scale.

## Audio / SFX Cues

Canonical rules: [`.agents/rules/audio-design.md`](../../../.agents/rules/audio-design.md). Cue files live in [`shared/audio/sfx/`](../../../shared/audio/) (sync into a video via [`scripts/sync-video-sfx.sh`](../../../scripts/sync-video-sfx.sh)).

Narration is one stem per scene. SFX are layered at low volume, keyed to spoken-word seconds. **No background music on Shorts** — narration + SFX + optional sonic-logo only.

| Cue | Use on | Default `data-volume` |
|---|---|---|
| `impact-slam` | Hero word reveal | 0.20 |
| `scale-slam` | Stat-pill entrance | 0.20 |
| `screen-shake` | Hero word inline shake | 0.15 |
| `cinematic-whoosh` | Phase / scene change | 0.15 |
| `spring-pop` | Card or chip entrance | 0.15 |
| `pop` | Small chip / list item | 0.13 |
| `glitch-zap` | Pivot, "BUT..." callout | 0.12 |
| `strike-cross` | Strikethrough moment | 0.15 |
| `sonic-logo` | Composition start (optional) | 0.60 |

Hard cap: **never** exceed `0.25` on a single per-cue SFX (sonic-logo at `0.60` is the only documented exception).

## What NOT to Do

1. **No Archon cyan or magenta.** `#22D9A0` (Archon cyan) and `#E64DCC` (Archon magenta) must not appear here. They belong to the Archon template.
2. **No Anthropic orange or cream.** `#E07B3C` (Anthropic orange) and `#C97A5C` (cream-clay) must not appear here. They belong to the Anthropic template.
3. **No light canvas.** This is dark stage. Do not tint the background toward gray paper or pure black — keep the deep navy `#0E1420`.
4. **No more than one accent per phase.** Pick bright-blue OR sky-blue OR soft-indigo OR teal-green for that phase's chrome.
5. **No electric blue.** The Archon electric blue (`#4B82EF`) has no role here — use the brighter but less saturated `#4D8FF7` instead.
6. **No serif headlines.** Inter only.
7. **No flashing strobes / glitches longer than 6 frames.** Professional, considered register.
8. **No `<br>` in content text.** Use `max-width` so text wraps naturally.
9. **No background music on Shorts.** Narration + SFX only.
10. **No `position: absolute; top: Npx` on `.phase-content`.** Content containers must use `padding` to position.
11. **No accent below 40px.** Blue accents don't carry contrast for body copy at small sizes.
12. **No more than one gradient hero slam per scene.** The bright-blue->sky-blue text-fill is the signature flourish; use it once in Phase 1.
13. **Do not ship a video with the literal string `YOUR BRAND` in the top banner.** Replace it before render.
14. **Do not ship a video with the literal URL `your-domain.com` in Phase 4.** Replace it before render.
