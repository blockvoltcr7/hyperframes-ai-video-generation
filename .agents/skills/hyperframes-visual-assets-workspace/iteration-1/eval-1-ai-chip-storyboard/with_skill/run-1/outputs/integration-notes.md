# AI Agents, GPUs, and TPUs — Visual Asset Integration Notes

## Scope

This is a planning handoff only. No images have been generated, no composition has been edited, and no API billing has been authorized. The plan deliberately limits generation to one hero cutout and one related portrait plate. All explanatory meaning remains editable in HyperFrames.

## 45-second treatment map

| Time | Story beat | Primary treatment | Asset use |
| --- | --- | --- | --- |
| 0:00-0:06.5 | Hook: an agent has a task, but the heavy math runs elsewhere | Native HTML headline and a small native SVG task pulse | Reveal `agent-orchestrator-cutout` below the headline; keep the raster free of copy |
| 0:06.5-0:18 | GPU: useful for broad parallel workloads | Native HTML labels plus a simplified SVG lane diagram | Use a right-biased crop of `accelerator-fabric-portrait-plate` only as atmosphere; the SVG carries the explanation |
| 0:18-0:30 | TPU: purpose-built acceleration for tensor-oriented workloads | Native HTML labels plus a simplified SVG matrix-flow diagram | Shift to a lower-left crop of the same plate; do not treat generated matrix texture as a factual diagram |
| 0:30-0:40 | Agent routing: software chooses tools/services while infrastructure schedules accelerator work | Native SVG arrows, task chips, and GPU/TPU labels over a layered composite | Reintroduce the cutout above the plate so the routing metaphor resolves visually |
| 0:40-0:45 | Recap: agent decides what to do; accelerators do the math | Native HTML recap and CTA | Fade to the calm upper area of the plate or a native gradient; do not create a third image for the outro |

Timing should ultimately snap to the composition's established phase keys rather than introducing a second timing system.

## Decision gate

- **Native HTML/SVG:** Use for every word, label, arrow, task chip, comparison, numerical claim, citation, GPU lane diagram, and TPU matrix diagram. Keep copy out of raster pixels.
- **Generated imagery:** Use only the two planned assets for emotional texture and the agent-to-accelerator metaphor. Neither image is evidence of real chip architecture.
- **HyperFrames registry:** Before custom-building a complex diagram treatment, invoke `$hyperframes-registry` and check for an existing comparison, flow, or technical-grid block. If a suitable block exists, prefer it and skin it to the composition rather than generating another image.
- **Verified source media:** Use only if the script needs to show a specific real accelerator, benchmark, product UI, or source as evidence. Preserve the source accurately, place attribution/citation in HTML, and do not imitate it with generated pixels.

## Composition and layering

1. Place `accelerator-fabric-portrait-plate` at the back with `crossorigin="anonymous"` and `object-fit: cover`.
2. Place diagrams, arrows, labels, citations, and all narration copy in native HTML/SVG layers above the plate.
3. After background removal, place `agent-orchestrator-cutout` in its own wrapper with `crossorigin="anonymous"` and `object-fit: contain`.
4. Attach clip timing to the image or mounted clip, but animate its wrapper. Do not change the image's intrinsic width or height during motion.
5. Keep the cutout and the plate's focal detail inside the central vertical safe zone. Use the plate's dark upper third and center-left negative space for copy, and verify contrast against the actual pixels.
6. Limit still-image motion to the planned 3-5% push-ins, 30-40px parallax, mask reveal, and one subtle light sweep. HyperFrames supplies motion; the source image should remain a single frozen hero frame.

## Generation and acceptance handoff

If generation is later approved, first dry-run the canonical prompts from the copied video project:

```bash
node scripts/generate-image-assets.mjs videos/<slug> --dry-run
```

Use Codex's built-in image capability through the project media ledger. Do not silently switch to `OPENAI_API_KEY` or paid API generation. The API route is allowed only after explicit user authorization.

For `agent-orchestrator-cutout`, expect the generated source to be opaque. Generate on the specified high-contrast ground, run HyperFrames background removal, and inspect the delivered PNG for real alpha. A checkerboard drawn into opaque pixels is not transparency.

Reject an asset if it contains accidental words or symbols, logos, watermarks, malformed geometry, noisy seams, an unusable 9:16 crop, weak negative space, or a style mismatch. Make at most one targeted prompt correction before falling back.

## Fallbacks

- If the cutout is unavailable or fails acceptance, replace it with a native SVG agent-node constellation using circles, orbiting tool nodes, and routed paths.
- If the portrait plate is unavailable or fails acceptance, use a native layered gradient with SVG circuit traces and subtle grain; optionally use a suitable registry block after `$hyperframes-registry` review.
- If the story requires visual proof of a real GPU or TPU, use verified source media with HTML attribution instead of a generated imitation.
- If all imagery is unavailable, continue with HTML/SVG. Keep this asset plan intact for a later generation pass; image generation is not a completion dependency.

## Composite QA

- Inspect each accepted source for accidental text, brand marks, seams, malformed forms, and family-level style drift.
- Verify real alpha on the cutout after background removal.
- Run a HyperFrames snapshot at each asset's hero frame and inspect the full composite, not only the source PNG. Check mobile readability, focal-point retention, overlay contrast, and whether the image materially improves the frame.
- Run lint and strict transition QA on the eventual generated project:

```bash
npx --no-install hyperframes lint videos/<slug>
npx --no-install hyperframes check videos/<slug> --json --strict --at-transitions
```

- Keep canonical prompts, generation settings, accepted source paths, and hashes in the project's provenance manifest. Do not destructively edit accepted files without updating provenance.
