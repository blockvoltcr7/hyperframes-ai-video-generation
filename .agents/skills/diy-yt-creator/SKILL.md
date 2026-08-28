---
name: diy-yt-creator
description: Use when the user wants to create a new YouTube Short using one of the templates in this repo's templates/ folder. Spawns the project folder, drafts the script from a topic, generates TTS, fills the composition with real content sync'd to word-level timestamps, lints, runs the strict HyperFrames check, and opens preview. Never auto-renders.
---

# diy-yt-creator

Zero-manual-step workflows for spawning fully-prepped HyperFrames Shorts from the templates in `templates/`.

## When to invoke

Trigger when the user says any of:

- "create / make / spawn a new short / video"
- "new classic short about X" or an explicit `$diy-yt-creator` request for the classic playbook
- "new archon short about X" or an explicit `$diy-yt-creator` request for the Archon visual preset
- "new anthropic short about X" or an explicit `$diy-yt-creator` request for the Anthropic visual preset
- Anything that asks to scaffold a vertical YouTube Short from a template in this repo

If the user does not specify a template, **default to the classic template** — it is brand-neutral and works for any topic.

If the user asks for a different aesthetic that doesn't have a matching template here, follow the "Adding a new template" workflow in the project's [AGENTS.md](../../../AGENTS.md) — copy one of the existing templates, swap the palette + brand strings + CTA URL, write a sibling playbook, and add a row to the table below.

## Available playbooks

| Playbook | Template used | Use when |
|---|---|---|
| [new-classic-short.md](./new-classic-short.md) | `templates/shorts/classic/` | **DEFAULT.** Vertical YouTube Short (1080x1920, 30fps, ~24-60s) in the **Classic dev-tool dark** aesthetic (bright blue + sky blue + soft indigo + teal, deep navy canvas). Use for any topic not covered by the brand-specific templates below. |
| [new-archon-short.md](./new-archon-short.md) | `templates/shorts/archon/` | Vertical YouTube Short (1080x1920, 30fps, ~24-60s) in the **Archon dark-blue / cyan-magenta** aesthetic. Use specifically for Archon workflow content. |
| [new-anthropic-short.md](./new-anthropic-short.md) | `templates/shorts/anthropic/` | Vertical YouTube Short (1080x1920, 30fps, ~24-60s) in the **Anthropic dark-stage** aesthetic (warm orange + cream + purple, near-black canvas). Use specifically for Anthropic / Codex content. |

All three playbooks share the same 11-step shape — copy template, draft script, generate TTS, compute timings, edit HTML, lint, strict check, preview. The deltas between them are palette, brand strings, default CTA URL, and template-specific pronunciation rules.

## Hard rules across every playbook

1. **Never auto-render.** Every workflow ends at `npx hyperframes preview videos/<slug>`. The user always triggers `npx hyperframes render` manually.
2. **Never fabricate facts.** Stats, dates, URLs, quotes must come from a source the user provides or that exists on the open web. If the topic has no source, ASK before drafting.
3. **Never modify the template itself.** Only edit the copy under `videos/<slug>/`.
4. **Never bundle multiple videos in one run.** One slug = one invocation.
5. **Always lint + strict check before reporting done.** Use `npx --no-install hyperframes check videos/<slug> --json --strict --at-transitions`; it must report `ok: true`.
6. **Always invoke the `$hyperframes` skill** before editing any composition HTML — it has framework-specific rules (timeline registration, phase mutex, `data-*` semantics) that this skill assumes.
7. **Always create `videos/<slug>/visual-plan.json` after the script is grounded and before editing HTML.** For each phase, record its narrative job, hero frame, information-bearing visual beats, selected treatment (`native`, `registry`, `source-media`, or `generated-image`), and why. Invoke `$hyperframes-registry` to check the live catalog before hand-building a reusable effect.
8. **Invoke `$hyperframes-visual-assets` when any phase would benefit from an illustration, cutout, texture, atmospheric plate, or visual metaphor.** Image generation is selective, not mandatory. Follow the launcher's image policy; never switch from Codex image generation to API billing automatically. In `auto` mode, use a registry/native fallback without blocking the video.
9. **Generate visual QA evidence before preview.** Capture hero frames with `hyperframes snapshot`, run the animation map for new/significant choreography, and use `hyperframes keyframes --shot` for complex motion or generated-image parallax. The strict check remains the final machine gate.

Open the relevant playbook file for the full step-by-step.
