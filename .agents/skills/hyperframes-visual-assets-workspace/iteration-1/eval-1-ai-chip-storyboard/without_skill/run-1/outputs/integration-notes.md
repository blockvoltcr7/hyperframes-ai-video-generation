# Integration notes: AI agents, GPUs, and TPUs

## Scope

These notes describe how to integrate the planned assets into a future 45-second, 1080x1920 HyperFrames composition. They do not authorize image generation, paid API use, source-code edits, composition edits, or rendering. All paths in `asset-plan.json` are proposed future paths, not files created by this planning task.

The central visual idea is a vertical hierarchy: the agent coordinates a software loop, the model runtime turns requests into compute work, and GPU or TPU infrastructure accelerates the tensor operations. Preserve that hierarchy in every scene so the visuals never suggest that an agent is physically stored on a chip or directly chooses hardware in every deployment.

## Composition integration

Use the Classic dark system: `#0E1420` canvas, warm-white Inter text, JetBrains Mono only for short technical tags, and one accent family per scene. Keep the top 240px clear for the banner and all critical content inside 72px side and 150px bottom margins. Generated cutouts should occupy no more than roughly 55% of the vertical frame; the narration-matched HTML statement remains the primary reading target.

| Time | Scene | Visual assembly | Native HTML overlay | Required narrative beat |
|---|---|---|---|---|
| 0.0-7.0s | Hook | A01 centered above a native compute tray | `AI AGENT ≠ CHIP` and `It plans. The runtime computes.` | Agent core, task tokens, and correction line reveal separately |
| 7.0-14.0s | Request path | A02 route geometry, four native cards, moving dot | `Agent loop`, `Model runtime`, `Accelerator` | Reveal one node as narration names it; never show the full path at scene entry |
| 14.0-25.0s | GPU | A03 cutout with native lane masks and task tiles | `GPU` and `Many lanes. Parallel math.` | Light lane groups and output tiles on distinct beats |
| 25.0-36.0s | TPU | A04 cutout with native matrix wavefront and task tiles | `TPU` and `Matrix-first dataflow.` | Reveal matrix, wavefront, and result tiles on distinct beats |
| 36.0-42.2s | Compare | A05 rails with reduced A03/A04 cutouts | Editable category labels and runtime caveat | Present both options with equal visual weight |
| 42.2-45.0s | Recap | A06 reuse composite | `Agents ask. Runtimes schedule. Chips accelerate.` | Draw both lower branches, then hold the final hierarchy |

All unrevealed cards, labels, and SVG paths should have explicit hidden states at timeline zero and tween toward visible states. Do not depend on a delayed `from()` state for seekable choreography. Keep every foreground information gap at five seconds or less; ambient drift, glow, and parallax do not count as new information.

## Text, labels, facts, and citations

Every word must remain live HTML, including `GPU`, `TPU`, node labels, comparison language, captions, citations, credits, brand text, and CTA copy. Do not accept generated imagery containing pseudo-text, tiny die labels, vendor marks, benchmark numbers, or chart-like legends. Mask or reject an image with those artifacts rather than painting text over it.

Use at least 56px for phase headlines, 48px for primary labels, 32px for descriptors, and 32px for context/citation strips on the 1080px canvas. Keep comparison copy short enough to preserve those minimums. Use accessible semantic HTML for the labels even when SVG provides the connector geometry.

Generated GPU and TPU cutouts are conceptual metaphors, not factual die diagrams. Any technical statement or comparison introduced during scripting must be checked against current primary documentation. Put source credits or citations in an HTML context strip; never bake them into an image or SVG path. Avoid performance rankings unless the script supplies a current, workload-specific, citable benchmark.

## Layering and motion

Use this back-to-front order for the generated-image scenes:

1. Deep navy canvas and localized radial glow.
2. Rear SVG connector or lane glow.
3. Static WebP cutout.
4. Native SVG wavefront, route dot, or highlight mask.
5. Native HTML task tiles, labels, and factual copy.
6. Marker underline or scene-transition veil.

Animate the static cutouts only with HTML/GSAP transforms. Keep scale below 1.06 after entry, avoid rotation, and use vertical rises as the dominant move. The GPU and TPU scenes should use matching camera size and entry timing so the comparison feels fair. Their internal native overlays should differ: grouped parallel lane illumination for GPU, one ordered grid wavefront for TPU.

For alpha assets, inspect edges against both `#0E1420` and a temporary light checkerboard before integration. If a generator cannot produce clean transparency, request a solid `#0E1420` matte and use it only on the unchanged Classic canvas; do not attempt fragile automatic background removal inside the composition.

## Fallback ladder

No fallback may silently invoke OpenAI image generation, another paid API, or a billable hosted workflow. If approved image generation is unavailable, skip it and continue with the following order:

1. **Native HTML/SVG fallback:** Rebuild A01 as concentric rings and route arcs, A03 as repeated rounded lane cells, and A04 as an orthogonal grid. Preserve the IDs, dimensions, scene purpose, and animation beats from the JSON plan. This is the default zero-cost fallback.
2. **Verified HyperFrames registry fallback:** For S2 only, consider the registry `flowchart` block if the current live registry still provides it and its install/wiring contract is verified before use. Strip demo copy and keep all final labels in host HTML. Avoid WebGL blocks for this 45-second explainer because their warmup and duration cost do not serve the teaching goal.
3. **Verified-source fallback:** If a literal chip photograph or factual diagram becomes necessary, use a current official vendor press/media or documentation asset with an explicit reusable license or permission. Record source URL, asset title, owner, license/permission, retrieval date, and required credit. Keep the credit in HTML. Do not scrape search thumbnails or remove logos from third-party images.
4. **Omit the optional cutout:** The explanation must still work with native geometry and text alone. Do not delay or change the factual story merely to force a raster asset into the edit.

Registry and verified-source fallbacks require human review before integration. A fallback is not permission to edit the composition or generate media during this planning task.

## Future QA gate

Run QA only after a future composition has been intentionally created. First lint, then capture composite snapshots that include both imagery and live HTML overlays, then run the strict transition-aware check:

```bash
npx --no-install hyperframes lint videos/<slug>
npx --no-install hyperframes snapshot videos/<slug> --at 1.0,4.8,7.2,11.3,14.4,19.5,24.6,25.4,30.2,35.4,36.4,40.4,42.7,44.6
npx --no-install hyperframes check videos/<slug> --json --strict --at-transitions
```

Review the snapshots as full composites, not isolated assets. Confirm:

- All text is live HTML, readable at phone scale, inside safe zones, and free of generated pseudo-text behind it.
- The agent-to-runtime-to-accelerator hierarchy reads correctly at 4.8s, 11.3s, 40.4s, and 44.6s.
- GPU and TPU visuals are equally sized and clearly distinct without implying literal floorplan accuracy or universal performance claims.
- Every list/path item is hidden before its reveal, each information gap is at most five seconds, and transition frames do not expose the next scene early.
- Transparent edges, glows, task tiles, and HTML labels composite cleanly with no halo, clipping, overlap, or low-contrast copy.
- The exact 45.0s end state is deterministic, with no placeholder wordmark, placeholder URL, logo, unsupported chart, or uncredited source.

Do not render as part of QA unless rendering is separately and explicitly requested.
