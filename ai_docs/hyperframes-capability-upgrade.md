# HyperFrames capability upgrade

## Decision

Use HyperFrames' current project-scoped workflow and domain skills as the production base, while preserving the existing four-phase templates as a compatibility mode. New Studio generations default to the adaptive faceless-explainer path because it uses variable scene counts, storyboard-driven teaching, captions, reusable motion blueprints, frame workers, and contact-sheet QA.

Generated imagery is a selective visual treatment, not a default filler. It is appropriate for illustrations, metaphors, textures, atmospheric plates, and subject cutouts. Exact text, logos, UI, citations, diagrams, and factual charts remain native HTML/SVG or verified source media.

## What the audit found

Before this upgrade, the project used only a narrow portion of HyperFrames 0.7.54. The repository now pins HyperFrames 0.8.14 and its matching official skill set:

- project-scoped HyperFrames skills were outdated and core domain skills were missing;
- the generator forced every topic into the same hero/stats/cards/CTA structure;
- word timestamps drove phase boundaries but not captions;
- registry blocks, snapshots, keyframe onion shots, compare sheets, background removal, capture, and workflow routing were not integrated;
- Studio readiness ignored narration/alignment quality;
- Render did not revalidate current composition bytes;
- the official Codex image adapter expected the removed `imagegenext` flag despite current Codex exposing stable `image_generation`.

## Implemented coverage

| Capability | Current integration |
|---|---|
| Current official skills | 20 HyperFrames skills are project-scoped, content-hashed, and verified current for 0.8.14, including the new audio domain. |
| Adaptive topic explainers | Studio/launcher can invoke `faceless-explainer` for variable scenes, captions, motion blueprints, frame workers, transitions, and snapshots. |
| Legacy presets | `diy-yt-creator` remains available as `workflow=template`. |
| Registry reuse | Current `hyperframes-registry` is installed; adaptive/custom planning checks catalog items before hand-building reusable effects. |
| Original imagery | `hyperframes-visual-assets`, `codex-image-generate.mjs`, and `generate-image-assets.mjs` provide policy, generation, acceptance, and hash/provenance contracts. |
| Image policy | Studio exposes `off`, `auto`, and `required`. API billing is never selected automatically. |
| GPT Image 2 cutouts | Opaque generation is followed by `hyperframes remove-background`; alpha must be verified in the composite. |
| Visual QA | Adaptive flow uses snapshots/contact sheets; custom flow requires snapshots and focused keyframe shots for complex motion. |
| Skill/capability preflight | Studio verifies the installed release, current project skills, and stable Codex image generation. Generation runs against an immutable skill tree. |
| Resumable execution | `workflow-run.json` records typed nodes, status, input/output hashes, attempts, approvals, provider/model, and known cost. |
| Truthful catalog state | Workflow-specific artifact contracts and source-fresh `qa/report.json` evidence determine readiness; legacy projects retain a conservative fallback. |
| Audio and generated video | Provider-neutral schemas cover audio ingestion policy and reference-conditioned video shots with explicit fallbacks. |
| Localization and delivery | Locale bundles require overflow review; delivery profiles define canvas, safe zones, FPS, and caption mode. |
| Provenance | Generated and sourced assets record hashes, prompts/source revisions, review state, catalog provenance, and C2PA-ready signing state. |
| Preview lifecycle | Studio uses HyperFrames 0.8 managed background previews and exposes an explicit stop operation. |
| Durable jobs | The local runner persists its job ledger atomically and marks interrupted jobs truthfully after restart. |
| Render safety | Fresh reviewed QA, human approval, and strict HyperFrames validation rerun immediately before an atomic non-overwriting render. |
| Privacy default | Launcher-driven media workflows set `HYPERFRAMES_NO_TELEMETRY=1` unless the user explicitly overrides it. |

## Major HyperFrames features now available

The project skill router can now reach faceless explainers, product launches (including website walkthroughs), PR videos, embedded captions, talking-head graphics, motion graphics, music-driven video, slideshows, Figma import, Remotion migration, general video, audio buses/FX/automation, registry/media resolution, composition variables, keyframe diagnostics, and distributed-render guidance. The removed `website-to-video` workflow is no longer installed; website work routes through `product-launch-video`.

The installed CLI additionally exposes `capture`, `catalog`, `add`, `snapshot`, `keyframes`, `compare`, `grade-compare`, `beats`, `remove-background`, `present`, `publish`, Lambda, Cloud Run, and batch/variable rendering. These commands are available to the relevant skills; they are not all promoted into Studio buttons because publishing/cloud deployment can incur cost or external state changes.

## Evidence

- `hyperframes skills check --dir .agents/skills --json`: 20 current, 0 outdated, 0 core missing.
- `hyperframes upgrade --check --json`: 0.8.14 installed and current at implementation time.
- `npm audit`: zero known dependency vulnerabilities after upgrading Vitest and Vite.
- Catalog scan: the valid Google short is ready; the legacy empty-transcript project is incomplete.
- Real image smoke: Codex created a new 1.49 MB portrait PNG through `codex-image-generate.mjs`; it contained no text/logo and preserved useful negative space.
- Skill evaluation: both skilled and baseline outputs passed the initial production-contract assertions. This confirms the assertions cover important safety behavior but also shows they are not yet discriminating enough to quantify incremental skill value.

## Implemented contract extensions

The contract module adds source-digest invalidation, workflow-specific artifact requirements, provider-neutral generated-video plans, locale bundles, delivery profiles, catalog provenance, and C2PA-ready metadata. `scripts/validate-video-project.ts` is the shared generation postcondition and render prerequisite. The final Goal Mode presentation/video is the first complete acceptance fixture for these contracts.

WebGPU/WebCodecs remain preview-time progressive enhancements: capability detection may select them for responsive authoring, but deterministic HyperFrames/Chromium rendering remains the source of final output truth.

## Operating boundary

Keep local preview/check as the default endpoint. Rendering, publishing, cloud deployment, paid API generation, and background removal remain explicit actions. Generated images are accepted only after visual inspection and then referenced through the project manifest; regeneration never silently overwrites an approved asset.
