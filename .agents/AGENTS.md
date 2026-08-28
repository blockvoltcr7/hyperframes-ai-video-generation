# Agent instructions (scope: `.agents/`)

## Ownership

- `.agents/skills/` is the only project-scoped agent skill source.
- `.agents/rules/` contains shared video, typography, TTS, pacing, and composition constraints referenced by skills.

## Conventions

- Read each selected `SKILL.md` completely, then only the playbook and references required for the task.
- Use Codex skill syntax such as `$diy-yt-creator` and `$hyperframes` in instructions.
- Route narration creation and replacement through `$text-to-speech`; load `$fish-audio-api` before Fish Audio voice discovery, synthesis, or cloning work. Provider skills govern API semantics while project skills govern HyperFrames integration and QA.
- Keep executable behavior in repository scripts; skills describe routing, judgment, required commands, and completion gates.
- Keep paths repository-relative and Codex-native. Do not reference provider-specific instruction directories or external workflow harnesses.
- When playbook commands, timing contracts, or output requirements change, update every affected template variant and the Studio launcher contract.
- When a media workflow changes, update the owning script/project instructions and the matching OKF concept in the same patch. Do not hide durable operational policy only inside a generated project's notes.

## Verification

- Confirm every skill has valid YAML frontmatter with `name` and `description`.
- Search for stale provider/runtime references after skill edits.
- Run repository tests and typechecking when a skill change affects launcher behavior or output contracts.
