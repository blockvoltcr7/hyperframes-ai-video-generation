# Opaque robot to layered HyperFrames cutout

## Deliverable

Turn one opaque robot illustration into a transparent, provenance-tracked subject layer for a 1080x1920 HyperFrames hero scene. This is a production plan only: no image generation, background removal, scene edit, or render has been run.

Companion manifest: [`asset-manifest.example.json`](./asset-manifest.example.json).

## Non-negotiable source assumption

Treat GPT Image 2 output as opaque. A `.png` extension does not mean the image contains useful transparency, and a white or checkerboard-looking background is still RGB content until alpha inspection proves otherwise. Keep the received opaque image as an immutable source artifact; the transparent delivery is a separate derivative.

Use this canonical prompt for the example provenance record (UTF-8, no trailing newline):

> A friendly futuristic AI robot, three-quarter view, full body, polished white and graphite shell with blue light accents, centered, arms relaxed, clean silhouette, editorial 3D illustration, no text, no logos.

Its SHA-256 is `a1e9d48677c8042ccc183f6f06a81055ac2f7824cd61e755a4aa2483f5b1a71c`. Record the model as `gpt-image-2` and the provider as `openai`. Do not add a seed: none is available or required, and inventing one would create false provenance.

## Planned paths

Paths are relative to the future HyperFrames composition root:

- Immutable source: `assets/source/robot-hero-gpt-image-2-opaque.png`
- Transparent delivery: `assets/cutouts/robot-hero-cutout-v001.png`
- Alpha evidence: `qa/robot-hero-cutout-v001-alpha.txt`
- Composited hero snapshot: `qa/robot-hero-cutout-v001-hero.png`

Never overwrite the source or an accepted delivery. If the matte changes, increment `v001` and retain both hashes.

## Production workflow

### 1. Freeze and fingerprint the opaque source

1. Save the exact provider response bytes at the source path.
2. Confirm dimensions and color profile; do not resize the source in place.
3. Compute SHA-256 from the actual file and replace the pending source hash in the manifest:

   ```sh
   shasum -a 256 assets/source/robot-hero-gpt-image-2-opaque.png
   ```

4. Keep the manifest acceptance status at `pending`.

### 2. Produce the real cutout through HyperFrames

Route the immutable opaque source through the local HyperFrames background-removal command and write a new PNG:

```sh
npx --no-install hyperframes remove-background \
  assets/source/robot-hero-gpt-image-2-opaque.png \
  --output assets/cutouts/robot-hero-cutout-v001.png \
  --device auto \
  --json
```

This is the required cutout operation; CSS blend modes, clipping a rectangle, or placing the opaque source over a matching background are not substitutes. Preserve the command result as QA evidence. Then hash the delivered bytes and replace the pending delivery hash:

```sh
shasum -a 256 assets/cutouts/robot-hero-cutout-v001.png
```

### 3. Prove that alpha is real

Do not accept the asset based only on a transparent-looking preview. Validate the file itself:

```sh
magick identify -format 'channels=%[channels]\nsize=%wx%h\n' \
  assets/cutouts/robot-hero-cutout-v001.png

magick assets/cutouts/robot-hero-cutout-v001.png \
  -alpha extract \
  -format 'alpha_min=%[fx:minima]\nalpha_max=%[fx:maxima]\nalpha_mean=%[fx:mean]\n' \
  info:
```

Required results:

- Channels include alpha (`rgba`, `srgba`, or equivalent).
- Alpha minimum is approximately `0` and maximum approximately `1`; a constant alpha plane fails.
- The four corners are transparent unless the approved silhouette intentionally touches one.
- The subject is opaque through its solid interior, while hairline details, antennae, and edge pixels use plausible partial alpha.
- At 200% inspection on checkerboard, white, and `#0E1420` backgrounds, there is no opaque box, bright halo, dark fringe, missing limb, or detached island.

Save the command output and visual-review result at the alpha evidence path. If cleanup is needed, create a new derivative version; never paint over the source.

### 4. Integrate as deterministic scene layers

Keep layout, motion, and type separate from the raster. The robot image contains no headline, caption, badge, glow, or shadow. Use fixed wrapper geometry on the 1080x1920 canvas, animate a nested motion wrapper, and leave the `<img>` transform untouched.

```html
<section id="phase1" class="phase" aria-label="AI robot hero">
  <div id="robot-shadow" aria-hidden="true"></div>
  <div id="robot-anchor">
    <div id="robot-motion">
      <img
        id="robot-cutout"
        src="assets/cutouts/robot-hero-cutout-v001.png"
        alt=""
      />
    </div>
  </div>

  <div id="hero-copy">
    <p class="hero-overline">MEET YOUR AI COPILOT</p>
    <h1 id="hero-title">Built to help.</h1>
  </div>
</section>
```

```css
#phase1 { position: relative; width: 1080px; height: 1920px; overflow: hidden; }

#robot-shadow {
  position: absolute;
  z-index: 20;
  left: 50%;
  top: 1470px;
  width: 560px;
  height: 96px;
  transform: translate(-50%, -50%);
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.38);
  filter: blur(34px);
}

#robot-anchor {
  position: absolute;
  z-index: 30;
  left: 50%;
  top: 1040px;
  width: 820px;
  height: 1120px;
  transform: translate(-50%, -50%);
}

#robot-motion {
  width: 100%;
  height: 100%;
  transform-origin: 50% 72%;
}

#robot-cutout {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: contain;
  object-position: 50% 50%;
}

#hero-copy {
  position: absolute;
  z-index: 40;
  left: 60px;
  right: 60px;
  bottom: 250px;
  font-family: Inter, system-ui, sans-serif;
}
```

```js
gsap.set('#robot-motion', {
  x: 0,
  y: 48,
  scale: 0.94,
  rotation: 0,
  opacity: 0,
});

timeline.to('#robot-motion', {
  y: 0,
  scale: 1,
  opacity: 1,
  duration: 0.7,
  ease: 'power3.out',
}, HERO_IN_SECONDS);
```

Layer order is fixed: scene background/ambient (`z-index` 0-10), synthetic shadow (20), transparent robot (30), and live HTML typography/chrome (40+). Because centering lives on `#robot-anchor` and motion lives on `#robot-motion`, GSAP never overwrites the anchor transform. Fixed dimensions, `object-fit: contain`, and explicit transform origins make seeks and renders deterministic.

### 5. Inspect the composited hero frame

After the future scene is wired, run project validation and capture the settled hero frame locally. Replace placeholders with the composition path and the exact settled timestamp:

```sh
npx --no-install hyperframes lint <composition-dir>
npx --no-install hyperframes check <composition-dir> --json --strict --at-transitions
npx --no-install hyperframes snapshot <composition-dir> \
  --at <hero-settled-seconds> \
  --no-end \
  --describe false \
  --output <composition-dir>/qa/robot-hero-snapshot
```

Copy or name the selected full-frame evidence as `qa/robot-hero-cutout-v001-hero.png`. Inspect the actual 1080x1920 composite, not the isolated PNG. Confirm:

- The silhouette reads immediately at phone size and is not cropped by canvas or safe zones.
- The robot remains visually separate from the dark background with no fringe or rectangular matte.
- The synthetic shadow contacts the feet without becoming part of the cutout.
- HTML headline and overline remain crisp, unobstructed, and outside the raster.
- Fixed transforms place the subject correctly at the hero-settled frame and at transition frames.

### 6. Accept or reject

Change `acceptance.status` from `pending` to `accepted` only when all of these are recorded:

1. Real source and delivery SHA-256 values.
2. Proven non-constant alpha and passed edge inspection.
3. Passed HyperFrames lint and strict transition check.
4. Human approval of the composited hero snapshot.
5. Confirmation that typography is live HTML and the raster contains only the robot.

Otherwise set the status to `rejected`, record the failed gate and reviewer note, and produce a versioned replacement rather than silently mutating the files.
