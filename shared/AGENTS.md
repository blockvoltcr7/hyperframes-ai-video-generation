# Agent instructions (scope: this directory and subdirectories)

## Scope and layout
- **This AGENTS.md applies to:** `shared/` and all files under it.
- **Owner:** Shared reusable media and sync references used by templates and scripts.
- **Key directory:** `shared/audio/`.

## Commands (use what this repo uses)
- **Inspect shared audio:** `rg --files shared/audio`
- **Sync usage:** `bash scripts/sync-video-sfx.sh`

## Feature map

| Feature | Owner | Key paths | Entrypoints | Tests | Docs |
|---|---|---|---|---|---|
| Shared SFX library | `shared` | `shared/audio/sfx/` | Codex playbook asset copy/sync step | rendered short audio checks | `shared/audio/MANIFEST.md` |
| Asset manifests | `shared` | `shared/audio/MANIFEST.md` | documentation updates | manual review | `shared/audio/README.md` |

## Conventions
- Keep filenames stable and descriptive (for example, `sonic-logo.mp3`, `glitch-zap.mp3`).
- Maintain `shared/audio/` as the canonical origin for reusable SFX assets.
- Keep manifest/readme aligned with available media files.

## Common pitfalls
- Avoid duplicating SFX files between `shared/audio/` and `public/sfx/` unless intentional.
- Renaming files requires updating sync logic in scripts and generated references.

## Do not
- Do not add non-audio binary formats in `shared/audio/`.
- Do not remove manifest/readme entries without noting the replacement in commit notes.
