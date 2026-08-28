# Shorts typography — minimum font sizes for vertical 1080×1920

Vertical shorts render to mobile portrait viewport. On a typical phone (~390 CSS px wide), the 1080px canvas displays at ~0.36× scale. Anything under 32px on canvas becomes ≤ 11–12px on screen — below the readable bound for a viewer scanning in 2–3 seconds. The Anthropic shorts template was authored with 24-second demo content; its smaller descriptor sizes (26–28px) work for that specific case but are too small for explainer / list-heavy shorts where the viewer must read each item.

## Minimums by role (canvas size in px)

| Element role | Min | Recommended | Notes |
|---|---|---|---|
| Hero slam (single big word) | 140px | 160–200px | Scroll-stop hero, e.g. "MOST DEVS USE 1." |
| Phase headline | 56px | 60–72px | Sets the phase topic, e.g. "Each solves a different problem." |
| List item — primary label | 48px | 52–64px | Feature name, scene title, the "what" |
| List item — descriptor / role | 30px | 32–36px | Subtitle below primary label, the "what does it do" |
| Decision matrix — question | 36px | 38–44px | Q-side of a Q→A row |
| Decision matrix — answer | 42px | 46–52px | A-side; the punchline. Bigger than the question. |
| Caption pill / context strip | 32px | 34–40px | E.g. "CLAUDE.md · Skills · …" pills |
| CTA pill ("Subscribe →", "Watch the full video") | 44px | 48–56px | Final beat needs weight |
| Overline / mono moustache | 32px | 36px | Branding chrome above headlines |
| URL / monospace technical text | 56px | 60–72px | Mono is denser, needs bigger to match sans weight |
| Stat number (the receipt) | 140px | 160–200px | Big colored numerals in stat pills |
| Stat label (under the number) | 28px | 30–34px | Mono caption under the big number |

## Why these minimums

On YouTube Shorts at 1× speed, the viewer has roughly 2 seconds per beat to read. The 1080px canvas displays at:

- iPhone SE (375 CSS px wide): 0.347× scale
- iPhone 13 (390 CSS px wide): 0.361× scale
- iPhone 14 Pro Max (430 CSS px wide): 0.398× scale

So a 32px canvas glyph renders at 11–13px on phone — at the lower readable bound. Below 28px on canvas → unreadable on phone, full stop. Below 36px → readable but slow, viewer falls behind narration.

## What to do when content doesn't fit at min size

The `overflow_layout` linter catches hard overflows but not "fits but feels cramped." If a primary label overflows at the recommended size:

1. **First: shorten the text.** "Always-on instructions" reads as fast as "Always loaded" but uses 2× the chars. Most shorts overflow because the writing is wordy, not because the font is wrong.
2. **Then: reduce the OTHER content density.** Fewer cards, smaller card padding, tighter `gap` values — before shrinking the font.
3. **Last resort: drop one tier on the hierarchy** (recommended → minimum). Never go below minimum.

## Audit before declaring a short done

For every text element in a `templates/shorts/<style>/index.html` or `videos/<slug>/index.html`:

1. Identify its role from the table above.
2. Is its `font-size` ≥ the minimum for that role?
3. Could a phone viewer at arm's length scan this glyph in 2 seconds?

If any answer is "no", bump before linting.

## Long-form (1920×1080) is NOT covered by this rule

Long-form renders to 16:9 viewports (typically 1280–2560px wide, viewed at desk distance), so canvas pixels render at ≥ 0.65× scale. Smaller body text (24–28px) is fine on long-form. This rule applies ONLY to vertical 1080×1920 compositions.
