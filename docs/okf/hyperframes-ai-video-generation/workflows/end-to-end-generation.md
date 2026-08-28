---
type: Operator Workflow
title: End-to-end short generation
description: Repeatable path from a topic brief to a reviewed and explicitly rendered HyperFrames short.
resource: /README.md
tags: [workflow, operator, codex, studio, preview, render, generated-video]
timestamp: 2026-08-27T17:57:38Z
---

# Purpose

Teach an operator or agent how to use this repository without confusing Codex generation, HyperFrames validation, Studio preview, and MP4 rendering.

# Workflow

1. Start the local services with `npm run dev`.
2. Run Studio preflight and fix missing Node, Python, FFmpeg, Codex, TTS, or image-generation prerequisites.
3. In Studio, choose `Create a short`, enter a topic, select `Adaptive explainer`, and usually choose `Images: Auto`.
4. Or run the equivalent command:

   ```bash
   npm run create:short -- --workflow adaptive --images auto --template classic --topic "Explain how AI agents use tools, duration 45s"
   ```

5. Let Codex create the project under `videos/<slug>/`. Generation ends at preview preparation.
6. Confirm the narration provider and inspect audio/caption alignment. If replacing the generated voice, run the project-local provider generator, commit its metadata/timeline changes, rebuild captions from the new native word timings, and verify WAV hashes before continuing.
7. If the project intentionally includes a `generated-video-plan.json`, validate selected shots and live pricing without submitting a paid request:

   ```bash
   npm run video:fal -- videos/<slug> --all --dry-run
   ```

8. Review the plan and batch estimate. Only after explicit approval, run the paid `--api` command. Successful completion verifies local media and activates only the allowlisted composition slots; it does not render the project.
9. If a reviewed canonical provider clip is shorter than its scene, create and document a deterministic local composition derivative rather than resubmitting or using runtime playback-rate. Check an early and late decoded frame before full QA.
10. Rebuild the source-fresh QA report after any audio/caption or slot activation change, then run strict validation:

   ```bash
   npx --no-install hyperframes check videos/<slug> --json --strict --at-transitions
   ```

11. Start or reuse a managed background preview, verify HTTP 200, and open its `127.0.0.1` URL. Inspect pacing, narration, captions, visual hierarchy, image cropping, every generated motion clip, and the ending frame.
12. Fix source artifacts or skills, then repeat QA, check, and preview.
13. After approval, render explicitly:

   ```bash
   npx --no-install hyperframes render videos/<slug> --output videos/<slug>/out/<slug>.mp4
   test -s videos/<slug>/out/<slug>.mp4
   ```

# Source Of Truth

* [Project README](../../../../README.md)
* [Codex-native runtime](../concepts/codex-native-runtime.md)
* [Generation contract](../concepts/generation-contract.md)
* [Narration and voice](../concepts/narration-and-voice.md)
* [Fal image-to-video contract](../concepts/generated-video.md)
* [Preview and render gates](../concepts/preview-and-render.md)

# Boundaries

Never auto-render, commit, push, overwrite an existing generated project, or place secrets in OKF documentation. Treat generated `videos/` content as disposable unless the task explicitly targets it.
