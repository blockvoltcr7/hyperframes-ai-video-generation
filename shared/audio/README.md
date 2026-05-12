# shared/audio/

Canonical SFX library for HyperFrames videos. Holds the audio cues every Short
in this repo can pull from — `impact-slam.mp3`, `cinematic-whoosh.mp3`,
`spring-pop.mp3`, etc.

Like [`shared/lib/`](../lib/), this is **copy-from**, not reference-from. The
HyperFrames bundler and preview server reject filesystem paths that escape a
project's directory (`isSafePath` / `safePath` in `@hyperframes/core` — see
[`shared/lib/README.md`](../lib/README.md) for the full constraint).

## Why copy, not reference?

A `<audio src="../../shared/audio/sfx/impact-slam.mp3">` in `videos/<slug>/index.html`:

- passes `npx hyperframes lint` silently (no rule checks the path)
- **404s in `npx hyperframes preview`** — the studio's `<base href>` is scoped
  to the project directory
- renders silent in `npx hyperframes render` — the bundler does not pull files
  outside the project root

So **never** point any runtime attribute (`<audio src>`, `<video src>`,
`<img src>`, `data-composition-src`, `<link href>`, `<script src>`) at
`../../shared/audio/...`. Copy the file in first, then reference the local copy.

## Layout

```
shared/audio/
├── README.md         ← this file
├── MANIFEST.md       ← cue catalog (cue name → file → default volume → use)
└── sfx/
    ├── impact-slam.mp3
    ├── scale-slam.mp3
    ├── screen-shake.mp3
    ├── cinematic-whoosh.mp3
    ├── spring-pop.mp3
    ├── pop.mp3
    ├── glitch-zap.mp3
    ├── strike-cross.mp3
    └── sonic-logo.mp3
```

## How to use a cue in a video

1. **Pick the cue** from [`MANIFEST.md`](./MANIFEST.md) — it lists every file,
   default volume, and recommended use case.

2. **Declare it in the video's plan/retention-strategy** as a `sfx_cues:` entry
   (see `.claude/commands/diy-yt-creator/phase3-5-retention.md` for the schema).

3. **Run the sync hook** to copy the file into your video's `assets/sfx/`:

   ```bash
   bash scripts/sync-video-sfx.sh videos/<slug> impact-slam scale-slam spring-pop
   ```

   Or list cues one-per-line in `videos/<slug>/sfx-cues.txt` and run without
   trailing arguments.

4. **Wire the `<audio>` element** in `videos/<slug>/index.html` per
   [`.claude/rules/audio-design.md`](../../.claude/rules/audio-design.md):

   ```html
   <audio id="sfx-impact"
          class="clip"
          src="assets/sfx/impact-slam.mp3"
          data-start="1.55"
          data-duration="0.6"
          data-track-index="3"
          data-volume="0.20"></audio>
   ```

   `src` is **always** the local copy (`assets/sfx/<cue>.mp3`), never the shared
   path.

## Don'ts

- **Don't** write `<audio src="../../shared/audio/sfx/foo.mp3">` — it will 404 in
  preview and render silent (see "Why copy, not reference?" above).
- **Don't** check in raw cue WAVs alongside the MP3s. The library is MP3-only
  for git-friendliness; `narration.wav` stays per-video.
- **Don't** mutate files in `shared/audio/sfx/` per video. If a video needs a
  custom variant, generate a new cue name (e.g. `impact-slam-soft`) and add it
  to the library + `MANIFEST.md` so other videos can reuse it.
- **Don't** exceed the volume cap — `data-volume` must stay ≤ `0.25` for any
  per-cue SFX (sonic-logo at `0.6` is the only documented exception). See
  [`.claude/rules/audio-design.md`](../../.claude/rules/audio-design.md).

## Adding a new cue

1. Add a row to [`MANIFEST.md`](./MANIFEST.md) with the proposed cue name, file,
   duration, default volume, and use case.
2. Add a `CUES = [...]` entry to
   [`scripts/generate-sfx-library.py`](../../scripts/generate-sfx-library.py)
   with the prompt and `duration_seconds`.
3. Run:

   ```bash
   python scripts/generate-sfx-library.py --only <cue-name>
   ```

   The script is idempotent — existing files are skipped unless you pass
   `--force`. New cues land in `shared/audio/sfx/<cue>.mp3`.
4. Listen, sanity-check the result. If the prompt produced the wrong character
   (e.g., reverb tail too long), tune the prompt and re-run with `--force --only`.
5. Commit the new `.mp3` and the `MANIFEST.md` row together.
