# Video Speedup Rule

**Speedup is always an `ffmpeg` post-process on the rendered MP4. Never re-TTS, never re-render.**

When the user asks to speed up a video (e.g. "speed it up to 1.1x", "make this 1.2x", "20% faster"), the only acceptable path is `ffmpeg` operating on `videos/<slug>/out/<slug>.mp4`:

```bash
ffmpeg -y -i videos/<slug>/out/<slug>.mp4 \
  -filter_complex "[0:v]setpts=PTS/<N>[v];[0:a]atempo=<N>[a]" \
  -map "[v]" -map "[a]" \
  -c:v libx264 -preset slow -crf 18 \
  -c:a aac -b:a 192k -movflags +faststart \
  videos/<slug>/out/<slug>-<N>x.mp4
```

The sped output keeps the speed as a postfix: `<slug>-1.08x.mp4`, `<slug>-1.12x.mp4`, etc. The base render `<slug>.mp4` stays untouched as the 1.0× source — never overwrite it. The deliverable for upload is the postfixed file.

`atempo=<N>` preserves audio pitch. `setpts=PTS/<N>` adjusts video timing. They must use the same `<N>` so audio and video stay in sync. For factors above 2.0, chain atempo: `atempo=2.0,atempo=1.25` for 2.5×.

## What NOT to do

- **Do NOT** edit `ELEVENLABS_SPEED` (or `ELEVENLABS_SPEED_SHORTS`) in `.env`.
- **Do NOT** regenerate `narration.wav` via `scripts/elevenlabs-tts.py`.
- **Do NOT** retime any `compositions/scene-*.html` `data-start` values or slot anchors.
- **Do NOT** re-render through `npx hyperframes render`.

## Why

The HyperFrames pipeline is: TTS → transcript → scene timing → render. Changing TTS speed invalidates every downstream step — every scene's `data-start`, every card-entry `at:` value inside the GSAP timelines, every slot anchor, every crossfade time in `index.html`, and `TOTAL_DURATION`. That's a ~6 minute re-render plus an ~$0.30 ElevenLabs API call, plus the manual retiming work to re-extract word offsets from the new transcript and propagate them across 8 scene files.

ffmpeg's `setpts` + `atempo` does the same thing in seconds, on a file that's already correct, without touching any source. It is the right tool for this job.

## Don't break the source / render alignment

If you've already (incorrectly) regenerated `audio/narration.wav` at the new speed, the source is now divergent from the rendered MP4 (which has the old speed baked in). If the user later re-renders through HyperFrames they'll get a broken video. Before doing anything else:

1. Revert `.env` to the prior speed (typical default: `ELEVENLABS_SPEED=1.05`).
2. Either regenerate `narration.wav` at the original speed (re-run TTS, costs another API call) **or** explicitly note the divergence to the user so they don't re-render.
3. Then proceed with the ffmpeg post-process on the existing rendered MP4.

## Reverse direction (slowing down)

Same pattern. `<N>` < 1.0 slows the video. e.g. 0.9 = 10% slower. atempo accepts 0.5 ≤ N ≤ 2.0; for slower than 0.5 chain it (`atempo=0.5,atempo=0.8` for 0.4×).

## When to skip this rule

The only case where TTS speed should change at the `.env` level is when the user is **starting a new video** and explicitly wants a different default narration pace going forward. That is a different request — not a "speed it up" of an existing rendered video.
