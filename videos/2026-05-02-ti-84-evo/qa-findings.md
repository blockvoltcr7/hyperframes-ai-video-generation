# QA Findings — Ti84Evo

**Run:** fb6493f57f3ca75e6ad2d10ecf8fb28f  
**Date:** 2026-05-02  
**Mode:** hn | VOICED=true | MUSIC=true | SFX=true | DIAGRAMS=false  
**Verdict:** ✅ pass

---

## Checks Passed

| # | Check | Result |
|---|-------|--------|
| 1 | TypeScript compile (`tsc --noEmit`) | ✅ Zero errors |
| 2 | Composition `Ti84Evo` registered in `compositions.gen.ts`; `index.ts` exports valid meta | ✅ |
| 3 | Plan alignment — 4 scene IDs present; `calculateMetadata` drives duration from audio | ✅ |
| 4 | Hook quality — "Your classroom calculator just got 3× faster." (8 words, no Welcome/Today/In-this-video) | ✅ |
| 5 | Remotion best practices | See below |
| 6 | Repo hygiene — composition isolated under `src/Ti84Evo/`; `Root.tsx`, `compositions.gen.ts`, `src/shared/` untouched | ✅ |
| 6a | Transitions via `@remotion/transitions` — slide-left (×2) and fade match plan; `<TransitionSeries>` used throughout | ✅ |
| 6b | Typewriter via string slicing (`BEFORE.slice`, `HIGHLIGHT.slice`, `AFTER.slice`); no per-character opacity | ✅ |
| 6c | Named Bézier easing on every `interpolate()` call (`Easing.bezier(...)`) | ✅ |
| 6e | Frame literals >30 are all sourced from audio manifests (37/45/22 frames); internal stagger values <30 | ✅ |
| 6f | `Inter` loaded via `@remotion/google-fonts/Inter` with `weights: ['400','600','800']`, `subsets: ['latin']` | ✅ |
| 6g | Composed-progress pattern followed — each beat derives Y, opacity (and scale where needed) from one `progress` var | ✅ |
| 7a | No Hacker News / points / comments / source-publication references in any scene | ✅ |
| 7b | No CTA in final scene — ends on exam approvals + license value | ✅ |
| 8 | All 4 voiceover `<Audio>` paths match voice manifest (`voiceover/Ti84Evo/scene[1-4].mp3`) | ✅ |
| 9 | Duration source of truth is `calculateMetadata` → `getAudioDuration(staticFile(...))` via Mediabunny | ✅ |
| 10 | No verbatim double-narration — on-screen text is short headlines/stats, not full narration | ✅ |
| 11 | Music `<Audio src={staticFile("music/Ti84Evo.mp3")} …>` matches music-manifest path | ✅ |
| 12 | Music `volume={0.2}` matches manifest default; not unducked over narration | ✅ |
| 13 | Music placed at composition level (top of `<AbsoluteFill>`, outside all Sequences) | ✅ |
| 14 | Intro whoosh @ frame 0 (37 frames), outro stinger @ `durationInFrames - 45` (45 frames), 3 transition ticks each leading cut by 3 frames | ✅ |
| 15 | No mid-scene SFX beyond the 5 manifest cues | ✅ |

---

## Issues

### MED — Missing `premountFor` on multiple Sequences (Rule 6d)

**Location:** `src/Ti84Evo/Ti84Evo.tsx` (4× `TransitionSeries.Sequence`), `src/Ti84Evo/scenes/Scene2.tsx` (3× card `<Sequence>`), `src/Ti84Evo/scenes/Scene3.tsx` (2× bullet `<Sequence>`), `src/Ti84Evo/scenes/Scene4.tsx` (5× exam badge `<Sequence>`)

**Detail:** None of the `<TransitionSeries.Sequence>` wrappers (the four scene containers) nor the inner stagger `<Sequence>` elements declare `premountFor`. The best-practice rule requires `premountFor` on every `<Sequence>` and `<TransitionSeries.Sequence>`. A single miss is LOW; this is 14 misses across 4 files → escalated to MED.

**Suggested fix:** Add `premountFor={30}` (one second at 30 fps) to all scene-level `TransitionSeries.Sequence` components and a smaller value (e.g. `premountFor={10}`) to inner stagger Sequences so child components can pre-initialize before they enter the viewport.

---

## Counts

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH | 0 |
| MED | 1 |
| LOW | 0 |
