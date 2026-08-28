---
name: hyperframes-visual-assets
description: Plan, generate, document, and integrate original image assets for HyperFrames videos. Use during visual planning whenever a video could benefit from an illustration, subject cutout, atmospheric background, texture, product plate, or visual metaphor. Use it before reaching for generic stock imagery, and use its decision gate to avoid generating images when native HTML, SVG, screenshots, or registry blocks communicate more accurately.
compatibility: Node.js 22+, Codex image_generation feature; optional OPENAI_API_KEY only for explicitly requested API generation
---

# HyperFrames Visual Assets

Generate imagery only when it adds semantic or emotional value. Text, logos, UI, diagrams, citations, and numerical charts should remain native HTML/SVG or verified screenshots so they stay legible and editable.

## Decision gate

For each scene, choose one treatment:

1. **Native HTML/SVG** — best for concepts, diagrams, stats, labels, UI, and typography.
2. **HyperFrames registry** — best when an existing block/component already solves the visual problem. Invoke `$hyperframes-registry` first.
3. **Verified source screenshot/media** — best when the source itself is evidence.
4. **Generated image** — best for original illustrations, metaphors, cutouts, textures, and atmospheric plates.

Do not generate an image merely to fill empty space. Aim for one strong generated hero asset or a tightly related asset family, not an unrelated image in every phase.

## Plan contract

After the script and `DESIGN.md` exist, create `videos/<slug>/asset-plan.json` using [references/asset-plan.example.json](references/asset-plan.example.json) as the contract.

The shared `style_prompt` should capture palette, medium, lighting, lens/perspective, texture, and exclusions. Each asset prompt then describes only its subject and composition. This keeps a family visually coherent.

Prompt requirements:

- State the asset's role and intended crop.
- Reserve negative space when HTML text will overlay the image.
- Request no words, letters, logos, watermarks, UI labels, or factual charts.
- Use `1024x1536` for portrait plates, `1536x1024` for landscape plates, and `1024x1024` for reusable cutouts/textures.
- GPT Image 2 output is opaque. For an isolated subject, generate it on a simple high-contrast ground, then run `hyperframes remove-background` and verify real alpha. Do not mistake a checkerboard drawn into the pixels for transparency.
- Describe a single frozen hero frame. HyperFrames supplies the motion.

## Generate with Codex

Dry-run and inspect the canonical prompts:

```bash
node scripts/generate-image-assets.mjs videos/<slug> --dry-run
```

Generate through Codex's built-in image capability (ChatGPT/Codex authentication, no repository API key):

```bash
node scripts/codex-image-generate.mjs \
  --prompt "<canonical prompt from the plan>" \
  --output /tmp/<asset-id>.png
```

Inspect the generated image. If accepted, import the returned local path into the planned delivery path and provenance manifest:

```bash
node scripts/generate-image-assets.mjs videos/<slug> --asset <id> --source <generated-path>
```

Never accept malformed anatomy, accidental text, unwanted brand marks, or a visually inconsistent result. One targeted retry is preferable to repeatedly rerolling the entire asset family.

### Explicit API alternative

Only when the user explicitly chooses API generation and `OPENAI_API_KEY` is configured:

```bash
node scripts/generate-image-assets.mjs videos/<slug> --api
```

Do not switch from Codex subscription generation to API billing automatically. If generation is optional and unavailable, keep `asset-plan.json`, record the fallback in `visual-plan.json`, and continue with native SVG/HTML, a registry block, or verified source media.

## Integrate into HyperFrames

- Add `crossorigin="anonymous"` to image elements.
- Put timing attributes on the image or its mounted clip, and animate a wrapper rather than changing intrinsic image dimensions.
- Use `object-fit: cover` for plates and `contain` for cutouts.
- Keep motion subtle: 3-8% push-in, 20-60px parallax, mask reveal, light sweep, or staged crop. Avoid making a still image pretend to be full-motion footage.
- Preserve the image's focal point across the vertical safe zone.
- Overlay all copy as HTML and ensure contrast against the actual pixels.

## QA

1. Inspect every output for malformed anatomy, accidental text, brand marks, seams, and inconsistent style.
2. For cutouts, confirm background removal produced real alpha.
3. Run HyperFrames snapshot at the asset's hero frame and inspect the composite, not just the source PNG.
4. Run strict check for layout/contrast.
5. Keep the prompt and hashes in the manifest; do not edit generated files destructively without updating provenance.

An asset is complete only when it improves the composite frame and its source/settings are traceable.
