# Opaque robot to layered HyperFrames cutout

## Deliverable and stop condition

Prepare one reusable robot cutout for a 1080x1920 scene while keeping typography and other factual content as native HTML/SVG. The source illustration is an opaque `1024x1024` PNG; the delivery is a `1024x1024` PNG with real alpha.

This document is a production plan only. Image generation and background removal have not been run. The companion manifest must stay `pending` until source and delivery files exist and every acceptance check below passes.

Planned project-relative paths:

| Role | Path |
| --- | --- |
| Opaque source | `assets/source/robot-opaque.png` |
| Transparent delivery | `assets/generated/robot-cutout.png` |
| Provenance record | `asset-manifest.json` |
| Composite QA frame | `snapshots/robot-hero-at-3.2s.png` |

## 1. Freeze the visual plan

- Use the robot as a generated hero illustration because an original subject cutout adds semantic value. Keep headlines, labels, numbers, logos, and diagrams out of the raster.
- Use a square `1024x1024` source for a reusable cutout. Frame one full-body robot in a single frozen three-quarter pose with at least 20% clear margin, no cropped limbs, and a crisp silhouette.
- If generation is needed later, use the exact canonical prompt and prompt hash in `robot-cutout.manifest.example.json`. Generate against a simple solid chroma-magenta ground that strongly contrasts with the graphite/cobalt/teal subject.
- GPT Image 2 output is opaque. A checkerboard drawn into the image is still opaque pixels and is not transparency. Never deliver the generation result directly as the cutout.
- Reject malformed anatomy, extra or duplicate parts, accidental text, logos, watermarks, unwanted props, a shadow that crosses the silhouette, or a background color too close to the subject edge.

## 2. Freeze and hash the opaque source

After a human accepts the opaque source, copy it unchanged to `assets/source/robot-opaque.png`. Compute SHA-256 from the actual file bytes and write it to `files.source.content_hash.value`:

```bash
shasum -a 256 assets/source/robot-opaque.png
```

Do not fabricate a seed or content hash. Codex generation does not guarantee a reusable seed, and no content hash exists until the corresponding file exists.

## 3. Produce the transparent derivative

Run HyperFrames background removal only after source acceptance:

```bash
npx --no-install hyperframes remove-background \
  assets/source/robot-opaque.png \
  -o assets/generated/robot-cutout.png
```

This planned command is not a clean-plate or inpainting operation. It creates a subject PNG whose background should be transparent. Keep the opaque source as the immutable provenance parent; do not paint destructively over it.

After the command succeeds, hash the delivery bytes and record the value in `files.delivery.content_hash.value`:

```bash
shasum -a 256 assets/generated/robot-cutout.png
```

Any pixel edit or re-export changes the content hash and resets acceptance to `pending` until QA is repeated.

## 4. Prove real alpha

Do not rely on a checkerboard preview. Inspect the PNG metadata and pixel data with an alpha-aware tool such as `sharp` and require all of the following:

1. The file decodes as PNG with an alpha channel; adding an all-opaque channel during inspection is not allowed.
2. At least one pixel has alpha `0` and at least one pixel has alpha `255`. This rules out both a fully opaque image and an empty cutout.
3. The four corners are transparent, and the robot torso contains opaque pixels.
4. Hairline details, antennae, fingers, and feet remain connected; no magenta spill, hard fringe, holes, or detached islands are visible at 100% and 200% zoom.
5. Composite the cutout over both black and white test grounds. The silhouette must remain clean on both.

Record measured results under `acceptance.checks.real_alpha` and `acceptance.checks.edge_quality`. Failure keeps the asset out of the scene.

## 5. Integrate as deterministic layers

Use the generated pixels only for the robot. Keep the scene background native and the headline as selectable HTML. Put timing attributes on the image and animate its untimed wrapper; use `contain` so the cutout is never cropped.

```html
<section id="robot-scene" aria-label="AI robot introduction">
  <div id="robot-stage" aria-hidden="true"></div>

  <h1 id="robot-headline">MEET YOUR AI COPILOT</h1>

  <div id="robot-cutout-wrap">
    <img
      id="robot-cutout"
      src="assets/generated/robot-cutout.png"
      alt="Friendly futuristic service robot"
      crossorigin="anonymous"
      data-start="0"
      data-duration="6"
    />
  </div>
</section>
```

```css
#robot-scene { position: relative; width: 1080px; height: 1920px; overflow: hidden; }
#robot-stage { position: absolute; inset: 0; z-index: 1; background: #07111f; }
#robot-headline { position: absolute; z-index: 2; left: 96px; right: 96px; top: 248px; }
#robot-cutout-wrap { position: absolute; z-index: 3; left: 90px; top: 470px; width: 900px; height: 1240px; }
#robot-cutout { width: 100%; height: 100%; object-fit: contain; object-position: 50% 50%; }
```

```js
gsap.set("#robot-cutout-wrap", {
  x: 0,
  y: 28,
  scale: 0.96,
  opacity: 0,
  transformOrigin: "50% 78%",
});

timeline
  .to("#robot-cutout-wrap", {
    x: 0,
    y: 0,
    scale: 1.03,
    opacity: 1,
    duration: 0.65,
    ease: "power2.out",
  }, 0.25)
  .to("#robot-cutout-wrap", {
    x: 0,
    y: -24,
    scale: 1.06,
    duration: 5.1,
    ease: "none",
  }, 0.9);
```

The values above are authored constants, so seeking to the same time yields the same transform. Do not use random offsets, viewport-dependent transforms, intrinsic image resizing, or rasterized text. The headline sits between the native stage and the foreground cutout; it may be partially occluded by the robot while remaining an independent HTML layer.

## 6. Inspect the composited hero frame

The source PNG is not the final approval surface. After integration, capture the intended hero frame from the actual project:

```bash
npx --no-install hyperframes snapshot <project-dir> --at 3.2
npx --no-install hyperframes lint <project-dir>
npx --no-install hyperframes check <project-dir> --json --strict --at 3.2 --at-transitions
```

Inspect the 1080x1920 composite and require:

- The complete silhouette stays inside the vertical safe zone with no clipped feet or antennae.
- The subject remains the focal point and does not cover essential headline characters.
- The native headline is legible against the actual pixels and remains editable/selectable.
- Alpha edges are clean against the final stage, not only against the test grounds.
- The wrapper motion is subtle and deterministic, with no pop, layout shift, or interpolation of intrinsic image dimensions.
- Strict QA reports no layout or contrast defect at the hero frame or transitions.

Only then set `acceptance.status` to `accepted`, add the reviewer and timestamp, mark every check `passed`, and preserve the snapshot path. If any check fails, keep `pending` or set `rejected`, correct the derivative or layout, re-hash changed bytes, and repeat QA.

## 7. Manifest update rules

- Preserve the exact canonical prompt and its SHA-256.
- Record both the generation provider (`codex.image_gen`) and derivative processor (`hyperframes.remove-background`).
- Record source and delivery paths plus SHA-256 values computed from real bytes.
- Omit a seed unless a provider actually returns one. This example intentionally has no seed field.
- Keep acceptance `pending` while hashes or QA evidence are missing.
- Any destructive change creates a new delivery hash and invalidates prior acceptance evidence.
