---
name: diy-yt-creator
description: Use when the user wants to create a new YouTube video using one of the templates in this repo's templates/ folder. Spawns the project folder, drafts the script from a topic, generates TTS, fills the composition with real content sync'd to word-level timestamps, lints + inspects, and opens preview. Never auto-renders.
---

# diy-yt-creator

Zero-manual-step workflows for spawning fully-prepped HyperFrames videos from the templates in `templates/`.

## When to invoke

Trigger when the user says any of:

- "create / make / spawn a new short / video"
- "new short about X" / "new generic short about X" / "new standard short about X"
- "/diy-yt-creator:new-standard-short …"
- "new anthropic short about X"
- "/diy-yt-creator:new-anthropic-short …"
- "new archon short about X"
- "/diy-yt-creator:new-archon-short …"
- "new google short about X" / "google brand short" / "gemini short" / "workspace short" / "android short" / "google ai short"
- "/diy-yt-creator:new-google-short …"
- "new game-map short about X" / "game map short" / "tour short" / "hub and spoke short" / "six things short" / "X things short with camera transitions"
- "/diy-yt-creator:new-game-map-short …"
- "new long-form video about X" / "new long-form standard about X"
- "/diy-yt-creator:new-long-form-standard …"
- "new claude code version update video" / "claude code release video"
- "/diy-yt-creator:claude-code-version v2.1.NN" — orchestration command for Claude Code releases
- "new claude code version short" / "claude code release short" / "short cut of claude code v2.1.NN"
- Anything that asks to scaffold a video from a template in this repo
- "capture / screenshot <url> for video <slug>" → uses `capture-asset`
- "QA / check / verify the preview for <slug>" → uses `qa-composition`
- "use my voice" / "migrate to my voice" / "switch to cloned voice" / "regenerate narration with my voice" → uses `use-cloned-voice`

## Available commands

### Composition-build commands (template-specific HTML edit)

| Command | Template used | Use when |
|---|---|---|
| [new-standard-short.md](./new-standard-short.md) | `templates/shorts/standard/` | User wants a vertical YouTube Short (1080x1920, 30fps, ~24-180s) in the **brand-neutral standard** aesthetic. Default pick for any topic that isn't anchored to a specific brand. Numbered step cards (01/02/03) instead of dated timeline cards. |
| [new-anthropic-short.md](./new-anthropic-short.md) | `templates/shorts/anthropic/` | User wants a vertical YouTube Short (1080x1920, 30fps, ~24-60s) in the Anthropic dark-stage aesthetic |
| [new-archon-short.md](./new-archon-short.md) | `templates/shorts/archon/` | User wants a vertical YouTube Short (1080x1920, 30fps, ~24-60s) in the Archon dark-blue / cyan-magenta aesthetic |
| [new-google-short.md](./new-google-short.md) | `templates/shorts/google/` | User wants a vertical YouTube Short (1080x1920, 30fps, 70-130s) in the **Google brand cinematic-stage** aesthetic (canonical four-color rotation, Google logo, 5-dot SETUP→PUBLISH progress rail). Three theme variants (`cinematic` / `spotlight` / `editorial`) and four accent options (blue / red / yellow / green) match the source design's tweaks-panel knobs. **Dynamous promotion ON by default** — badge + module interstitial + 10% OFF bubble all enabled in `video.config.js`. |
| [new-game-map-short.md](./new-game-map-short.md) | `templates/shorts/game-map/` | User wants a vertical YouTube Short (1080x1920, 30fps, 30-60s) using the **camera-driven hub-and-spoke** structural pattern — a single GSAP camera pans + zooms across one giant world canvas with 7 sections (1 hub + 6 hex spokes) instead of phase-mutex crossfades. Reuses Anthropic-dark palette + typography. Best fit: "X things you missed", feature roundups, tour videos, list-format content where the journey metaphor carries the script. Final pull-back to map view with all nodes lit becomes the thumbnail-grade completion screen. |
| [new-long-form-standard.md](./new-long-form-standard.md) | `templates/long-form/standard/` | User wants a horizontal YouTube long-form (1920x1080, 30fps, 4-15 min) in the dark-navy + 4-accent baseline aesthetic |
| [new-claude-code-version-longform.md](./new-claude-code-version-longform.md) | `templates/long-form/claude-code-version/` | User wants a horizontal Claude Code release-update video (1920x1080, 30fps, 3-5 min) with VersionBranding overlay + terminal scene + stats opener. For full automation from a release tag, prefer the [/diy-yt-creator:claude-code-version](../../commands/diy-yt-creator/claude-code-version.md) slash command. |
| [new-claude-code-version-short.md](./new-claude-code-version-short.md) | `templates/shorts/claude-code-version/` | User wants a vertical Claude Code release-update Short (1080x1920, 30fps, ≤3 min — target 70-130s) with VersionBranding overlay + version slam + 3-pill stats opener + numbered highlight cards + `$ claude update` terminal CTA. **Reuses an existing long-form video's content brief if one already exists for the same release** (avoids duplicate WebFetch and keeps stats / highlights consistent across cuts). |
| [capture-asset.md](./capture-asset.md) | n/a (uses `agent-browser`) | Per-video screenshot/asset from a public URL into `videos/<slug>/assets/` |
| [qa-composition.md](./qa-composition.md) | n/a (uses `agent-browser`) | Visually QA a running `hyperframes preview` — snapshot each phase, report issues |
| [use-cloned-voice.md](./use-cloned-voice.md) | n/a (uses `scripts/elevenlabs-tts.py`) | Migrate an existing video (or new video) from a stock voice to the user's ElevenLabs cloned voice: update `.env`, regenerate narration, rebuild `transcript.json`, re-wire all scene `data-start` values + SFX timing, re-render |

> **Adding a new template?** Follow the "Building New Templates" workflow in the project's [CLAUDE.md](../../../CLAUDE.md). Each new template MUST ship a matching playbook in this directory and a row in the table above.

### Pipeline commands (research + scriptwriting + retention)

These are first-class slash commands under `.claude/commands/diy-yt-creator/`. They produce the research, script, and retention artifacts that feed the composition-build step.

| Command | Use when |
|---|---|
| [/diy-yt-creator:full-auto](../../commands/diy-yt-creator/full-auto.md) | End-to-end pipeline from topic to retention-engineered script + per-scene retention strategy. Stops twice for human review (TTS, composition build). Use this by default. |
| [/diy-yt-creator:phase0-research](../../commands/diy-yt-creator/phase0-research.md) | Topic research only (vidiq + web search + 4 parallel agents → `videos/<slug>/research/content-brief.md`) |
| [/diy-yt-creator:phase1-plan](../../commands/diy-yt-creator/phase1-plan.md) | Composition plan (after Phase 0) — scenes, hook variants, retention component picks, `data-start`/`data-duration` budget |
| [/diy-yt-creator:phase2-script](../../commands/diy-yt-creator/phase2-script.md) | Draft narration script (after Phase 1) |
| [/diy-yt-creator:phase2-5-critique](../../commands/diy-yt-creator/phase2-5-critique.md) | Quality gate on script (after Phase 2) — hook score, story arc, banned phrases |
| [/diy-yt-creator:phase2a-tts-script](../../commands/diy-yt-creator/phase2a-tts-script.md) | TTS-optimize script + write flat `script.txt` (after Phase 2.5) |
| [/diy-yt-creator:phase2b-factcheck](../../commands/diy-yt-creator/phase2b-factcheck.md) | Fact-check claims via WebSearch (after Phase 2a) |
| [/diy-yt-creator:phase3-5-retention](../../commands/diy-yt-creator/phase3-5-retention.md) | Per-scene retention strategy from `transcript.json` (after `npx hyperframes transcribe` runs) |
| [/diy-yt-creator:brief-template](../../commands/diy-yt-creator/brief-template.md) | Reference for the structured-brief input format |

## Pipeline vs direct invocation

- **Use `/diy-yt-creator:full-auto`** when the user gives you a topic and wants a researched, fact-checked, retention-engineered video. This is the default.
- **Use `/diy-yt-creator:new-standard-short`, `new-anthropic-short`, or `new-archon-short` directly** when the user already has a finished `script.txt` (or content brief) and just wants the composition built. Skips all research/critique/fact-check steps. Pick the playbook by aesthetic: **standard** brand-neutral dark-navy (default for any topic) vs **anthropic** dark-orange stage (Anthropic / Claude content) vs **archon** dark-blue / cyan-magenta (Archon workflow content).
- **Use individual phase commands** when debugging or re-running a single phase after fixes.

Both composition-build skills (`new-anthropic-short.md`, `new-archon-short.md`) read `videos/<slug>/scripts/full-script.md` and `videos/<slug>/plan.md` if they exist (Branch A in step 4) — so the pipeline output flows naturally into the build, regardless of template choice.

## Hard rules across every command

1. **Never auto-render.** Every workflow ends at `npx hyperframes preview videos/<slug>`. The user always triggers `npx hyperframes render` manually.
2. **Never fabricate facts.** Stats, dates, URLs, quotes must come from a source the user provides or that exists on the open web. If the topic has no source, ASK before drafting.
3. **Never modify the template itself.** Only edit the copy under `videos/<slug>/`.
4. **Never bundle multiple videos in one run.** One slug = one invocation.
5. **Always lint + inspect before reporting done.** Both must pass cleanly.
6. **Always invoke the `/hyperframes` skill** before editing any composition HTML — it has framework-specific rules (timeline registration, phase mutex, `data-*` semantics) that this skill assumes.

Open the relevant command file for the full playbook.
