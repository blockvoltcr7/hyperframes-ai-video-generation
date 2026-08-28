# HyperFrames Composition Project

## Project-specific production contract

- This is the 90-second Luminous Color Vibe Skool lesson about Codex plugins. Preserve its six-scene story order, current scene timing, opaque instructional cards, captions, and local-only media paths.
- Use `$hyperframes`, `$hyperframes-core`, and `$hyperframes-cli` for every revision/review cycle. Use `$media-use` for image/video treatment changes and `$fish-audio-api` before changing Fish Audio synthesis or voice configuration.
- The current narration is Fish Audio `s2.1-pro` with the public voice `American Tech Review Voice`. Configuration lives in `fish-voice.json`; request text lives in `audio_request.json`; immutable per-line provenance lives in `assets/voice-fish/generation.json`.
- The current generated motion comes from the reviewed Fal/PixVerse artifacts recorded in `generated-video-plan.json` and `assets/generated/video/manifest.json`. Do not submit new paid jobs merely to retime or integrate an approved local clip.

## Fish Audio replacement workflow

1. Keep `FISH_AUDIO_API_KEY` or `FISH_API_KEY` only in the repository `.env`; never print it or copy it into this project.
2. Edit `audio_request.json` and `fish-voice.json` deliberately. A changed voice/model must use a new or archived ledger/output directory rather than mutating the existing ledger.
3. Generate and atomically integrate every line:

   ```bash
   node scripts/generate-fish-voice.mjs --ids all --commit
   ```

4. The commit gate rejects narration longer than its owning scene and updates `audio_meta.json`, `audio_engine_meta.json`, `audio_request.json`, and the six `<audio>` references in `index.html`.
5. Rebuild `caption_groups.json` and `compositions/captions.html` from the new `audio_meta.json` using the `$faceless-explainer` caption builder. Fish's native word timings are the source; do not reuse timings from the previous voice:

   ```bash
   node ../../.agents/skills/faceless-explainer/scripts/captions.mjs build --storyboard ./STORYBOARD.md --audio-meta ./audio_meta.json --hyperframes . --out ./caption_groups.json
   ```
6. Verify all six WAVs are mono PCM, 44.1 kHz, match the ledger hashes, and are referenced by `index.html` before running visual QA.

## Generated motion integration

- Scene 3 uses `assets/generated/video/install-invoke-motion-v1-17s.mp4` continuously for its full 17 seconds. It is a deterministic composition derivative of the canonical 15-second Fal output, not a new provider generation.
- Keep the canonical `install-invoke-motion-v1.mp4`. The plan and manifest must retain the source/derivative hashes, 30 fps frame counts, exact durations, transform, and purpose.
- The active scene-3 motion slot must not use an `<img>`, `poster`, or runtime playback-rate workaround. When media duration and scene duration differ, normalize a new local H.264/yuv420p derivative with seek-safe keyframes.
- After any motion edit, capture an early and late scene-3 frame and require no black/stale video extraction warning before the full strict transition check.

## Project verification and handoff

```bash
npm run check -- --json --strict --at-transitions
npx --yes hyperframes@0.8.16 snapshot --at 38,43.5
npx --yes hyperframes@0.8.16 preview --background --port 3004 --no-open
npx --yes hyperframes@0.8.16 preview --status
```

- Preview at `http://127.0.0.1:3004/#project/codex-plugins-luminous-skool`; never rewrite the host to `localhost`.
- Confirm the preview root returns HTTP 200 before browser handoff.
- Preview approval is not an exported MP4. Run `npm run render` only when the user explicitly requests a render.

## Skills — USE THESE FIRST

**Always invoke the relevant skill before writing or modifying compositions.** Skills encode framework-specific patterns (e.g., `window.__timelines` registration, `data-*` attribute semantics, shader-compatible CSS rules) that are NOT in generic web docs. Skipping them produces broken compositions.

**Doing anything with HyperFrames?** Start at `/hyperframes` — it tells you what HyperFrames can do and which skill or workflow handles your intent (make a video, TTS / BGM, prep footage, author / animate, render, install blocks), confirms your brief up front (the intent layer), and routes every "make me a…" request (a video, a deck, a composition port) to the right workflow. Read it first, especially when there's no project context to orient you. The workflows it routes to:

- `/product-launch-video` — any **website** URL or brief / script → a product launch / SaaS / promo video, or a site tour / showcase featuring the site's own captured visuals.
- `/faceless-explainer` — arbitrary text (topic / article / notes), **no URL, no website capture** → 60-90s faceless explainer.
- `/embedded-captions` — an existing talking-head video (MP4) → the same footage with captions / subtitles added (rail + embed, or pure-cinematic embed); the footage itself is untouched.
- `/talking-head-recut` — an existing talking-head / interview / podcast video (MP4) → the same footage **packaged with designed graphic overlays** (kinetic titles, lower-thirds, data callouts, pull-quotes, side panels, pip) synced to the transcript; the clip plays unchanged underneath. (Plain captions/subtitles → `/embedded-captions`.)
- `/pr-to-video` — a GitHub PR (URL / `owner/repo#N` / "this PR") → 30-90s code-change explainer (changelog / feature reveal / fix / refactor).
- `/motion-graphics` — a short (typically under 10s) design-led **motion graphic**, motion-is-the-message, no narration: kinetic type, a stat / number count-up, a chart, a logo sting, a lower-third / overlay, or an animated tweet / headline / captured-page highlight; rendered to MP4 or a transparent overlay. Longer / narrated / custom → `/general-video`.
- `/music-to-video` — a **music track** (audio file, video to pull audio from, or one generated from a mood brief) → beat-synced video (lyric / slideshow / kinetic promo). Music drives pacing; user-supplied images / videos are cut onto the same beat grid.
- `/slideshow` — a **presentation / pitch deck / interactive deck** — discrete slides, fragment reveals, branching, hotspot navigation, presenter mode. Output is a navigable deck, not a rendered video.
- `/general-video` — fallback for any other video (title card, longer brand / sizzle reel, multi-scene montage, static loop, custom composition) and the home of **companion mode** — co-create with the full HyperFrames toolbox; the original hyperframes authoring flow, any length.

**Porting an existing composition?** `/remotion-to-hyperframes` translates a Remotion (React) composition into HyperFrames HTML — a source migration, separate from the creation workflows above.

The domain skills (`/hyperframes-core`, `/hyperframes-animation`, `/hyperframes-keyframes`, `/hyperframes-creative`, `/hyperframes-cli`, `/media-use`, `/hyperframes-audio`, `/hyperframes-registry`, `/figma`) and the full capability map live inside `/hyperframes` — it is the single source of truth for which skill handles which intent.

**Changing how real footage or images look or reveal?** Load `/media-use` and read its `references/media-treatments.md` before editing, even when the request only says dark, flat, boring, retro, private, or “make the reveal cooler.” It governs how footage is treated, never whether media may be used. Use canonical media treatments and seek-safe motion; do not improvise equivalent CSS/SVG filters or overlays.

> **Tailwind v4 projects** (`hyperframes init --tailwind`): see `/hyperframes-core` → `references/tailwind.md`.

> **Skill missing or stale?** Run `npx hyperframes skills update <name>` to install/refresh
> the specific skill you need (the `/hyperframes` router does this automatically before
> entering a workflow), or bare `npx hyperframes skills update` to refresh the core set plus
> everything already installed — neither pulls the full set. Restart the agent session so
> newly installed skills load.

## Commands

```bash
npm run dev          # human-operated foreground preview (blocks until stopped)
npx --yes hyperframes@0.8.16 preview --background --port 3004 --no-open  # agent-safe persistent Studio preview
npx --yes hyperframes@0.8.16 preview --status                            # verify the persistent preview is listening
npx --yes hyperframes@0.8.16 preview --stop                              # stop it when review is finished
npm run check        # lint + runtime + layout + motion + contrast (one command)
npm run render       # render to MP4
npm run publish      # publish and get a shareable link
npx hyperframes lint --verbose  # include info-level findings
npx hyperframes lint --json     # machine-readable output for CI
npx hyperframes docs <topic> # reference docs in terminal
```

> **Agents must use the pinned `preview --background --port 3004 --no-open` command above for Studio handoff.** Do not rely
> on a shell/tool `run_in_background` wrapper around `npm run dev`: that foreground process
> remains owned by the invoking session and can disappear while the browser stays open,
> leaving refreshes at `ERR_CONNECTION_TIMED_OUT`. Verify with `preview --status`, keep it
> alive through review, and stop it explicitly with `preview --stop` afterward.

> **Pinned CLI version.** These scripts pin an exact `hyperframes@X.Y.Z` so this project re-renders identically over time. Weeks later that pin lags fixes shipped since. To move up: `npx hyperframes@latest upgrade --project . --check` (shows the delta), then `npx hyperframes@latest upgrade --project .` to rewrite the pins. Always unpinned — the pinned script re-runs the old version against itself.

## Documentation

**For quick reference**, use the local CLI docs command (no network required):

```bash
npx hyperframes docs <topic>
```

Topics: `data-attributes`, `gsap`, `compositions`, `rendering`, `examples`, `troubleshooting`

**For full documentation**, discover pages via the machine-readable index — do NOT guess URLs:

```
https://hyperframes.heygen.com/llms.txt
```

## Project Structure

- `index.html` — main composition (root timeline)
- `compositions/` — sub-compositions referenced via `data-composition-src`
- `meta.json` — project metadata (id, name)
- `transcript.json` — whisper word-level transcript (if generated)

## Linting — ALWAYS RUN AFTER CHANGES

After creating or editing any `.html` composition, **always** run the full check before considering the task complete:

```bash
npm run check
```

Fix all errors before presenting the result. Warnings should be reviewed before rendering.

## Key Rules

1. Every timed element needs `data-start` and a duration. `data-start` is what marks it as timed; `data-track-index` is an optional Studio display lane the render never reads
2. Give timed visual elements `class="clip"`. The framework keys visibility off `data-start`, not the class, but the shared `.clip` CSS is what gives a scene its full-frame box, and `lint` warns without it
3. Timelines must be paused and registered on `window.__timelines`:
   ```js
   window.__timelines = window.__timelines || {};
   window.__timelines["composition-id"] = gsap.timeline({ paused: true });
   ```
4. Videos use `muted` with a separate `<audio>` element for the audio track
5. Sub-compositions use `data-composition-src="compositions/file.html"` to reference other HTML files
6. Only deterministic logic — no `Date.now()`, no `Math.random()`, no network fetches
