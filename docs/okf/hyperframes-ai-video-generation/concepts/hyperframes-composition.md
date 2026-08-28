---
type: Composition Contract
title: HyperFrames HTML composition
description: Generated videos are HTML compositions whose DOM, data attributes, media, and seek-safe animation define the rendered result.
resource: /templates/shorts/classic/index.html
tags: [hyperframes, html, animation, timing, templates]
timestamp: 2026-07-12T00:00:00Z
---

# Purpose

Describe the editable source that HyperFrames previews and renders, including the timing seams that scripts and templates must preserve.

# Source Of Truth

* [Classic composition](../../../../templates/shorts/classic/index.html)
* [Template instructions](../../../../templates/AGENTS.md)
* [HyperFrames core skill](../../../../.agents/skills/hyperframes-core/SKILL.md)
* [HyperFrames CLI skill](../../../../.agents/skills/hyperframes-cli/SKILL.md)

# Current Behavior

* A project’s `index.html` is loaded by HyperFrames as the canonical composition.
* Timing is expressed through HyperFrames `data-*` attributes and seek-safe animation/runtime behavior.
* Template contracts expect stable phase selectors such as `#phase1` through `#phase4`, hero/content/CTA identities, and timing keys such as `T1/T2/T3`, `P2/P3/P4`, `slam_t`, and `shake_offsets` where applicable.
* Adaptive compositions may use variable scenes and sub-compositions; snapshots are the visual smoke test for mount and timeline failures that static lint cannot see.

# Verification

The minimum generated-project gate is:

```bash
npx --no-install hyperframes check videos/<slug> --json --strict --at-transitions
```

For motion-heavy or sub-composition projects, add snapshots at representative scene or transition times and inspect the resulting images.

# Relationships

See [Generation contract](generation-contract.md) and [Preview and render gates](preview-and-render.md).
