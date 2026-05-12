# QA Findings — Archon (marketing, voiced+music+sfx, diagrams)

**Composition ID:** Archon  
**Mode:** marketing | VOICED=true | MUSIC=true | SFX=true | USES_DIAGRAMS=true  
**Review date:** 2026-05-02  
**Verdict:** needs-iteration

---

## Checks passed (no issues found)

| Check | Result |
|---|---|
| TypeScript compile (`tsc --noEmit`) | ✅ 0 errors |
| Composition registered in `compositions.gen.ts` | ✅ `archon_meta` imported and listed |
| `src/Archon/index.ts` exports valid meta (id, component, fps, calculateMetadata) | ✅ |
| No edits to `src/Root.tsx`, `src/compositions.gen.ts`, or other compositions | ✅ |
| Plan alignment: 4 scenes, all IDs present, durations driven by audio | ✅ |
| Hook quality: "AI agents do something different every time." (9 words, no "Welcome/Today/In this video") | ✅ |
| scene1→2 transition: `slide({ direction: "from-right" })` via `<TransitionSeries.Transition>` | ✅ |
| scene2→3 transition: `slide({ direction: "from-right" })` via `<TransitionSeries.Transition>` | ✅ |
| scene3→4 transition: `fade()` via `<TransitionSeries.Transition>` | ✅ |
| No hand-animated opacity fades adjacent to plain `<Sequence>` (anti-pattern) | ✅ |
| Typewriter via string slicing (`HOOK_TEXT.slice(0, charsVisible)`) — no per-char opacity | ✅ |
| Named Bézier easing on all enter/pop animations via `EASE_ENTER` and `EASE_POP` constants | ✅ |
| `premountFor={T}` on all four `<TransitionSeries.Sequence>` elements | ✅ |
| `calculateMetadata` derives durations from `getAudioDuration(staticFile(...))` — no hardcoded frames | ✅ |
| Fonts: `loadFont()` from `@remotion/google-fonts/Inter` with explicit weights + subsets | ✅ |
| Composed-progress pattern: multi-property animations derived from a single `progress` var | ✅ |
| No source-platform references in active scenes (HN, points, upvotes, etc.) | ✅ |
| No fabricated features: all claims (Dockerfiles analogy, 17 workflows, MIT, triggers) traced to `article-body.md` | ✅ |
| Final scene (scene4) is a CTA showing install command + `archon.diy` | ✅ |
| No hype language ("game-changer", "revolutionary", etc.) | ✅ |
| Voice `<Audio>` present in all four `TransitionSeries.Sequence` elements | ✅ |
| `calculateMetadata` sums audio durations minus 3 × TRANSITION_DUR (correct formula) | ✅ |
| Music: single composition-level `<Audio src={staticFile("music/Archon.mp3")}>` | ✅ |
| SFX: intro whoosh at frame 0 (`from={0}`) | ✅ |
| SFX: outro stinger at `durationInFrames - SFX_OUTRO_DUR` | ✅ |
| SFX: three scene-boundary ticks wired at `t1/t2/t3Start - 3` (leads visual cut) | ✅ |
| No mid-scene SFX beyond what the plan required | ✅ |
| Scene2 diagram uses gradient fills, multi-layer shadows, and glow SVG filter | ✅ |
| Scene2 diagram connections: 2.5px stroke, glow via duplicate blur line + SVG filter, draw-on animation | ✅ |
| Scene2 diagram icons: Lucide components (no Unicode emoji, no invisible glyphs) | ✅ |
| Diagram background: radial gradient centered on diagram focal point | ✅ |

---

## HIGH — Music not ducked during voiced narration

**Check:** 12 (Music-mode, voiced composition)  
**File:** `src/Archon/Archon.tsx`, lines 47–55

The music `<Audio>` ramps from 0→0.2 over the first 15 frames via `extrapolateRight: "clamp"` and then stays locked at **0.2 for the entire composition duration**. No dynamic volume reduction (ducking) is applied during any of the four voiced scenes.

```tsx
// Current — no ducking; stays at 0.2 through all narration
<Audio
  src={staticFile("music/Archon.mp3")}
  volume={(f) =>
    interpolate(f, [0, 15], [0, 0.2], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",   // ← clamps to 0.2 forever
    })
  }
/>
```

**Required fix:** Duck the music to ~0.05 during narration windows and restore after. Because `calculateMetadata` makes exact scene boundaries dynamic, the simplest approach is to derive the duck schedule from the `sceneDurations` prop passed to the component, OR use a static approximation from the voice-manifest totals.

Example pattern:
```tsx
volume={(f) => {
  const atStart = interpolate(f, [0, 15], [0, 0.2], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // Duck during all voiced content (frame 0 → end of last voice scene)
  const duck = interpolate(f, [0, 10, totalVoiceFrames - 10, totalVoiceFrames], [1, 0.25, 0.25, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp"
  });
  return atStart * duck;
}}
```

**Severity:** HIGH — unducked background music fights the narration across all four scenes.

---

## MED — Systematic raw frame literals > 30 in Scene2 diagram stagger offsets

**Check:** 6e (Seconds × fps, not raw frame literals)  
**File:** `src/Archon/scenes/Scene2.tsx`, lines 159–168

Eight diagram-node enter-frame offsets are hard-coded as raw integers, eight of which exceed 30:

```ts
const pYaml    = popProgress(40, NODE_DUR);   // 40 → should be Math.round(40/30 * fps)
const pLine2   = drawProgress(55, LINE_DUR);  // 55
const pLine3   = drawProgress(60, LINE_DUR);  // 60
const pAi      = popProgress(70, NODE_DUR);   // 70
const pBash    = popProgress(82, NODE_DUR);   // 82
const pLine4   = drawProgress(95, LINE_DUR);  // 95
const pLine5   = drawProgress(100, LINE_DUR); // 100
const pResult  = popProgress(115, NODE_DUR);  // 115
```

Eight occurrences is systematic (not occasional). These offsets are within-scene beat timings that should be expressed in fractional seconds so they scale correctly if fps ever changes. For example, `115` frames at 30 fps = 3.83 s; if the project moved to 60 fps the animation would compress to half the intended time.

**Required fix:** Express as `Math.round(X * fps)` where X is the desired seconds offset, e.g. `popProgress(Math.round(3.83 * fps), NODE_DUR)`.

**Severity:** MED — systematic pattern across 8 literals (rule escalates from LOW-per-occurrence to MED).

---

## LOW — Missing easing on Scene3 scene-fade-in interpolation

**Check:** 6c (Named Bézier easing)  
**File:** `src/Archon/scenes/Scene3.tsx`, lines 72–75

The `sceneOpacity` interpolation uses no `easing` option, so it defaults to `Easing.linear`:

```ts
const sceneOpacity = interpolate(frame, [0, Math.round(0.3 * fps)], [0, 1], {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
  // ← no easing; defaults to linear
});
```

Compare with Scene1 and Scene4 which correctly apply `Easing.bezier(EASE_ENTER[...])` to their entrance fades. Linear easing on a short scene-fade is visible as a mechanical ramp and inconsistent with the rest of the composition.

**Required fix:** Add `easing: Easing.bezier(EASE_ENTER[0], EASE_ENTER[1], EASE_ENTER[2], EASE_ENTER[3])`.

**Severity:** LOW — minor visual inconsistency; linear over 0.3 s is subtle but detectable.

---

## LOW — Scene2 flow-diagram nodes below visual-diagrams minimum height

**Check:** 17 (Node/connection styling follows visual-diagrams rules)  
**File:** `src/Archon/scenes/Scene2.tsx`, line 17

```ts
const NODE_W = 180;   // minimum per visual-diagrams: 200px
const NODE_H = 90;    // minimum per visual-diagrams: 100px  ← below threshold
```

The visual-diagrams rulecheck scanner flags any node with `height < 100px`. At 90 px the five diagram nodes (Trigger, YAML Workflow, AI Node, Bash Node, Result) risk being too short to comfortably accommodate the two-line label + icon layout, especially at export resolutions below 1080p.

**Required fix:** Increase `NODE_H` to at least 100 (recommended: 110–120) and adjust vertical centering of node positions accordingly.

**Severity:** LOW — visual quality concern; nodes still render but are undersized per the design system spec.

---

## LOW — Orphaned Scene5.tsx contains source-page reference

**Check:** 7f (No source-page references), Repo hygiene  
**File:** `src/Archon/scenes/Scene5.tsx`

`Scene5.tsx` is **not imported** anywhere in `Archon.tsx` or `index.ts` and is therefore never rendered. However, it is present in the composition directory and displays `github.com/coleam00/Archon` — the source repository URL — as on-screen text. This violates the marketing-mode rule against source-page references.

Even though it does not affect video output today, it could be accidentally re-introduced in a future iteration and would immediately be a HIGH violation. The file appears to be a leftover draft from an earlier CTA design.

**Required fix:** Delete `src/Archon/scenes/Scene5.tsx`. If a secondary CTA screen is later needed, it should be built fresh without source-page URLs.

**Severity:** LOW — no current video impact (file not used), but constitutes hygiene debt and a latent HIGH risk.

---

## Summary

| Severity | Count | Issues |
|---|---|---|
| CRITICAL | 0 | — |
| HIGH | 1 | Music not ducked during narration |
| MED | 1 | Systematic raw frame literals in Scene2 diagram stagger |
| LOW | 3 | Scene3 linear easing on fade-in; Scene2 node height < 100px; orphaned Scene5 |

**Verdict: `needs-iteration`** — the HIGH music-ducking issue must be resolved before this composition ships. The MED frame-literal issue should be addressed in the same pass. LOW findings can be bundled or deferred.
