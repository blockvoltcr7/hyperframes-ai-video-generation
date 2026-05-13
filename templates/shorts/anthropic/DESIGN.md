# DESIGN — Anthropic Shorts (Dark Stage)

Visual system for **YouTube Shorts** (1080x1920, 30fps, 60-180s) for videos covering Anthropic, Claude, and the Claude ecosystem. Dark, near-black canvas inspired by Anthropic's published dark-stage aesthetic — the presentation style Anthropic uses in their Claude launch videos and brand site. Warm orange accent from Anthropic's published brand identity, softened by a cream-clay secondary. Designed to feel like a considered engineering announcement, not a product-launch hype reel.

## Provenance

Palette and typographic choices are inspired by Anthropic's published visual identity — not invented:

- **Canvas and warmth:** Derived from the near-black dark-stage treatment Anthropic uses in their Claude release videos and on the Anthropic brand site. The slightly cooler near-black (`#0B0F18`) grounds the warm accent palette.
- **Orange accent:** Drawn from Anthropic's published brand identity — the warm orange that appears in their wordmark and product UI. Used as the primary hero and hero-gradient opener.
- **Cream-clay secondary:** Anthropic's palette leans warm rather than pure saturated. The cream-clay `#C97A5C` serves as the quieter CTA accent, continuing the warmth without competing with the orange.
- **Muted purple and slate-blue:** Supporting accents that complement the warm palette without introducing Archon's cooler electric tones. Kept desaturated to respect the quieter Anthropic voice.
- **Typography:** Inter (sans) and JetBrains Mono (mono) — same pairing used across the HyperFrames template family. Consistent across templates; coincidentally also consistent with Anthropic's own web type choices.

> This template is inspired by Anthropic's dark-stage aesthetic from their published Claude videos and brand site. It is not an official Anthropic production and is not affiliated with or endorsed by Anthropic PBC. The CSS wordmark is rendered in-browser — no Anthropic trademark assets are shipped in this repo.

## Style Prompt

A dark, near-black stage tuned for vertical video about Anthropic's Claude models and the broader Claude ecosystem. The canvas is one step cooler than pure black, holding warm-white type and a deliberately warm, narrow accent palette: Anthropic orange for hero moments, cream-clay for CTA, muted purple and slate-blue as supporting players. Layout is the same phase-based four-act structure as all HyperFrames Shorts templates — one phase visible per frame, 240px top safe-zone reserved for the ANTHROPIC wordmark, generous vertical breathing room. Motion is percussive and grounded — slam-in hero words with a tight inline shake, stat pills that spring, feature cards that slide from the left. Reads like a calm product release from a company that doesn't need to shout.

## Canvas

- Resolution: **1080 x 1920** (vertical Shorts)
- Frame rate: **30fps**
- Duration target: **60-180s** (YT Shorts hard max 180s)
- Background: solid `#0B0F18`. No full-screen linear gradients (banding under H.264) — use radial highlights or solid + localized glow only.

## Colors

| Role | Hex | Notes | Usage |
|---|---|---|---|
| Background | `#0B0F18` | One step cooler than pure black | Page canvas — Anthropic dark-stage |
| Surface | `#171C2D` | Slightly lifted surface | Cards, secondary panels |
| Surface elevated | `#1F2437` | Hover / inset surfaces | Elevated cards |
| Primary text | `#E8E9F0` | Warm off-white | Headlines, body |
| Secondary text | `#9A9BA3` | Muted gray | Captions, meta |
| Accent — orange | `#E07B3C` | Anthropic brand orange | Hero accent, primary slam (`--cyan` variable) |
| Accent — cream-clay | `#C97A5C` | Softer warm secondary | CTA, "landing" moment (`--magenta` variable) |
| Accent — purple | `#A78BCE` | Muted purple | Secondary feature, mid-palette bridge (`--purple` variable) |
| Accent — slate-blue | `#7DA3B8` | Desaturated blue | Workhorse, technical colorway (`--blue` variable) |
| Accent — yellow | `#E0AD3D` | Warning-band only | Warnings only — never decorative |
| Accent — red | `#DC4838` | Error-band only | Errors / regressions only — never decorative |
| Pill background | `rgba(232, 233, 240, 0.06)` | Neutral chip fill | Default chip / pill fill |
| Pill border | `rgba(232, 233, 240, 0.16)` | Neutral chip stroke | Default chip / pill stroke |

**Variable name note:** The CSS variables are named `--cyan`, `--magenta`, `--purple`, `--blue` to keep the HTML structure structurally identical to the archon template. In the Anthropic template, `--cyan` maps to Anthropic orange and `--magenta` maps to cream-clay. This is intentional — it means anyone diffing the two templates sees only CSS values change, not class names or HTML structure.

**Contrast check (approximate, WCAG):**
- Primary text on background: ~14:1 (AAA)
- Orange on background: ~4.8:1 (AA normal at 24px+)
- Cream-clay on background: ~4.1:1 (AA large at 40px+)
- Purple on background: ~5.2:1 (AA normal at 24px+)
- Slate-blue on background: ~5.5:1 (AA normal at 24px+)

**Accent rotation rule:** Within one video, no two adjacent phases share the same accent. Orange opens (hero), cream-clay closes (CTA), purple/slate-blue rotate through the middle. Never paint a phase with more than one accent at once.

**Hero gradient (signature Anthropic flourish):** Big slam words use a `linear-gradient(135deg, #E07B3C, #C97A5C)` (orange to cream-clay) with `background-clip: text; -webkit-background-clip: text; color: transparent`. Use this on at most ONE element per scene — the hero slam word in Phase 1. The gradient echoes Anthropic's warm palette at scale.

## Typography

Inter (sans) and JetBrains Mono (mono) — same pairing as the Archon template and Anthropic's own web type. Inter carries headlines, body, hero slams. JetBrains Mono carries overlines, dates, URLs, status badges, and anything that reads as system output or model metadata.

| Role | Family | Weight | Treatment |
|---|---|---|---|
| Hero slam (gradient) | `Inter, system-ui, sans-serif` | 900 | `letter-spacing: -4px`, gradient text fill, glow `drop-shadow` matched to orange |
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
| Hero slam (e.g. "OPUS 4", "CLAUDE", "AGENTIC") | 200-240px |
| Hero pre-slam line ("Anthropic just shipped") | 64-72px |
| Headline | 60-64px |
| Body large | 40-44px |
| Body | 36px |
| Section overline (mono) | 34-40px |
| Caption (mono) | 28-32px |

**Tabular numerals on stats:** add `font-variant-numeric: tabular-nums lining-nums` so digits don't jitter across springs.

## Layout

**Safe zones — non-negotiable.** A persistent ANTHROPIC wordmark banner sits at `top: 60px`. Every phase container MUST reserve top space for it. A slim progress bar sits at the bottom.

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
- **Direction:** Vertical y-rises dominate (`y: +40 -> 0`). Hero slams use `scale: 0.78 -> 1.0`. Horizontal slides only for chip rows. No rotation. No scale-pop above 1.06.
- **Stagger:** 80-140ms on body lists; 40-60ms on chip rows; 200-280ms between feature cards.
- **Inline shake** on the impact frame of a slam word (3-6 frames, +-5-6px translate). One shake per phase max.
- **Gradient drift on hero slam:** the orange->cream gradient may slowly drift its background-position across the slam word's lifetime (`background-position: 0% 50% -> 100% 50%` over 4-6s, `sine.inOut`, no repeat). Subtle warmth, not distraction.

## Surface Detail

- **Cards:** 20-26px radius, `background: linear-gradient(135deg, <accent>26, <accent>0c)` with `border: 2px solid <accent>66`, `box-shadow: 0 14px 36px <accent>33`. Inner padding 22-32px.
- **Stat pill (huge number + label):** column flex, accent gradient bg, accent border, accent glow on the digit.
- **Date / status chip:** mono, 700-900 weight, solid accent fill, near-black `color: #0B0F18` for contrast, 14px radius.
- **URL / chip pill:** mono, `background: rgba(232,233,240,0.06)`, `border: 1.5px solid rgba(232,233,240,0.16)`, fully rounded (`border-radius: 999px`), 14-18px vertical padding.
- **Ambient:** two slow radial drifts — an orange one and a purple one, each at ~10% alpha, anchored to opposite corners, sine yoyo over ~12s. Echoes the brand palette at canvas scale.

## Audio / SFX Cues

Canonical rules: [`.claude/rules/audio-design.md`](../../../.claude/rules/audio-design.md). Cue files live in [`shared/audio/sfx/`](../../../shared/audio/) (sync into a video via [`scripts/sync-video-sfx.sh`](../../../scripts/sync-video-sfx.sh)).

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

1. **No cyan or magenta.** Those are the Archon template's signature colors. If you want a cooler green accent, you are in the wrong template. `#22D9A0` (Archon cyan) and `#E64DCC` (Archon magenta) must not appear here.
2. **No light canvas.** This is dark stage. Do not tint the background toward gray paper or pure black — keep the near-black `#0B0F18` warmth.
3. **No more than one accent per phase.** Pick orange OR cream-clay OR purple OR slate-blue for that phase's chrome.
4. **No electric blue.** The Archon electric blue (`#4B82EF`) has no role here — use the quieter slate-blue (`#7DA3B8`) instead.
5. **No serif headlines.** Inter only.
6. **No flashing strobes / glitches longer than 6 frames.** Anthropic's visual register is calm and considered.
7. **No `<br>` in content text.** Use `max-width` so text wraps naturally.
8. **No background music on Shorts.** Narration + SFX only.
9. **No `position: absolute; top: Npx` on `.phase-content`.** Content containers must use `padding` to position.
10. **No accent below 40px.** Orange and cream-clay don't carry contrast for body copy at small sizes.
11. **No more than one gradient hero slam per scene.** The orange->cream text-fill is the signature flourish; use it once in Phase 1.
12. **No claims of official Anthropic affiliation.** This template is inspired by Anthropic's public aesthetic — it is not an official Anthropic asset and must not be presented as one.
