# Shorts final frame — thumbnail-grade hold required

Every vertical Short (`templates/shorts/<style>/`, every `videos/<slug>/` with a 1080×1920 canvas) MUST end on a **thumbnail-grade final frame** — a held still that, on its own with zero context, communicates the topic in under one second, stops the scroll, and makes someone tap.

The reason: Shorts loop. The final frame becomes the first frame on the next loop, the still YouTube shows when the viewer pauses, the still that gets screenshotted and shared, and frequently the still YouTube auto-picks as the entry thumbnail when one isn't manually uploaded. A weak last frame (CTA pill alone, fade-to-black, brand wordmark on empty background, "Subscribe →" with no topic context) loses the loop and the share.

## What the final frame MUST contain

All five, on screen at the same time, **held static for at least 1.5 seconds** before the Short ends:

1. **Topic statement** — the single most important phrase from the video, sized as the dominant element. Minimum 120px on canvas (recommended 140–200px). Not a question; a punchline. Examples: "CLAUDE CODE 2.0 IS HERE", "ARCHON BEATS CURSOR", "GEMINI 3 LEAKED".
2. **Visual anchor** — the hero icon, logo, version number, screenshot, or product mark that ties the topic to a recognizable thing. The viewer's eye must land on this within 200ms of pausing.
3. **Brand chrome** — the channel/brand wordmark or avatar, bottom-left or top-left corner, small but legible (≥ 40px logo height). This is what makes a screenshot trace back to the channel.
4. **Outcome / receipt** — one short line stating WHAT the viewer learns by watching (or learned, if they watched). Not a CTA. Examples: "5 features in 30 seconds", "the new default model", "what changed in 2.0". Min 36px, recommended 44–56px.
5. **Optional CTA pill** — "Watch the full video" / "Follow for more" — but the CTA NEVER occupies the dominant slot. The topic statement does. CTA, if present, sits below or to the side.

## What the final frame must NOT be

- ❌ A solo CTA pill ("Subscribe →") on an empty/dark background — the most common failure mode. The loop now opens with "Subscribe" instead of the topic, and a paused frame shows nothing about the video.
- ❌ Fade-to-black or fade-to-brand-color — dead air. A paused viewer sees a blank screen and scrolls.
- ❌ Brand wordmark/logo as the only large element — the viewer learns nothing about the topic from the still.
- ❌ A trailing animation (counter still rolling, marker still sweeping, shape still drifting). The thumbnail is a STILL — every motion must finish ≥ 0.3s before the hold begins.
- ❌ The same frame as the hero slam from the intro — feels lazy and gives the viewer no payoff. The end frame is the receipt; the intro is the question.
- ❌ A full-bleed quote with no visual anchor — text-only thumbs underperform.

## How to author it

Append a dedicated final phase (commonly `#phaseN-thumb` or `#phase-end`) AFTER the CTA / outro phase, OR enrich the existing CTA phase to satisfy all 5 requirements above. Either pattern works; the rule is on the resulting frame, not the phase count.

```html
<!-- Phase: thumbnail hold (last 2.0s of the Short) -->
<div id="phase-thumb" class="clip phase"
     data-start="28.0" data-duration="2.0" data-track-index="9">

  <!-- Brand chrome (top-left) -->
  <img id="thumb-brand" class="clip" src="assets/brand-mark.svg"
       data-start="0" data-duration="2" data-track-index="1"
       style="position:absolute; top:60px; left:60px; height:48px;">

  <!-- Topic slam (dominant) -->
  <div id="thumb-topic" class="clip"
       data-start="0" data-duration="2" data-track-index="2"
       style="position:absolute; top:580px; left:60px; right:60px;
              font-size:160px; font-weight:900; line-height:0.95;
              letter-spacing:-0.03em; color:var(--accent);">
    CLAUDE CODE<br>2.0 IS HERE
  </div>

  <!-- Visual anchor (version chip / icon) -->
  <div id="thumb-version" class="clip"
       data-start="0" data-duration="2" data-track-index="2"
       style="position:absolute; top:1080px; left:60px;
              font-size:88px; font-weight:800;
              padding:18px 36px; border-radius:24px;
              background:var(--accent); color:#000;">
    v2.0.14
  </div>

  <!-- Outcome receipt -->
  <div id="thumb-outcome" class="clip"
       data-start="0" data-duration="2" data-track-index="2"
       style="position:absolute; top:1280px; left:60px; right:60px;
              font-size:52px; font-weight:600; color:var(--fg-dim);">
    5 things that changed
  </div>

  <!-- CTA (subordinate) -->
  <div id="thumb-cta" class="clip"
       data-start="0" data-duration="2" data-track-index="2"
       style="position:absolute; bottom:120px; left:60px;
              font-size:46px; font-weight:700;
              padding:20px 40px; border-radius:9999px;
              background:#fff; color:#000;">
    Follow for more →
  </div>
</div>
```

The phase must enter via the standard whoosh+shape-rearrange transition (per the shape-backdrop default) and then **freeze** — every entrance animation finishes by `data-start + 0.5s`, leaving ≥ 1.5s of completely static hold.

## Hold duration & timing

- **Total final phase duration**: 2.0–2.5s recommended, 1.8s minimum.
- **Entrance animation budget**: ≤ 0.5s from phase start. After that, every element is at its final transform — no scale yoyos, no glow pulses, no shape drift.
- **Static hold**: ≥ 1.5s. This is the part that becomes the loop-pause thumbnail.
- **Total Short duration** is unaffected — this phase replaces or extends the existing CTA phase, it doesn't add length on top.

## Interaction with other rules

- **[`visual-pacing-5s.md`](./visual-pacing-5s.md)**: Explicitly relaxed for the final phase. The 5s static cap does NOT apply to the thumbnail-hold phase — that's its whole purpose. The relaxation applies ONLY to this terminal hold, capped at 2.5s. Anywhere else in the Short, the 5s rule still binds.
- **[`shorts-typography.md`](./shorts-typography.md)**: Sizes for the topic slam (≥120px), outcome (≥36px), CTA pill (≥44px), brand chrome (≥40px logo height) inherit from the typography minimums.
- **[`step-by-step-reveal.md`](./step-by-step-reveal.md)**: All thumbnail elements may enter together (within a 0.5s stagger). The thumbnail is a single composite, not an enumeration — quick stagger is correct here.

## Self-check before declaring a Short done

Pause the rendered MP4 on its very last frame and ask:

1. **Topic test**: Could a stranger paused on this frame, with no audio, no prior frames, name the video's topic in one sentence?
2. **Tap test**: Would this frame, shown as a tile in a YouTube Shorts feed, make a thumb-stopping viewer tap?
3. **Loop test**: When the Short loops and this frame becomes the opening frame for the next play, does it set up the topic — or does it confuse?
4. **Screenshot test**: If a viewer screenshots and shares this frame, does the share carry the channel + topic, or just a generic CTA?

If any answer is "no", the final frame fails the rule. Rework before render.

## Where this rule applies

- All vertical Shorts (`templates/shorts/<style>/`, every `videos/<slug>/` with 1080×1920 canvas).
- Includes derivatives — Anthropic, Archon, Google, news-explainer, claude-code-version, and any future shorts variants.

## Where this rule does NOT apply

- Long-form (`templates/long-form/<style>/`, 1920×1080). Long-form has YouTube end-screens and a manually uploaded thumbnail; the last frame plays a different role.
- A Short that ends on a deliberate cliffhanger as a creative choice — but flag the deviation explicitly in the video's `notes.md` so reviewers know it's intentional, not an oversight.
