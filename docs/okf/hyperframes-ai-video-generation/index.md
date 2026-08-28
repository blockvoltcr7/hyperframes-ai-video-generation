# HyperFrames AI Video Generation Knowledge Bundle

This OKF bundle captures the durable, agent-readable knowledge for the Codex-native HyperFrames project. It explains the runtime boundaries, generation contract, visual asset policy, preview/render gates, and the operator workflow.

The source of truth remains the repository code and project-scoped skills. Start with the concept that matches the change, then follow its source links before editing behavior.

# Concepts

* [Codex-native runtime](concepts/codex-native-runtime.md) - How Studio, the launcher, Codex, project skills, and HyperFrames divide responsibility.
* [Generation contract](concepts/generation-contract.md) - Accepted inputs, workflow modes, image policies, and required output artifacts.
* [HyperFrames composition](concepts/hyperframes-composition.md) - The HTML/timing contract and validation expectations for a generated video.
* [Visual asset policy](concepts/visual-assets.md) - When to use native HTML/SVG, registry media, sourced media, or generated imagery.
* [Narration and voice](concepts/narration-and-voice.md) - Provider routing, project-local Fish Audio replacement, caption rebuilding, provenance, and audio QA.
* [Fal image-to-video contract](concepts/generated-video.md) - The explicit cost, resume, local-media, activation, and QA gates for generated motion clips.
* [Preview and render gates](concepts/preview-and-render.md) - The human review loop and the strict checks that protect rendering.
* [Troubleshooting](concepts/troubleshooting.md) - Common failures, evidence to collect, and the correct recovery path.

# Workflow

* [End-to-end generation](workflows/end-to-end-generation.md) - The repeatable operator path from topic to approved MP4.

# Validation

Run the project-local OKF check from the repository root:

```bash
npm run docs:validate:okf
```
