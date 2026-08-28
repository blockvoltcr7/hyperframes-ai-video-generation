---
type: Asset Policy
title: Visual asset selection and provenance
description: The project chooses the least fragile visual representation that satisfies the story and records provenance when original imagery or motion is used.
resource: /.agents/skills/hyperframes-visual-assets/SKILL.md
tags: [assets, image-generation, image-to-video, provenance, media, design]
timestamp: 2026-08-27T17:57:38Z
---

# Purpose

Prevent image generation from becoming a default substitute for editable typography, diagrams, factual charts, or interface elements.

# Source Of Truth

* [Visual asset skill](../../../../.agents/skills/hyperframes-visual-assets/SKILL.md)
* [Codex image adapter](../../../../scripts/codex-image-generate.mjs)
* [Asset-plan validator and importer](../../../../scripts/generate-image-assets.mjs)
* [Image asset tests](../../../../scripts/generate-image-assets.test.mjs)
* [Fal image-to-video generator](../../../../scripts/generate-fal-video.mjs)

# Decision Order

Use the first option that satisfies the scene:

1. Native HTML/CSS/SVG for text, diagrams, charts, labels, and UI.
2. Existing HyperFrames registry blocks or verified project/shared media.
3. Sourced media with a documented source and usage decision.
4. Original generated imagery for illustrations, metaphors, textures, backgrounds, plates, or cutouts.

# Current Behavior

* Codex is the default image-generation provider for this project.
* OpenAI API generation is explicit and requires the `--api` path; it is not an automatic fallback.
* Generated assets must remain under `videos/<slug>/assets/generated/` when imported through the asset planner.
* `asset-plan.json` records role, prompt, size, background, quality, and output path.
* `assets/generated/manifest.json` records provider/model and prompt/content hashes.
* Generated imagery must not contain important words, logos, watermarks, citations, or factual charts baked into pixels.

# Generated Motion Extension

Image-to-video is optional and never an automatic fallback. Start from a reviewed local still, keep exact claims and labels in native HTML, validate live per-shot cost in dry-run mode, and require explicit approval before `--api`. Until a verified local MP4 is activated, the composition must remain on its inert poster fallback.

# Example Commands

```bash
npm run assets:generate -- videos/<slug> --dry-run
npm run assets:codex -- --prompt "..." --output /tmp/original-asset.png
npm run assets:generate -- videos/<slug> --asset <asset-id> --source /tmp/original-asset.png
```

# Relationships

See [Generation contract](generation-contract.md), [Fal image-to-video contract](generated-video.md), and [Codex-native runtime](codex-native-runtime.md).
