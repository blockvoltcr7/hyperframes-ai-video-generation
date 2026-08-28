# HyperFrames registry catalog (project-local snapshot)

Quick-scan inventory of every block + component installable via `npx hyperframes add <name>`. Maintained as a project-local cheat sheet so Claude can browse what's available when planning a video, instead of having to fetch the catalog every session.

> **The bundled `hyperframes-registry` skill (`.agents/skills/hyperframes-registry/`) is the source of truth for HOW to install and wire items.** Read this file for WHAT exists; read the skill for the install / wiring mechanics.
>
> **For project-local "only-we-got" animations** (custom blocks, components, and effects authored in this repo, copy-from `shared/lib/`), see [`shared/lib/MANIFEST.md`](../../shared/lib/MANIFEST.md). Currently includes hero-grade items not in the upstream registry: `cinema-title-slam` (block), `magnet-snap-letters`, `cinematic-letterbox-reveal`, `confetti-burst`, `burst-rays`. Always check there too before hand-rolling.

## When to use this file

- Picking visuals for `phase1-plan` (composition plan) or any new video
- Looking for an existing block/component that solves the visual problem before hand-rolling a new one
- Discovering whether the catalog has a block matching a user's description ("can we do an iPhone 3D shot?", "shatter transition?", "liquid background?")

## How to refresh

This snapshot was captured **2026-05-06**. The catalog evolves — verify before claiming a block doesn't exist:

```bash
# Live index of all catalog pages (every block + component has a /catalog/<type>/<name> URL)
curl -s https://hyperframes.heygen.com/llms.txt

# Per-block detail (replace <name>)
# https://hyperframes.heygen.com/catalog/blocks/<name>
# https://hyperframes.heygen.com/catalog/components/<name>
```

When you find a new block, add a one-liner row here and bump the snapshot date.

---

## Blocks (`npx hyperframes add <name>`)

Blocks are standalone sub-compositions with their own dimensions, duration, and timeline. Wire via `data-composition-src` in a host composition. See `.agents/skills/hyperframes-registry/references/wiring-blocks.md`.

### VFX & 3D — html-in-canvas family

These run **HTML content inside a 3D / WebGL canvas**. Live preview requires Chrome flag `chrome://flags/#canvas-draw-element`; CLI rendering enables it automatically. All 1920×1080.

| Name | Duration | Purpose |
|---|---|---|
| `vfx-iphone-device` | 15s | Real GLTF iPhone 15 Pro Max + MacBook Pro models with live HTML-in-Canvas screen content, morphing glass lens, product-review camera choreography, 360° turntable |
| `vfx-liquid-background` | — | Organic liquid simulation with vertex displacement on a subdivided plane; HTML floats above a rippling fluid surface with real-time wave dynamics |
| `vfx-liquid-glass` | 20s | Liquid glass rendering effect (WebGL) — refractive/distortive glass surface over HTML content |
| `vfx-magnetic` | 15s | Magnetic-attraction VFX — elements pull toward / repel from a focal point |
| `vfx-portal` | 10s | Portal-style VFX (WebGL) — circular reveal/teleport effect |
| `vfx-shatter` | 12s | Shattering animation — element breaks apart into shards |
| `vfx-text-cursor` | — | Dramatic text reveal with cursor glow, chromatic shadow rays, directional lighting on a black stage; canvas-based shader post-processing with spectral color edges |
| `ui-3d-reveal` | — | Perspective 3D reveal animation for UI elements |

### Animation & effects (foreground content blocks)

| Name | Purpose |
|---|---|
| `app-showcase` | Fitness-app product showcase with three floating smartphone screens |
| `apple-money-count` | Apple-style finance counter $0 → $10,000, flashes green, bursts money icons with sound |
| `blue-sweater-intro-video` | Warm AI-creator intro that resolves into an X follow card |
| `data-chart` | Animated bar + line chart, staggered reveal, NYT-style typography, value labels |
| `flowchart` | Animated decision tree with SVG connectors, sticky-note nodes, cursor interaction, typing correction |
| `logo-outro` | Cinematic logo reveal — piece-by-piece assembly, glow bloom, tagline fade-in, URL pill |
| `macOS-notification` | Animated macOS-style notification banner with app icon and message |
| `north-korea-locked-down` | Realistic map zoom into North Korea, red scribble circle, locked-down pop-up label |
| `nyc-paris-flight` | Apple-style realistic map with a plane flying NYC → Paris |
| `vpn-youtube-spot` | Snappy Apple-style YouTube insert showing a phone finding and installing a VPN app with SFX |
| `youtube-lower-third` | Animated YouTube subscribe lower third with avatar and channel info |

### Social media overlays

| Name | Purpose |
|---|---|
| `instagram-follow` | Profile card + follow button — Instagram styling |
| `reddit-post` | Post card with upvotes and comments |
| `spotify-card` | Now-playing card with album art and progress bar |
| `tiktok-follow` | Profile card + follow button — TikTok styling |
| `x-post` | Tweet/post card with engagement metrics |

### Shader transitions (between scenes)

| Name | Effect |
|---|---|
| `chromatic-radial-split` | Chromatic aberration radial split |
| `cinematic-zoom` | Dramatic zoom blur |
| `cross-warp-morph` | Cross-warped morphing |
| `domain-warp-dissolve` | Fractal noise domain warping |
| `flash-through-white` | White flash crossfade |
| `glitch` | Digital glitch artifacts |
| `gravitational-lens` | Gravitational lensing distortion |
| `light-leak` | Cinematic light leak overlay |
| `ridged-burn` | Ridged turbulence burn |
| `ripple-waves` | Concentric ripple wave distortion |
| `sdf-iris` | Signed distance field iris reveal |
| `swirl-vortex` | Swirling vortex distortion |
| `thermal-distortion` | Heat haze thermal distortion |
| `whip-pan` | Fast camera whip pan |

### Transition showcases (catalog of transition styles, not single-purpose blocks)

These are gallery/demo blocks that display a *family* of transitions. Useful for picking the right transition for a long-form scene cut.

| Name | Family |
|---|---|
| `transitions-3d` | 3D perspective flip and rotate |
| `transitions-blur` | Blur-based |
| `transitions-cover` | Cover/uncover slides |
| `transitions-destruction` | Break-apart |
| `transitions-dissolve` | Dissolve and fade |
| `transitions-distortion` | Warp / distortion |
| `transitions-grid` | Grid tile |
| `transitions-light` | Glow / flash |
| `transitions-mechanical` | Shutter / iris |
| `transitions-other` | Miscellaneous |
| `transitions-push` | Push / slide |
| `transitions-radial` | Radial wipe |
| `transitions-scale` | Scale / zoom |

---

## Components (`npx hyperframes add <name>`)

Components are effect snippets — paste their HTML/CSS/JS into a host composition. See `.agents/skills/hyperframes-registry/references/wiring-components.md`.

| Name | Purpose |
|---|---|
| `grain-overlay` | Animated film-grain texture using CSS keyframes — adds analog warmth |
| `grid-pixelate-wipe` | Screen dissolves into a grid of squares with staggered fade-out |
| `shimmer-sweep` | CSS gradient light sweep across text/elements — premium reveal accent |

---

## html-in-canvas — what it is and when to use it

The `html-in-canvas` family (the `vfx-*` and `ui-3d-reveal` blocks) lets you put **live HTML content inside a 3D scene** — your text, images, and screenshots become textures on 3D geometry (phone screens, glass surfaces, shattering shards). This is qualitatively different from CSS 3D transforms: it's real WebGL with depth, refraction, lighting, and post-processing.

**Use when:**

- The video needs a hero "product reveal" moment (vfx-iphone-device for app showcases)
- You want a luxe/cinematic transition between phases (vfx-shatter, vfx-portal, vfx-liquid-glass)
- A scene needs a magnetic, fluid, or otherworldly feel (vfx-magnetic, vfx-liquid-background)
- A text reveal needs more than a stagger — chromatic edges, cursor glow, dramatic stage (vfx-text-cursor)

**Don't use when:**

- The visual could be done with CSS or GSAP equivalently (preserve render time)
- The block's 10–20s minimum duration doesn't fit the phase budget
- You're on a fast Short where the WebGL warmup would dominate the screen time

**Heads-up: render cost.** WebGL post-processing is heavier than CSS animation. Budget extra render time for any video using two or more `html-in-canvas` blocks.

---

## Quick install + wire flow

```bash
# 1. Install (writes the block file + any models/textures into your video)
npx hyperframes add vfx-iphone-device --dir videos/<slug>

# 2. The CLI prints a snippet — paste it into videos/<slug>/index.html
#    (set data-start, data-track-index per your timeline)

# 3. Lint
npx hyperframes lint videos/<slug>
```

Full wiring details live in `.agents/skills/hyperframes-registry/SKILL.md`.
