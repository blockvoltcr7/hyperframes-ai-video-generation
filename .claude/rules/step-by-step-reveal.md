# Step-by-step reveal — never reveal all bullets at once

When a phase or scene contains an enumerated list (5 features, 3 timeline events, 4 stat pills, a decision matrix, a checklist, etc.), each item MUST enter on its own beat — paced to match when narration would name it. Never bring multiple items in within the first few seconds and then hold them static for the rest of the phase.

## Why

The video's job is to direct attention. When all 5 cards appear together at t=14s and the phase lasts until t=47s, the viewer's eye has nowhere to go for 33 seconds — they read all 5 ahead of the narrator, then disengage. When item N appears the moment the narrator says "and fifth, MCP servers," the viewer's reading rhythm syncs with the audio and retention stays high.

This is the single biggest reason a tight script feels boring on screen — the visuals raced ahead of the words.

## How to apply

For any list of N items in a phase that lasts D seconds:

1. Reserve ~2s for overline + headline at phase start.
2. Reserve ~5–10% of D as a tail-hold (all items visible together, eye can rest before transition).
3. Distribute the N item entrances across the remaining time at roughly `(D - 2 - 0.1*D) / N` seconds apart.

**Concrete example — 5 cards in a 35s phase:**

- 0–2s: overline + headline enter
- 1.5s, 7s, 12.5s, 18s, 23.5s: cards enter one at a time (~5.5s apart)
- 23.5–32s: ~8s tail-hold with all 5 visible
- 32–35s: phase exits via crossfade

Without narration yet, this same spacing acts as a placeholder — the entrance times will be retimed to word-level transcript anchors when the TTS lands.

## What NOT to do

- **Don't stagger by `+0.7s` between items inside a 35s phase.** That's a quick-reveal flourish, not paced enumeration. Quick stagger (5 items in 4s) is fine on hero "cast" reveals where narration says "five features" and lists them in one sentence — it's wrong on enumerated explanations where each item gets its own narration breath.
- **Don't put all items at `+0` and let them appear simultaneously** — that's a slide deck, not a video.
- **Don't ignore this rule on enumerations of 4+ items.** For 2–3 items, quick stagger is acceptable if the narration genuinely names them all in one sentence.

## The hidden-until-reveal pattern (REQUIRED)

The single biggest gotcha: `tl.from(target, { opacity: 0 }, t)` does NOT keep the element invisible from frame 0 to time `t` reliably on long compositions with paused/seekable timelines. Two failure modes:

1. **With `immediateRender: false`** — the from-state is only applied at the moment the tween fires, so the element sits at its natural visible state from `t=0` until the tween starts. All your cards appear together when the phase fades in.
2. **With default `immediateRender: true`** — works correctly on short compositions but on long ones (60s+, with multiple seek points) GSAP can re-evaluate the from-state at unexpected times during scrub.

**The bullet-proof pattern is explicit `tl.set()` at `t=0` + `tl.to()` at the reveal time:**

```js
// Hide all 5 cards from frame 0 — explicit, no ambiguity
tl.set("#card-1", { x: -40, scale: 0.95, opacity: 0 }, 0);
tl.set("#card-2", { x: -40, scale: 0.95, opacity: 0 }, 0);
tl.set("#card-3", { x: -40, scale: 0.95, opacity: 0 }, 0);
tl.set("#card-4", { x: -40, scale: 0.95, opacity: 0 }, 0);
tl.set("#card-5", { x: -40, scale: 0.95, opacity: 0 }, 0);

// Reveal each at its narration-paced entrance time
tl.to("#card-1", { x: 0, scale: 1, opacity: 1, duration: 0.55, ease: "back.out(1.5)" }, P + 1.5);
tl.to("#card-2", { x: 0, scale: 1, opacity: 1, duration: 0.55, ease: "back.out(1.5)" }, P + 7.0);
// ... etc
```

This is more verbose than `tl.from()` but unambiguous: the elements are visibly hidden from frame 0, and each reveal is a positive-direction tween that's deterministic at any seek point.

## How to retime to narration when TTS lands

Once `transcript.json` exists for a scene, replace the placeholder entrance times with the word-`start` of the moment narration names each item:

```js
const transcript = /* loaded transcript.json */;
const cardEntries = [
  { selector: "#p2-card-1", word: "CLAUDE.md" },
  { selector: "#p2-card-2", word: "Skills" },
  { selector: "#p2-card-3", word: "Sub-agents" },
  { selector: "#p2-card-4", word: "Hooks" },
  { selector: "#p2-card-5", word: "MCP" },
];
cardEntries.forEach(({ selector, word }) => {
  const t = transcript.words.find(w => w.text === word).start;
  tl.from(selector, { x: -40, opacity: 0, duration: 0.55, ease: "back.out(1.5)", immediateRender: false }, t);
});
```

This way each entrance lands within ±50ms of the spoken word — the viewer reads the item the moment the narrator says it.

## Where this rule applies

- All shorts (`templates/shorts/<style>/`) and shorts-derived videos under `videos/`
- All long-form scenes (`templates/long-form/<style>/compositions/scene-*.html`)
- Any composition with a multi-item list, decision matrix, checklist, comparison grid, or numbered enumeration

It does NOT apply to:

- Single-element hero entrances (one slam word, one URL, one stat pill)
- Background drift (shapes, ambient gradients) which are deliberately continuous, not enumerated
- Per-character text reveals inside a single sentence (those are letter-grain, not item-grain)

## Quick self-check before declaring a composition done

For every phase with a list:

1. Does each item enter at a distinct time at least ~3s apart?
2. Is there a tail-hold where all items are visible together before the phase exits?
3. Could a viewer at 1× speed read each item as it appeared, without racing ahead of the narrator?

If any answer is "no", respace before linting.
