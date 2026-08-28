# Agent instructions (scope: this directory and subdirectories)

## Scope and layout
- **This AGENTS.md applies to:** `ai_docs/` and all files under it.
- **Owner:** Strategic notes and migration documentation.
- **Key directory:** `ai_docs/codex-migration-strategy/`.

## Commands (use what this repo uses)
- **Read/extend strategy docs:** edit and link markdown files in this directory.
- **No runtime checks required** for docs-only changes unless requested.

## Feature map

| Feature | Owner | Key paths | Entrypoints | Tests | Docs |
|---|---|---|---|---|---|
| Migration strategy | `ai_docs` | `ai_docs/codex-migration-strategy/*` | project planning process, not runtime | none by default | `ai_docs/codex-migration-strategy/README.md` |

## Conventions
- Keep documentation focused on decisions and tradeoffs; avoid operational command noise unless action-required.
- Link code artifacts by path when decisions depend on concrete repo files.
- Keep headings and decision numbering stable for cross-references.

## Common pitfalls
- Do not mix implementation task logs with migration history unless explicitly requested.
- Avoid claiming runtime behavior as factual if it has not been validated by a Codex generation run or lint output.

## Do not
- Do not edit strategy docs for unrelated code changes without explicit scope in request.
- Do not remove architectural context needed for long-lived implementation rationale.
