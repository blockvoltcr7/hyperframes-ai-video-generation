# qa-composition — Sub-playbook

After `npx hyperframes preview videos/<slug>` is running (it prints a URL like
`http://localhost:3002/api/projects/<slug>/preview`), use `agent-browser` to
visually QA the rendered composition by jumping to each phase's start time and
snapshotting the rendered output.

Complements `npx hyperframes lint` and `npx hyperframes inspect` (which check
HTML/layout statically); this skill checks the *rendered visual output*.

## Inputs

- **slug**: the video folder name
- **preview_url**: the URL printed by `hyperframes preview` (defaults to `http://localhost:3002/api/projects/<slug>/preview`)

## Steps

### 1. Verify preview is running

```bash
curl -fsS -o /dev/null "<preview_url>" && echo OK
```

If not 200, ask the user to run `npx hyperframes preview videos/<slug>` first. The preview server must remain running for this sub-playbook to work.

### 2. Read phase boundaries from index.html

Parse `videos/<slug>/index.html` for elements with `data-start` and `data-duration`.
Build a list `[{phase: "intro", start_s: 0, duration_s: 4}, ...]`. The exact selector
depends on the template — for the Anthropic shorts template, look for top-level
`data-track-index="0"` clips at known IDs (`#intro`, `#phase-2`, `#phase-3`, `#outro`).

### 3. Capture each phase

Create `videos/<slug>/qa/` if it doesn't exist. For each phase:

```bash
agent-browser open "<preview_url>?t=<start_s>" \
  && agent-browser wait 500 \
  && agent-browser viewport 1080 1920 \
  && agent-browser screenshot "videos/<slug>/qa/phase-<name>-t<start_s>.png"
```

> Check that the preview server supports `?t=<seconds>` query for time-jump. If it
> doesn't, fall back to `agent-browser eval "Object.values(window.__timelines || {}).forEach(tl => tl.seek(<start_s>))"` after open + wait. Per `CLAUDE.md:99-103`, timelines are exposed on `window.__timelines` for exactly this kind of programmatic control.

### 4. Analyze

For each captured PNG, read it via the Read tool (PNGs render in chat) or describe via `agent-browser get text body`. Specifically check:

- Text not clipped or overflowing the safe area (1080x1920 portrait)
- Logos rendered (no broken-image icons)
- Phase 3 cards have all expected elements
- Top banner present
- No leftover template placeholders ("DUMBER?", template stat numbers, "anthropic.com/postmortem", "Mar 4 / Mar 26 / Apr 16", "3 separate bugs / 6 weeks stacked")
- Contrast / readability on the dark stage background

### 5. Report

Bullet list per phase: `phase-N: [PASS|FAIL: reason]`. If any FAIL, link the PNG
path so the user can see the issue. Recommend specific edits (e.g. "phase-3 stat pill
3 overflows by ~12px on the right — reduce font-size from 64px → 56px").

## Don'ts

- Never claim PASS without actually viewing the PNG (it must be Read into the chat or
  described from `agent-browser get text` output).
- Never modify `index.html` from this sub-playbook — qa-composition is read-only,
  suggestions only. Edits go through the user or back to `new-anthropic-short` step 8.
- Never capture against the rendered MP4 (`videos/<slug>/out/short.mp4`) — that's a
  different artifact; qa-composition is for the live preview only.
- Never delete `videos/<slug>/qa/` automatically — keep snapshots for reference. User can `rm -rf videos/<slug>/qa/` whenever they want.
- Never run qa-composition during a render — the renderer drives its own headless browser; another browser snapshotting at the same time may interfere.
