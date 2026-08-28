---
type: Workflow Contract
title: Short generation contract
description: Defines the accepted generation controls and the artifacts a project must produce before it is considered ready.
resource: /scripts/codex-create-short.mjs
tags: [generation, artifacts, workflow, tts, captions, generated-video]
timestamp: 2026-08-27T17:57:38Z
---

# Purpose

Give operators and agents a stable contract for creating a new short without guessing which workflow, template, or image behavior is intended.

# Source Of Truth

* [Launcher argument parsing and prompt construction](../../../../scripts/codex-create-short.mjs)
* [Artifact catalog and readiness status](../../../../runner/catalog.ts)
* [Studio creation form](../../../../studio/src/App.tsx)
* [Project README](../../../../README.md)

# Inputs

The launcher accepts:

```text
--workflow adaptive|template
--template classic|archon|anthropic
--images off|auto|required
--topic "..."
```

The topic may include a duration phrase such as `duration 45s`.

# Current Behavior

* `adaptive` is the recommended topic-to-video mode. It supports variable scenes, storyboard-driven motion, captions, registry/media routing, and snapshot/contact-sheet QA.
* `template` preserves the legacy four-phase short system for repeatable visual presets.
* `auto` allows original imagery only when the story benefits from it; `off` prohibits generated imagery; `required` makes an original asset a completion requirement.
* Generation stops after composition checks and preview preparation. It does not render, commit, or push automatically.

# Required Artifacts

The catalog recognizes these source artifacts:

* `script.txt`
* `audio/narration.wav`
* `transcript.json`
* `index.html`
* `meta.json`
* `DESIGN.md`
* optional visual plans, source ledgers, asset plans, generated-image manifests, contact sheets, and `generated-video-plan.json`

Fal-generated motion is a separate explicit extension. Its ledgers, local MP4s, copies, and generated-video manifest become governed artifacts only when the project declares the plan and invokes that path; they are not required for projects that retain static or native-motion fallbacks.

A project is `ready` only when the composition, script, design, metadata, and aligned narration contract are present.

# Relationships

See [Codex-native runtime](codex-native-runtime.md), [Visual asset policy](visual-assets.md), [Fal image-to-video contract](generated-video.md), and [Preview and render gates](preview-and-render.md).
