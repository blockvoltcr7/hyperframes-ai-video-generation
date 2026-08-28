# Agent instructions (scope: this directory and subdirectories)

## Scope and layout
- **This AGENTS.md applies to:** `public/` and all files under it.
- **Owner:** Bundled static media assets (voiceover, SFX, music).
- **Key directories:** `public/voiceover/`, `public/sfx/`, `public/music/`.

## Commands (use what this repo uses)
- **Inspect available assets:** `rg --files public/voiceover public/sfx public/music`
- **Validate media references:** generate and preview a short, then confirm playbook uses expected paths.

## Feature map

| Feature | Owner | Key paths | Entrypoints | Tests | Docs |
|---|---|---|---|---|---|
| Voiceover packs | `public` | `public/voiceover/` | Codex playbook sync/import steps | render smoke checks | template README files |
| SFX sets | `public` | `public/sfx/` | composition audio references | `npx hyperframes lint videos/<slug>` | `shared/audio/MANIFEST.md` |
| Music stems | `public` | `public/music/` | generated output audio composition layer | render output review | `README.md` sections on media |

## Conventions
- Treat audio/media files as immutable binaries unless regenerating/updating source content.
- Keep naming consistent with existing scene folders (e.g., `HowVectorDatabasesWork`, `Archon`, `Ti84Evo`).
- Avoid inline renames of audio assets referenced by existing generated shorts unless updating all consumers.

## Common pitfalls
- Mixing scene folders and filenames with stale playbook references can produce silent missing-audio behavior.
- Large binaries should stay out of churn; prefer replacing via explicit asset replacement workflows.
- Confirm waveform/format compatibility when moving between TTS engines.

## Do not
- Do not remove or empty directories referenced in generated videos without checking generated mappings.
- Do not regenerate MP3/voiceover files under `public/` during routine template editing.
