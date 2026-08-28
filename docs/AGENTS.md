# Documentation instructions

## OKF bundle

The project knowledge bundle lives at `docs/okf/hyperframes-ai-video-generation/`.

- Keep `index.md` frontmatter-free and use it for progressive disclosure.
- Keep `log.md` frontmatter-free and add meaningful changes newest first.
- Every other bundle Markdown file is an OKF concept and must have YAML frontmatter with a non-empty `type`.
- Use the repository source files as the source of truth; do not copy secrets, raw environment values, or generated output into the bundle.
- Validate with `npm run docs:validate:okf` after adding or changing OKF concepts.
