---
type: System Architecture
title: Codex-native HyperFrames runtime
description: Studio launches a deterministic local runner, which invokes Codex with project-scoped skills to create previewable HyperFrames compositions.
resource: /scripts/codex-create-short.mjs
tags: [codex, studio, hyperframes, runtime, architecture]
timestamp: 2026-07-12T00:00:00Z
---

# Purpose

Explain which layer owns each decision so future agents do not reintroduce an old orchestration dependency or bypass the project’s safety gates.

# Source Of Truth

* [Root agent instructions](../../../../AGENTS.md)
* [Codex launcher](../../../../scripts/codex-create-short.mjs)
* [Studio runner](../../../../runner/commands.ts)
* [Studio UI](../../../../studio/src/App.tsx)
* [Project skills](../../../../.agents/skills/)

# Current Behavior

* Studio runs on Vite at `http://localhost:5173` and proxies job requests to the local runner on `127.0.0.1:4317`.
* The runner allowlists workflow, template, and image-policy values, protects repository boundaries, serializes mutations, and launches commands without a shell.
* The launcher runs `codex exec` in the repository. Codex reads `AGENTS.md`, `.agents/rules/`, and `.agents/skills/`.
* Adaptive generation routes topic explainers through `$faceless-explainer`; template generation routes repeatable four-phase output through `$diy-yt-creator`.
* Archon and Claude are not runtime dependencies. Their remaining names are visual presets or historical migration context only.

# Boundaries

* Codex decides research, narration, storyboard, media selection, and composition edits.
* HyperFrames owns the HTML composition runtime, timing contract, validation, preview, and render.
* Studio owns local job control, project cataloging, preflight, and explicit user actions.
* Generated content belongs under `videos/<slug>/`; source templates and skills should be changed instead of hand-editing an output as a reusable fix.

# Relationships

See [Generation contract](generation-contract.md), [Preview and render gates](preview-and-render.md), and [End-to-end generation](../workflows/end-to-end-generation.md).
