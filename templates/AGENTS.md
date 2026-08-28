# Agent instructions (scope: this directory and subdirectories)

## Scope and layout
- **This AGENTS.md applies to:** `templates/` and all files under it.
- **Owner:** Short composition template contracts.
- **Key directories:** `templates/shorts/archon/`, `templates/shorts/anthropic/`, `templates/shorts/classic/`.

## Commands (use what this repo uses)
- **Lint template:** `npx hyperframes lint templates/shorts/<template>`
- **Inspect template output after generation:** `npx hyperframes inspect videos/<slug>`
- **Render preview of a generated short:** `npx hyperframes preview videos/<slug>`

## Feature map

| Feature | Owner | Key paths | Entrypoints | Tests | Docs |
|---|---|---|---|---|---|
| Default shipped templates | `templates` | `templates/shorts/{classic,archon,anthropic}/` | Template selected by the Codex generation request | `npx hyperframes lint templates/shorts/<template>` | `templates/shorts/*/README.md`, `DESIGN.md` |
| Template phase rhythm | `templates` | `templates/shorts/*/index.html`, `hyperframes.json` | JS constants and phase sections in `index.html` | `npx hyperframes lint` + Codex generation smoke | Playbook contract in `.agents/skills/diy-yt-creator` |
| Template metadata | `templates` | `templates/shorts/*/meta.json`, `PRONUNCIATION.md`, `hyperframes.json` | Playbook reads metadata files during generation | Codex generation smoke | template-local docs |

## Conventions
- Maintain the phase rhythm contract (`#phase1-4`, inner IDs like `#p1-hero`, `#p2-pill-1`, etc.) unless you also update timing and playbook assumptions.
- Keep default phase timings and IDs compatible across shipped templates unless intentionally changing parser assumptions.
- Re-use shared CSS class patterns where possible (`.hero`, `.caption`, CTA classes) to reduce visual regressions.

## Common pitfalls
- Changing structure without updating the generated script block mapping often results in silent mis-fills.
- Avoid altering final frame hold behavior; thumbnail grade final frame requirement depends on timing and CTA stillness.
- Keep word-level script blocks aligned with `scripts/compute_timings.py` expectations.

## Do not
- Do not create template-only changes without updating matching Codex playbook and Studio allowlist references.
- Do not delete `.gitkeep` in `audio/` or `compositions/`; these folders are expected by tooling.
