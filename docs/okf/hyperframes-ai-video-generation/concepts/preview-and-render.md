---
type: Operations Runbook
title: Preview and render gates
description: Preview is the editable human-review stage; render is an explicit, strictly gated delivery action.
resource: /runner/commands.ts
tags: [preview, render, qa, operations, hyperframes, generated-video]
timestamp: 2026-08-27T17:57:38Z
---

# Purpose

Keep fast iteration, visual review, and expensive delivery separate so a stale or broken composition cannot silently become the final MP4.

# Source Of Truth

* [Runner commands](../../../../runner/commands.ts)
* [Studio project actions](../../../../studio/src/App.tsx)
* [Root verification instructions](../../../../AGENTS.md)

# Current Behavior

* `Check` runs HyperFrames validation for a generated project.
* `Preview` starts a local HyperFrames preview server and does not require an MP4.
* `Render` first runs a fresh strict HyperFrames check and blocks when the current project does not pass.
* Render output collisions are rejected instead of being overwritten implicitly.
* The runner uses a valid temporary media filename before renaming it to the final output, avoiding FFmpeg output-format errors caused by extensionless `.part` files. A failed or cancelled render deletes its partial file.
* HyperFrames preview and render write `.waveform-cache/`, `.thumbnails/`, and `.transcode-cache/` inside the project. The QA source digest ignores every hidden directory plus `out/`, `renders/`, `node_modules/`, and `qa/`, so previewing a project does not make its QA report stale.
* Each job runs in its own process group. Cancelling a job or stopping the runner also stops the HyperFrames CLI, esbuild service, and headless Chrome it launched; interrupted jobs are persisted as `cancelled` with the reason.
* Fal slot activation changes the governed HTML and adds unreviewed generated-video provenance. Rebuild the QA report from the activated sources, review fresh visual evidence, and rerun strict validation before render.
* A narration replacement changes audio metadata, timeline references, and caption timings. Verify the provider ledger and local WAVs, rebuild captions, and inspect playback before strict validation.
* A full-scene video layer requires an early and late snapshot with no black/stale extraction warning. A valid first frame does not prove the clip decodes at the scene boundary.

# Operator Loop

```bash
npx --no-install hyperframes check videos/<slug> --json --strict --at-transitions
npx --no-install hyperframes preview videos/<slug> --background
npx --no-install hyperframes preview videos/<slug> --status
npx --no-install hyperframes render videos/<slug> --output videos/<slug>/out/<slug>.mp4
test -s videos/<slug>/out/<slug>.mp4
```

Review the preview before rendering. Verify its root returns HTTP 200 and open it with `127.0.0.1`, never `localhost`, in the Codex browser. When a job fails, expand its Studio activity log and preserve the exact command/error for diagnosis.

# Relationships

See [HyperFrames composition](hyperframes-composition.md), [Narration and voice](narration-and-voice.md), [Fal image-to-video contract](generated-video.md), and [Troubleshooting](troubleshooting.md).
