# QA Findings — HowVectorDatabasesWork

**Run:** 865eba0c7457d38c5fd32d68e2e5ee11  
**Composition:** `HowVectorDatabasesWork`  
**Mode:** `idea`  
**Audio layers:** VOICED=true · MUSIC=true · SFX=true  
**Diagrams:** true (scene3 — flow)  
**Date:** 2026-05-03  
**Verdict:** ❌ needs-iteration

---

## Passing checks (summary)

| Check | Result |
|-------|--------|
| TypeScript compile (`tsc --noEmit`) | ✅ No errors |
| Composition registered in `compositions.gen.ts` | ✅ `howvectordatabaseswork_meta` present |
| `index.ts` exports valid composition meta w/ calculateMetadata | ✅ |
| Plan alignment: 4 scenes, correct IDs, transitions match plan | ✅ |
| Hook quality: no "Welcome/Today/In this video", ≤10 words | ✅ "Your database can't find 'similar'." (5 words) |
| Repo hygiene: isolated under `src/HowVectorDatabasesWork/`, no Root.tsx / shared edits | ✅ |
| Transitions via `@remotion/transitions` (slide for scene1→2, scene2→3; fade for scene3→4) | ✅ |
| Typewriter uses string slicing `HEADLINE.slice(0, charCount)` | ✅ |
| Named Bézier easing on all `interpolate()` calls | ✅ |
| Fonts via `@remotion/google-fonts/Inter` with weights + subsets | ✅ |
| Composed-progress pattern (single `progress` drives N properties) | ✅ |
| Voice `<Audio>` paths match manifest for all 4 scenes | ✅ |
| `calculateMetadata` drives duration from `getAudioDuration` (no hardcoded constants) | ✅ |
| No verbatim double-narration on screen | ✅ |
| Music `<Audio>` at composition level with `volume={0.2}` | ✅ |
| Music path matches manifest `music/HowVectorDatabasesWork.mp3` | ✅ |
| SFX: intro whoosh at frame 0, `durationInFrames=37` | ✅ |
| SFX: outro stinger at `durationInFrames - 45`, `durationInFrames=45` | ✅ |
| SFX: 3 transition ticks at scene boundaries, `durationInFrames=22` each | ✅ |
| No mid-scene SFX | ✅ |
| Diagram scene3: 5-node pipeline with staggered reveal, draw-on connections, index pulse | ✅ |
| Idea 7g: no prompt/user/meta references in narration or on-screen text | ✅ |
| Idea 7i: topical coherence — all 4 scenes advance "How Vector Databases Work" | ✅ |
| Idea 7j: final scene is a takeaway (use cases), not a CTA | ✅ |

---

## Issues

### HIGH-1 — Fabricated percentage in on-screen text [check 7h]

**File:** `src/HowVectorDatabasesWork/scenes/Scene3.tsx`  
**Location:** `NODES[2].sublabel = "skips 99%"` and the on-screen headline `"Indexes skip 99% of comparisons."`

**Problem:**  
The composition displays `"Indexes skip 99% of comparisons."` as both the scene headline and the "Index (HNSW)" node sublabel. `article-body.md` contains only the user's topic description and mentions no specific figures. The 99% figure does not appear in, and is not directly implied by, the article content (`"Core mechanics of vector databases — how they store, index, and query high-dimensional vectors"`). This is a concrete percentage with no grounding in the source material.

**Rule violated:** Idea mode check 7h — *"Concrete numbers, percentages, named products, named studies, testimonials, or usage stats that are NOT present or directly implied in article-body.md are HIGH-severity."*

**Fix:** Remove the specific percentage. Replace with a qualitatively accurate phrase, e.g. `"Indexes skip most comparisons."` (sublabel) and headline `"Indexes skip the vast majority of comparisons."` — or omit the statistic entirely.

---

### MED-1 — Missing `premountFor` on all TransitionSeries.Sequence elements [check 6d]

**File:** `src/HowVectorDatabasesWork/HowVectorDatabasesWork.tsx`  
**Lines:** all four `<TransitionSeries.Sequence>` elements

**Problem:**  
None of the four `<TransitionSeries.Sequence>` blocks declare a `premountFor` prop. Remotion's best-practice recommendation is that every Sequence declare `premountFor` so that upcoming scenes start rendering before they are visible, enabling smooth transitions. With `slide` and `fade` transitions between animated scenes (scatter plots, pipeline diagrams), the absence of premounting can cause visible frame drops at transition boundaries. Multiple misses = MED severity.

**Fix:** Add `premountFor={TRANSITION_FRAMES}` (or a small multiple thereof) to each `<TransitionSeries.Sequence>`:

```tsx
<TransitionSeries.Sequence durationInFrames={sceneDurations[0]} premountFor={TRANSITION_FRAMES}>
```

---

### LOW-1 — Raw frame literal > 30 in Scene3 node stagger [check 6e]

**File:** `src/HowVectorDatabasesWork/scenes/Scene3.tsx`  
**Location:** `NODES` array, entries `stagger: 27` and `stagger: 36`

**Problem:**  
`NODES[3].stagger = 27` (just under 30) and `NODES[4].stagger = 36` (over 30) are raw integer frame literals used directly in the interpolation window start:

```ts
interpolate(frame, [n.stagger, n.stagger + Math.round(0.5 * fps)], ...)
//                  ^^^ stagger=36 — raw literal > 30 frames
```

Per best practices, motion durations should be expressed as multiples of `fps` (e.g. `Math.round(1.2 * fps)`). The value `36 = Math.round(1.2 * 30)` would be equivalent and fps-portable.

**Fix:** Convert stagger values to fps-relative expressions:

```ts
const STAGGER = (i: number) => Math.round(i * 0.3 * fps); // or define per-node as 0.3*fps multiples
```

---

## Verdict

`needs-iteration` — 1 HIGH issue must be resolved before render:

- **HIGH-1**: Remove the fabricated "99%" statistic from Scene3 on-screen text and node sublabel.

MED-1 and LOW-1 should be addressed in the same iteration but do not block render independently.
