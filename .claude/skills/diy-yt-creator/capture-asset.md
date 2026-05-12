# capture-asset — Sub-playbook

Capture a per-video visual asset (app UI screenshot, page hero, logo from a brand site)
and save it to `videos/<slug>/assets/<name>.png` ready to reference from `index.html`.

Wraps the `agent-browser` skill with HyperFrames conventions: per-video isolation,
cookie-banner dismissal, dark-mode hinting (the Anthropic template is dark-stage, so
we prefer the site's dark theme when available), validation, and reproducibility.

## Inputs

- **slug**: the video folder name (must already exist under `videos/<slug>/`)
- **url**: the source URL (must be publicly accessible; no localhost without explicit user OK)
- **name**: kebab-case filename (no extension), e.g. `slack-channel-ui`. PNG is appended.
- **mode** (optional): `full` (full-page, default), `viewport` (1080x1920 fold only), `element` (requires `selector`)
- **scheme** (optional): `dark` (default for the Anthropic template), `light`
- **selector** (optional): CSS selector if `mode=element`, or to scroll-to before capturing
- **--force** (optional flag): overwrite existing PNG of the same name without asking

## Steps

### 1. Verify the target

- `ls videos/<slug>/index.html` exists. If not, stop — capture-asset only runs against existing video projects.
- `mkdir -p videos/<slug>/assets`.
- If `videos/<slug>/assets/<name>.png` already exists and `--force` was NOT passed, ask before overwriting.

### 2. Capture

Use the `/agent-browser` skill. Canonical chained call:

```bash
agent-browser open "<url>" \
  && agent-browser wait --load networkidle \
  && agent-browser eval "document.querySelectorAll('[id*=cookie i], [class*=cookie i], [id*=consent i], [class*=consent i], [class*=banner i][class*=cookie i], [aria-label*=cookie i]').forEach(e => e.remove()); document.documentElement.style.setProperty('color-scheme', '<scheme>');" \
  && agent-browser screenshot --full "videos/<slug>/assets/<name>.png"
```

For `mode=viewport`: drop `--full` and prepend `agent-browser viewport 1080 1920`.

For `mode=element` + selector: replace the screenshot line with `agent-browser screenshot @<ref>` after `agent-browser snapshot -i` and identifying the matching ref.

### 3. Validate

```bash
ls -lh videos/<slug>/assets/<name>.png
```

- File must exist and be ≥10KB. <10KB usually means a blank page or a redirect to an interstitial.
- If too small, retry once with `agent-browser wait --load networkidle && agent-browser wait 2000 && agent-browser screenshot --full ...` (extra 2s for animations).
- If still too small, stop and ask the user — the page may require auth or have anti-bot protection.

### 4. Report

One line: `Captured <name>.png (<size>KB) from <url> → videos/<slug>/assets/<name>.png`.
Then suggest the `<img>` tag for the user to splice into `index.html`:

```html
<img src="assets/<name>.png" alt="<descriptive alt>" />
```

## Troubleshooting

- **Page takes >25s to load**: set `AGENT_BROWSER_DEFAULT_TIMEOUT=60000` for the call. Default Playwright timeout is 25s.
- **Cookie banner not dismissed**: the eval pattern catches most banners with attribute selectors containing `cookie`, `consent`, or aria-labels. For sites with non-standard markup, run `agent-browser snapshot -i`, identify the banner's `@eN` ref, and `agent-browser click @eN` on the dismiss button before screenshotting.
- **Anti-bot challenge (Cloudflare, hCaptcha)**: the screenshot will likely be the challenge page (small file). Stop and ask the user — these need manual intervention or a residential proxy.
- **Auth-walled page**: same — small file. Ask the user to provide credentials via `agent-browser` session-management workflow (see `.claude/skills/agent-browser/references/authentication.md`).

## Don'ts

- Never store captures in `shared/` (per `shared/README.md:43` — `shared/` is for cross-video brand logos only).
- Never capture localhost / 127.0.0.1 / internal IPs without explicit user approval.
- Never re-capture a URL within the same video without `--force` (waste + rate limit risk).
- Never use `agent-browser screenshot` without prior `wait --load networkidle` — you'll capture the loading skeleton.
- Never modify the captured PNG (no resize, no compression) — `npx hyperframes inspect` works on raw output and the framework handles scaling.
- Never auto-edit `index.html` to splice in the new `<img>` tag — that's the user's call (or the parent playbook's, e.g. `new-anthropic-short.md` step 8). This sub-playbook is single-purpose: capture and report.
