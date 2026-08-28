---
type: Troubleshooting Guide
title: HyperFrames troubleshooting
description: Maps common Studio and HyperFrames failures to the layer that owns the fix.
resource: /runner/commands.ts
tags: [troubleshooting, preview, render, artifacts, diagnostics, fal]
timestamp: 2026-08-27T17:57:38Z
---

# Purpose

Give operators an evidence-first recovery path instead of deleting generated projects or changing unrelated layers.

# Symptom Map

| Symptom | Likely meaning | First action |
| --- | --- | --- |
| Project is `incomplete` | Required composition, metadata, design, script, transcript, or narration artifact is absent or too small | Inspect the artifact panel, then inspect the missing file directly |
| Transcript is `[]` | Narration alignment was not produced; readiness cannot be trusted | Regenerate the short or rerun the correct TTS/timing step |
| Check fails | The current HTML/runtime has a lint, runtime, layout, motion, or contrast issue | Run strict check from the terminal and read the selector/time evidence |
| Preview job is `running` | The preview server is still starting; no MP4 is required | Wait for `Open preview` or run the terminal preview command |
| Preview job exits with code 1 | The preview process failed before serving | Expand the log, reproduce with `hyperframes preview`, and validate the same project |
| Render is blocked | The fresh strict pre-render gate failed | Fix the current composition, rerun check, then render |
| Image generation is unavailable | Codex image generation is not stable/enabled in the local environment | Use `images=off`, native/registry visuals, or resolve the Codex feature issue |
| Fal ledger is `submitting` without a request ID | The provider may have accepted a paid request before the ID was persisted | Do not resubmit; reconcile the shot in Fal request history first |
| Fal output exists but the slot remains a poster | Another selected shot, output, manifest entry, copy, or allowlisted slot failed before batch activation | Preserve the ledger and local output, fix the failed preflight/verification condition, then rerun the same selection to resume safely |
| FFmpeg rejects a `.part` path | A temporary output path lacks a recognizable media extension | Use the current runner, which writes a valid temporary media filename |

# Boundaries

Do not delete a project merely because it is incomplete. First determine whether the source composition is recoverable and whether the failure is an artifact contract issue, a HyperFrames issue, or a runner issue.

# Relationships

See [Preview and render gates](preview-and-render.md), [Generation contract](generation-contract.md), [Fal image-to-video contract](generated-video.md), and [Codex-native runtime](codex-native-runtime.md).
