# Visual pacing — never let the screen stay static for more than 5 seconds

In any composition (Short or long-form), **at most 5 seconds may pass without something visibly changing on the foreground**. After ~5s of a frozen frame the eye loses anchor, the brain disengages, and on mobile the thumb flicks past. The narrative still drives — but when no narrative reveal is due, manufacture a beat.

## Why

Viewers on YouTube Shorts and TikTok scroll fast. A 5+ second static frame reads as "slide deck" not "video" and tanks retention. Even subtle motion (a scale pulse, a marker sweep, a glow flicker) keeps the eye locked. This is also why a great quote phase reveals the quote in segments and underlines key phrases — not because the viewer can't read, but because the screen needs to keep moving.

This rule is the per-phase complement to the [`step-by-step-reveal`](./step-by-step-reveal.md) rule. That rule covers enumerated lists. This rule covers **everything else**: hero phases, quote phases, CTA phases, video-embed phases, transitions — anywhere a viewer might watch the same frame for too long.

## How to apply

For every phase, list every element-entrance time (`tl.from`, `tl.to`, `tl.fromTo` with non-trivial visual impact). Compute the gap between each consecutive pair, **plus** the gap from last entrance to phase exit. Each gap must be **≤ 5.0s**. For each gap that exceeds 5s, insert one or more visual beats in the middle.

A beat must reveal **new visual content** — content the viewer hadn't seen before, paced to the narration that's about to land. This is a content rule, not an animation rule. Movement that doesn't carry information is not a beat.

Acceptable beats:

1. **New element entrance** — a chip, pill, badge, sub-line, mini-card, or sub-row that fades / slides / pops in. The element must contain words, an icon, or visible meaning. Best — it's also content.
2. **Marker highlight on existing text** — a sweeping underline, circle, strike-cross, or scribble drawing across a key phrase already on screen. The marker is visibly NEW geometry — the viewer sees it appear.
3. **Content morph** — text changing in place (e.g. counter tick from `0 → 64`, or label swap "soon" → "live"). The CONTENT is new, even if the element isn't.
4. **Item replacement** — one card slides off, another slides in, occupying the same slot. The slot stays, the content is new.
5. **Layered reveal** — a small icon overlay, badge, tag, or mark drawing onto an existing card or screenshot. The mark is new content overlaid on familiar content.

These are NOT beats — never count them:

- **Scale yoyo / pulse** on an existing element. The scale changed for 0.3s and reverted. The viewer's information state did not change.
- **Glow / shadow pulse** via `text-shadow` or `box-shadow` animation. Same — no new information.
- **Color tint shift, saturation pulse, hue shift**. Decoration, not content.
- **Slight rotation** of an existing element. Movement, not content.
- **Audio reactive bumps** (subtle scale tied to audio amplitude). The viewer learns nothing new.

The intuition: at the end of a beat, has the viewer's mental model of "what's on screen" advanced? If yes, it counts. If no — even if the pixels moved — it doesn't.

## What does NOT count

- **Persistent backgrounds**: ambient gradient yoyo, shape-backdrop drift, progress bar fill, noise-overlay film grain — these run for the full duration and the eye filters them out as ambient. They are NOT a substitute for foreground beats.
- **Audio**: narration playing, SFX firing — audio doesn't satisfy a visual rule.
- **A video element that is paused or buffering** — even though the `<video>` tag is "playing", if rendered frames don't change for 5s the rule is violated.
- **Shape-backdrop reposition on phase transition** — that's part of the transition, not a mid-phase beat.

## Quick audit (run before every preview)

For every phase, in seconds:

1. Note the **start** time of the phase.
2. List every meaningful entrance (`from`, `to`, `fromTo` that visibly changes opacity / scale / position / color of a foreground element).
3. Compute consecutive deltas between entrance END times, plus the delta from final entrance to **phase EXIT** (start of the next crossfade).
4. Every delta must be ≤ 5.0s. Flag any that exceeds.
5. For each flagged gap, add a beat at roughly the midpoint. Keep it subtle.

For elements whose entrance is itself an animation (e.g. a 0.6s scale-up at t=20s), the beat *finishes* at t=20.6 — the next beat must start by t=25.6.

## Worked example — quote phase that violates the rule

**Bad** — quote-card enters at t=77.5s, phase exits at t=94.0s. The card stands still for 16s.

```js
tl.from("#p4-overline",   { y: 20, opacity: 0, duration: 0.5 }, 77.1);
tl.from("#p4-quote-card", { y: 36, opacity: 0, scale: 0.95, duration: 0.7 }, 77.5);
// ... nothing until phase transition at 93.8 — VIOLATES 5s rule for 12+ seconds
```

**Fixed** — three subtle beats inserted on existing elements, paced to narration:

```js
tl.from("#p4-overline",   { y: 20, opacity: 0, duration: 0.5 }, 77.1);
tl.from("#p4-quote-card", { y: 36, opacity: 0, scale: 0.95, duration: 0.7 }, 77.5);
// Beat 1 — sweep marker under "meets them there" key phrase
tl.to("#p4-mark-1",       { width: "100%", duration: 0.6, ease: "power2.out" }, 82.5);
// Beat 2 — subtle scale pulse on author name
tl.to("#p4-author-name",  { scale: 1.03, duration: 0.3, yoyo: true, repeat: 1 }, 87.5);
// Beat 3 — sweep marker under "step-change in efficiency"
tl.to("#p4-mark-2",       { width: "100%", duration: 0.6, ease: "power2.out" }, 92.0);
```

Now the visual surface changes at t=77.1, 77.5, 82.5, 87.5, 92.0 — every gap ≤ 5s, and the phase exit is < 2s after the final beat.

## Where this rule applies

- All Shorts (`templates/shorts/<style>/`, `videos/<slug>/` with vertical canvas)
- All long-form scenes (`templates/long-form/<style>/compositions/scene-*.html`)
- Any phase or scene with a single hero element (quote card, screenshot card, big stat, hero word, video frame)

## When to relax

The only acceptable >5s static window: an explicit "breath" beat at the very end of a composition before a fade-to-black or endcard handoff — capped at 1.0s, not 5+. If you find yourself wanting more breath, the phase is too long; trim it.
