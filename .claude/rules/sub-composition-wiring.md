# Sub-composition wiring — silent studio failures and how to avoid them

When `data-composition-src` mounts a sub-composition into a host, three lint-passable mistakes cause the studio to **silently load nothing** (canvas shows "Drop media here…", duration `0:00/0:00`, file tree visible but no composition selected). The renderer also produces empty frames.

These bugs hit hard because:

- `npx hyperframes lint` reports **0 errors, 0 warnings** — none of these are caught
- `npx hyperframes inspect` reports **0 layout issues** — the empty frame technically has no overflow
- The studio has no error toast — it just won't load the composition
- `console.log` / `window.onerror` don't fire — the studio bails before any JS runs

The user's workflow (preview → tweak → render) is blocked at the first step with no diagnostic.

## The three bugs

### 1. Mismatched `data-composition-id` between parent mount and child file

The parent mount's `data-composition-id` MUST equal the **child file's** internal `data-composition-id` (the one on the child's `<div id="root" data-composition-id="...">`). They are not arbitrary IDs — the studio uses the parent's value to look up which composition to render inside the slot.

**Wrong** (host says one ID, child file says another — studio silently bails):

```html
<!-- index.html -->
<div id="phase1"
     data-composition-id="phase1"     ← studio asks for "phase1"
     data-composition-src="compositions/phase1-aurora.html"></div>

<!-- compositions/phase1-aurora.html -->
<div id="root"
     data-composition-id="phase1-aurora"   ← child publishes "phase1-aurora"
     ...>
```

**Right** (IDs match — pick one and use it on BOTH sides):

```html
<!-- index.html -->
<div id="phase1"
     data-composition-id="phase1-aurora"   ← matches child
     data-composition-src="compositions/phase1-aurora.html"></div>

<!-- compositions/phase1-aurora.html -->
<div id="root"
     data-composition-id="phase1-aurora"   ← matches host
     ...>
```

The visual `id="phase1"` (host's CSS selector / GSAP target) is independent of `data-composition-id` (the studio's mounting key). Don't confuse them.

### 2. Missing timing attributes on the parent mount div

A sub-composition mount IS a timed clip. It needs the same four attributes every other clip needs:

```html
<div id="phase1"
     class="clip"                            ← required: marks it as a timed element
     data-composition-id="phase1-aurora"
     data-composition-src="compositions/phase1-aurora.html"
     data-start="0"                          ← when the slot becomes active (seconds)
     data-duration="8"                       ← how long it plays
     data-track-index="2"                    ← layer ordering (higher = front)
     data-width="1080"                       ← canvas width (matches child)
     data-height="1920"></div>               ← canvas height (matches child)
```

Without these, the studio sees a sub-comp slot with no schedule and won't know when to render it. Lint doesn't enforce them on sub-comp mounts because the timing CAN come from the child's own root timeline — but in practice the studio expects the parent to schedule.

### 3. Missing `class="clip"` on the parent mount

The framework uses `class="clip"` for visibility control. A sub-comp mount without it may render at all times or never, depending on framework version. Always include it.

## Symptoms checklist (use to diagnose)

If your composition isn't loading in `hyperframes preview`, run through this in order:

1. **Open the studio URL.** Does the duration display show `0:00/0:00` instead of `0:00/<your-total>`? → composition didn't load. Continue.
2. **Open the file tree.** Is `index.html` listed? → yes (the file is there) → continue. No → check meta.json `id` matches the project directory name.
3. **Click `index` in the file tree manually.** Did the duration update? → yes: studio just didn't auto-pick. Probably fine. → no: keep going.
4. **Read the parent mount divs in `index.html` for every `data-composition-src`.** For each one:
   - Open the referenced child file
   - Check `<div id="root" data-composition-id="X">` in the child
   - Does the parent's `data-composition-id` equal `X`? If no — **bug #1**.
   - Does the parent have `class="clip"` + `data-start` + `data-duration` + `data-track-index` + `data-width` + `data-height`? If no — **bug #2 / #3**.
5. **Restart the preview server.** The studio sometimes caches the file tree (a deleted file may still appear). Run `npx hyperframes preview --kill-all` then re-open.

## When you're authoring sub-compositions

Before declaring a composition done, walk through this self-check:

```
For every mount: <div data-composition-src="compositions/X.html" ...>
  - Open compositions/X.html
  - Read its <div id="root" data-composition-id="Y">
  - Confirm parent's data-composition-id == Y
  - Confirm parent has: class="clip", data-start, data-duration, data-track-index, data-width, data-height
  - Confirm parent's data-width / data-height match the child's html/body width/height
```

Then **load the URL in a browser** and confirm the duration display shows the expected total. Lint passing is not enough — the studio's silent-bail behavior makes a manual preview check mandatory.

## When you're authoring blocks under `shared/lib/blocks/`

The block's own `block.html` defines its `data-composition-id` (the canonical ID — directory name = block name = ID). The block's `recipe.md` MUST publish the host wiring snippet showing the parent mount with all attributes correctly set. Mirror existing recipes (`shared/lib/blocks/stat-pill-row/recipe.md`) — copy the snippet structure, swap in the right name + dimensions + duration.

## Why lint can't catch this (today)

`hyperframes lint` runs file-by-file. Catching the parent↔child ID mismatch requires cross-file resolution: open the child referenced by `data-composition-src`, parse its root `data-composition-id`, compare against the parent's. That's not in the current rule set. Until it is, this rule is the human compensation.

If lint ever adds the cross-file rule (e.g., `composition_id_mismatch`), this document can shrink to a one-line pointer at it.
