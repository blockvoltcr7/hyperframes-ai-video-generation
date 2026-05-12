---
paths:
  - "**/index.html"
  - "**/*.py"
---

# Audio Design Rules — HyperFrames

Canonical audio rules for HyperFrames compositions. Loads automatically when editing
`index.html` or any `*.py` script. Source of truth for SFX volume caps, cue→file
mapping, the no-BG-music-on-Shorts rule, and the alignment audit.

**Cross-references:**

- Per-template cue summary: [`templates/shorts/anthropic/DESIGN.md`](../../templates/shorts/anthropic/DESIGN.md)
  (§ Audio / SFX Cues)
- Cue file catalog: [`shared/audio/MANIFEST.md`](../../shared/audio/MANIFEST.md)
- SFX library generator: [`scripts/generate-sfx-library.py`](../../scripts/generate-sfx-library.py)
- Per-video sync hook: [`scripts/sync-video-sfx.sh`](../../scripts/sync-video-sfx.sh)

If a volume in a template's `DESIGN.md` disagrees with this file, **this file wins** —
update the template to match.

---

## Volume Levels (Research-Backed)

HyperFrames `<audio>` elements declare playback gain via `data-volume="<linear>"`.
The framework consumes this attribute directly. There is no JS volume-curve API
and no per-frame interpolation over volume — pick a single value per `<audio>`.

| Context                       | `data-volume` | Approximate dBFS |
| ----------------------------- | ------------- | ---------------- |
| Narration target              | `1.0`         | -12 dB peak      |
| Music during explanation      | `0.07`        | -20 to -23 dB    |
| Music during hook/CTA         | `0.12`        | -15 to -18 dB    |
| Sonic logo                    | `0.6`         | distinct, not jarring |

**NEVER** use lyrical music under narration (proven comprehension harm).

Long-form music is currently **TBD** in this repo — see "Multi-Segment Background
Music — TBD" below.

---

## Anthropic Shorts — Default Cue Set (Transition-Whoosh Only)

For the `templates/shorts/anthropic/` family, the **default** SFX set is *only*
`cinematic-whoosh` on phase transitions — no per-element impact-slams, scale-slams,
spring-pops, pops, screen-shakes, glitch-zaps, strike-crosses, or sonic-logo. Per-element
SFX read as cluttered against the calm dark-stage aesthetic and compete with narration.
They are opt-in for a single deliberate moment when a stat / pivot / hero word
unambiguously needs the punctuation. This is enforced in `templates/shorts/anthropic/DESIGN.md`
§ Audio / SFX Cues and in the `new-anthropic-short` playbook step 14.

### Whoosh placement on phase transitions (HARD)

Every `cinematic-whoosh` MUST fire at the **visual phase transition moment** — the
exact `sceneT` (`T1`, `T2`, …) used by your `tl.to("#phaseN", …)` transition.
Do NOT pre-roll it to `sceneT - 0.4`. Although the shape-backdrop reposition tween
schedules its motion at `sceneT - 0.4`, the audible whoosh peak should align with
the visual swap that the viewer perceives, not with the shape motion start. This
matches the production pattern in `videos/claude-code-v2126-short/` and
`videos/claude-code-v2128-133-short/`, and is the listening-test ground truth.

`data-duration` MUST be **1.5s** — long enough to expose the whoosh's full
natural decay tail past the 0.836s source-file length. A shorter duration
(0.84) clips the tail and makes the whoosh feel weak or "missing" — that was
the bug in the 2026-05-10 `videos/5-claude-skills-viral-short/` build before
this rule was clarified.

```html
<!-- WRONG — whoosh fires 0.4s before the visual transition, masked by narration -->
<audio id="sfx-whoosh-t1" class="clip" src="assets/sfx/cinematic-whoosh.mp3"
       data-start="6.1" data-duration="0.84" data-track-index="3" data-volume="0.11"></audio>

<!-- RIGHT — whoosh fires together with the visual phase swap, natural decay tail -->
<audio id="sfx-whoosh-t1" class="clip" src="assets/sfx/cinematic-whoosh.mp3"
       data-start="6.5" data-duration="1.5"  data-track-index="3" data-volume="0.11"></audio>
```

Drift here is `> 0.15s` (the bug threshold elsewhere in this file), so an unaligned
whoosh IS a defect, not a stylistic choice. If a future helper repositions shapes
at a different offset, update the whoosh `data-start` to match it — the contract
is "whoosh fires WHEN shapes start moving", not "whoosh fires at sceneT - 0.4".

---

## SFX Volume Caps (MANDATORY)

**SFX must NEVER exceed `data-volume="0.25"`** (sonic-logo is the single exception
and is not a per-scene SFX). Narration peaks at ~-6 dBFS; SFX must sit at -18 to
-24 dBFS (12-18 dB below voice) to feel balanced. Anything above 0.25 makes SFX
as loud as or louder than the voice and destroys the listening experience.

**Linear amplitude → dB cheat sheet** (relative to narration peak at -6 dBFS):

- `0.25` ≈ -12 dB below voice (-18 dBFS) — hard cap, only for the loudest impact moment in a scene
- `0.20` ≈ -14 dB below voice (-20 dBFS) — hero hit (impact-slam, scale-slam)
- `0.15` ≈ -16 dB below voice (-22 dBFS) — standard SFX hit
- `0.12` ≈ -18 dB below voice (-24 dBFS) — pivot accent (glitch-zap)
- `0.10` ≈ -20 dB below voice (-26 dBFS) — subtle / ambient SFX
- `0.05` ≈ -26 dB below voice (-32 dBFS) — texture, barely-there

**Rule:** if you are writing a `data-volume` for any SFX and it is above `0.25`,
lower it. No exceptions.

**Common violations to watch for** (all need to be lowered):

- Any SFX above `0.25` — drop to the per-cue default below.
- Default fallback values — never use `0.5`, `0.7`, or `0.35`. Use `0.15` as the
  unlisted-cue fallback.

---

## SFX Volume Table per Cue

This table is the canonical source. The cue-name column resolves directly to a
file in `shared/audio/sfx/<cue>.mp3`, copied into a video via
`bash scripts/sync-video-sfx.sh videos/<slug> <cue>`.

| Cue                | File                  | `data-volume` | Use for                                          |
| ------------------ | --------------------- | ------------- | ------------------------------------------------ |
| `impact-slam`      | `impact-slam.mp3`     | **0.15**      | Hero word reveal; pivot moment                    |
| `scale-slam`       | `scale-slam.mp3`      | **0.15**      | Stat-pill entrance; big number reveal             |
| `screen-shake`     | `screen-shake.mp3`    | **0.11**      | Hero word inline shake; layer with impact-slam    |
| `cinematic-whoosh` | `cinematic-whoosh.mp3`| **0.11**      | Phase / scene change                              |
| `spring-pop`       | `spring-pop.mp3`      | **0.11**      | Card or chip entrance                             |
| `pop`              | `pop.mp3`             | **0.10**      | Small chip / list item                            |
| `glitch-zap`       | `glitch-zap.mp3`      | **0.09**      | "BUT…" pivot, regression callout                  |
| `strike-cross`     | `strike-cross.mp3`    | **0.11**      | Strikethrough moment                              |
| `sonic-logo`       | `sonic-logo.mp3`      | **0.45**      | Brand stinger at composition start (optional)     |
| **fallback**       | (any unlisted cue)    | **0.11**      | Hard cap unless explicitly tuned                  |

> **Calibration history**: 2026-04-28 — all SFX volumes reduced 25% from the original calibration (0.20 → 0.15, 0.15 → 0.11, 0.13 → 0.10, 0.12 → 0.09, 0.60 → 0.45). The earlier values still met the 0.25 hard cap but felt too loud relative to narration in the actual mix. The hard cap of 0.25 is unchanged.

If a needed cue is missing from this table, **stop and propose adding it to
`shared/audio/MANIFEST.md`**. Do not invent a filename — the sync hook will fail
with a helpful message listing the actual library contents.

---

## Sonic Logo (OPTIONAL)

If a video uses the sonic-logo brand stinger, place it at composition start on its
own track:

```html
<audio id="sonic-logo"
       class="clip"
       src="assets/sfx/sonic-logo.mp3"
       data-start="0"
       data-duration="1.5"
       data-track-index="3"
       data-volume="0.45"></audio>
```

The 0.6 volume is allowed only here because the sonic-logo is meant to play
without competing narration (it sits in the cold-open silence before voice
arrives). It is **not** an excuse to push other SFX above the 0.25 cap.

This is **opt-in**. The linter does not enforce a sonic-logo on every
composition. Older Remotion videos enforced it; HyperFrames does not.

---

## Shorts Have NO Background Music (HARD RULE)

**Shorts (1080×1920 vertical, single mutex-phase compositions) MUST NOT play any
background music.** Narration + SFX + (optional) sonic-logo only. Even ambient pads
at `data-volume="0.05"` compete with the dense narration in a Short and feel
cluttered. User finds BG music annoying in the format.

**What this means in HTML:** do NOT add any `<audio src=".../bg-music*.mp3">`,
`<audio src=".../music*.mp3">`, or any element pulling a music file into a Short
composition. Phase 3.2 of `/diy-yt-creator:full-auto` may still GENERATE music
files for long-form, but the Short's `index.html` MUST NOT reference them.

If a future user explicitly asks for music in a specific Short, override this
default for that one video — never auto-add it.

Long-form templates (1920×1080) do support multi-segment BG music — see
"Multi-Segment Background Music — TBD" below.

---

## SFX Must Be Aligned to Their Visual Triggers (Audit After Composition Build)

Every SFX `<audio>` element in `index.html` must fire at the **same moment** as its
visual trigger. After the composition is built, run a systematic audit — close is
not good enough.

**Alignment formula (seconds-native):**

- Visual trigger time: read from the GSAP timeline (`tl.from("#hero", { ... }, T)`
  fires at `T` seconds; `T` itself usually derives from
  `transcript.json[<word_index>].start`).
- SFX `data-start`: must equal the visual trigger time, optionally minus a small
  lead-in (≤ 0.10s) when the cue has an attack-onset offset (a deep impact-slam
  with 80ms of pre-attack thump should fire ~0.05s before the visual hit).

**Audit rule:**

- **Drift > 0.15s (≈ 5 frames at 30fps) is a bug.** Sounds firing a quarter-second
  after their visual is immediately noticeable.
- Drift between `0.05s` and `0.15s` is acceptable for non-percussive cues
  (whoosh, ambient texture). Percussive cues (impact-slam, scale-slam,
  screen-shake) must be within `0.05s`.

**Common mistakes:**

- Using approximate timestamps ("~9.0s") instead of the exact `transcript.json`
  word `start`. Always pull the value programmatically.
- Forgetting that scene `data_start` shifted after a re-pacing — both the GSAP
  trigger and the SFX `data-start` need to track the new offset.
- Mixing inline shake offsets (visual) with SFX `data-start` (audio) without
  recomputing both from the same anchor word.

**How to apply:** after composition build, list every `<audio>` whose `id` starts
with `sfx-`, dump the `data-start` and the `data-track-index`, cross-reference
against the GSAP triggers in the script tag, and fix any cue whose drift exceeds
the bound above.

---

## Volume Control Mechanics

`data-volume` is the **only** mechanism for SFX gain in HyperFrames. Hard rules:

- Do **NOT** call `element.volume = …` from JS — the framework owns the audio
  pipeline; setting `volume` directly is overwritten or ignored at render.
- Do **NOT** animate volume via GSAP (`tl.to(audio, { volume: ... })`). The
  framework does not interpolate `<audio>` gain.
- Do **NOT** wrap `<audio>` in any custom Web Audio graph — HyperFrames will not
  pick up your gain node, and the rendered MP4 will play at element-level volume.
- If you need a fade-in or fade-out, generate the source SFX with the fade baked in
  (the SFX library is generated via ElevenLabs — re-prompt with "starts at zero"
  or "ends with a soft tail" rather than animating).

---

## Track-Index Assignment

Every timed element needs `data-track-index`. For the audio stack:

| Track index | Reserved for                                                |
| ----------- | ----------------------------------------------------------- |
| `2`         | Narration (the single `<audio id="narration">` element)     |
| `3`         | First SFX cue in any concurrent group                       |
| `4`         | Second concurrent SFX cue (e.g., layered pivot stack)       |
| `5+`        | Third / fourth concurrent SFX cue                           |

**Rules:**

- Same `data-track-index` clips **cannot overlap in time**. The HyperFrames lint
  emits `overlapping_gsap_tweens` (and similar) when two clips on the same track
  share a `[start, start+duration)` window.
- Sequential SFX may reuse a track index — e.g., three card-entrance pops on
  track `3` at `t=4.0`, `t=4.4`, `t=4.8` is fine (each is `~0.25s` long, no
  overlap).
- A "layered pivot" — `impact-slam` + `screen-shake` + `glitch-zap` all firing at
  `t=8.0` — needs three separate track indices (`3`, `4`, `5`).
- Sonic-logo, when present, sits on `3` because it plays in the cold-open before
  any other SFX.

---

## Multi-Segment Background Music — TBD (long-form only)

This repo currently ships only Shorts (1080×1920) which forbid BG music. The
legacy Remotion `audio-design.md` has a battle-tested multi-segment BG music
pattern (separate `bg-music-hook.mp3` / `bg-music-body.mp3` / `bg-music-cta.mp3`
files with BPM-driven volume curves and beat alignment). When a long-form
template (1920×1080) lands in `templates/long-form/`, this section will be
filled in and a `scripts/generate-bg-music.py` will mirror the SFX-library
generator pattern.

**Until then:** do not add BG music to any video in this repo.

## Beat Alignment — TBD (long-form only)

Same parking lot as BG music. Beat-alignment / downbeat snapping is a long-form
cinematic-hook feature. Not in scope for HyperFrames Shorts. When long-form
arrives, a beat-alignment helper will land here.

---

## Generation & Wiring (Pipeline Cheat Sheet)

1. **Generate or extend the library** (one-time per cue):

   ```bash
   python scripts/generate-sfx-library.py                    # generate any missing cues
   python scripts/generate-sfx-library.py --force --only impact-slam   # re-prompt one cue
   ```

   Files land in `shared/audio/sfx/`. Commit them — future agents must not need an
   API key to re-render existing videos.

2. **Sync into a video** (per video):

   ```bash
   bash scripts/sync-video-sfx.sh videos/<slug> impact-slam scale-slam spring-pop
   ```

   Or list cues one-per-line in `videos/<slug>/sfx-cues.txt` and run without args.

3. **Wire the `<audio>` elements** (per video, in `index.html`, after the
   `<audio id="narration">` block, before `</div>` of `#root`):

   ```html
   <audio id="sfx-impact"
          class="clip"
          src="assets/sfx/impact-slam.mp3"
          data-start="1.55"
          data-duration="0.6"
          data-track-index="3"
          data-volume="0.15"></audio>
   ```

4. **Audit alignment** (post-build): see "SFX Must Be Aligned …" above.

5. **Lint** (always):

   ```bash
   npx hyperframes lint videos/<slug>
   ```
