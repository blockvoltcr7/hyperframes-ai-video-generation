---
description: Spawn a previewable HyperFrames Short from templates/shorts/classic with research-grounded script + ElevenLabs TTS, paced to a target duration
argument-hint: (no arguments — reads slug/topic/duration from $parse-input.output)
---

# Create Classic Short

**Workflow ID**: $WORKFLOW_ID
**Artifacts directory**: $ARTIFACTS_DIR

---

## Inputs (from upstream nodes)

The `parse-input` script node has already normalized the user's message into a
JSON object. Access the fields via dot notation -- Archon substitutes them at
invocation time:

- **Topic**: `$parse-input.output.topic`
- **Slug**: `$parse-input.output.slug`
- **Duration target (seconds)**: `$parse-input.output.duration`
- **Title (rough)**: `$parse-input.output.title`

The `precheck` bash node has already confirmed that `templates/shorts/classic/`
exists and that `videos/$parse-input.output.slug/` does NOT exist. You can
proceed without re-verifying those facts.

Echo the inputs in your first message so the user sees what's being built.

---

## Mission

Spawn a previewable HyperFrames Short at `videos/$parse-input.output.slug/` in
the Classic dev-tool dark aesthetic (bright blue + sky blue + soft indigo + teal,
deep navy canvas). Narration must clock in at approximately
**$parse-input.output.duration seconds** (+-10%). The composition must lint
clean, inspect clean, and open in `hyperframes preview` at the end.

**You MUST NOT auto-render.** The user always triggers `npx hyperframes render`
manually. Stop at preview.

**You MUST NOT fabricate facts.** Every stat, date, URL, version, and quote in
the script must trace to a real source -- `WebSearch` / `WebFetch` the topic
before writing anything quantitative. If the topic is too niche to verify, ask
the user for a source URL before drafting (use one short clarifying question;
don't loop).

**You MUST NOT modify `templates/shorts/classic/` itself.** Only edit the
copy under `videos/$parse-input.output.slug/`.

**You MUST replace the placeholder strings.** Before finishing, ensure:
- `YOUR BRAND` in the top banner is replaced with a brand name that fits the video topic.
- `your-domain.com` in Phase 4 is replaced with the real URL for the video's subject.
  If no real URL exists for the topic, use a plausible placeholder and note it in the report.

---

## Authoritative Playbook

The end-to-end recipe lives at
[`.claude/skills/diy-yt-creator/new-classic-short.md`](../../.claude/skills/diy-yt-creator/new-classic-short.md).
**Read it now, in full.** It covers every step in detail: template copy,
`meta.json` update, script drafting rules, hero-word fit constraints,
TTS voice picker, transcript-driven phase boundary computation, the exact
`index.html` edit order, lint/inspect fix table, and the report format.

---

## Duration Discipline ($parse-input.output.duration second target)

For a **30-second default** target, map narration to the four phase
archetypes roughly as follows. Scale linearly for other targets:

| Phase | Share of total | At 30s | Narration content |
|---|---|---|---|
| 1 -- Hero hook | ~22% | ~6.5s | Mono overline, secondary line, ONE slam word, caption pill |
| 2 -- Stat row | ~22% | ~6.5s | Mono overline, headline, two stat pills with real numbers |
| 3 -- Cards | ~33% | ~10s | Mono overline + 3 labeled cards |
| 4 -- CTA | ~17% | ~5s | Mono overline, URL pill, subscribe pill |
| Tail (no narration) | ~6% | ~1.5s | Reading time on the held final frame |

These are guidelines -- let the topic's natural cadence drive the actual
seconds per phase. Total narration MUST land within +-10% of the target.
If the topic is too rich to fit, narrow the angle rather than running long.

**Speaking-rate reference**: ElevenLabs in single-call mode at `SPEED_SHORTS=1.15`
delivers roughly **2.3 words per second** of comfortable English with
`<break time="0.35s"/>` between sentences. For a 30s target, budget ~70 words
of narration (+-10). For 45s, ~105 words. For 60s, ~140 words. SSML break tags
add ~3-4s of silence to a typical 4-phase short on top of spoken words.

---

## Step-by-step

Follow the playbook at
`.claude/skills/diy-yt-creator/new-classic-short.md` in order. The exact
parameter substitutions for THIS run are:

- Step 1 (slug + title) -- already done. Use `$parse-input.output.slug` and
  the title `$parse-input.output.title` (refine to a punchier headline if
  the rough title is awkward).
- Step 2 (copy template) -- run:
  ```bash
  cp -r templates/shorts/classic "videos/$parse-input.output.slug"
  ```
  PowerShell: `Copy-Item -Recurse templates/shorts/classic videos/$parse-input.output.slug`
- Step 3 (meta.json) -- overwrite with:
  ```json
  {
    "id": "$parse-input.output.slug",
    "name": "<refined title>"
  }
  ```
- Step 4 (draft the script) -- target ~`$parse-input.output.duration` seconds
  of narration per the duration table above. Save to
  `videos/$parse-input.output.slug/script.txt`.
- Step 4.5 (ground in real source content) -- REQUIRED for any quantitative
  claim. Use `WebSearch` first to find authoritative sources, then `WebFetch`
  to read them. Cross-check every stat / date / quote.
- **Pre-step (TTS pronunciation pass -- MANDATORY before TTS).** Before the
  TTS API call, audit the script against three sources, in narrowest-wins
  order:
  1. **`templates/shorts/classic/PRONUNCIATION.md`** -- generic dev-ecosystem
     token decisions (AI / API / LLM / MCP / RAG / CLI / IDE / JWT / etc.).
     This file overrides the generic rules.
  2. **`.claude/rules/tts-pronunciation.md`** -> "Acronym vs Word --
     disambiguation for brand / workflow tokens".
  3. **`.claude/rules/tts-pronunciation.md`** -> "Tech & brand pronunciation
     pitfalls" table.

  Prepend the leading HTML comment from `PRONUNCIATION.md` to
  `videos/<slug>/script.txt`.

- Step 5 + 6 (TTS + transcript, single command) -- **this workflow uses
  ElevenLabs production voice** loaded from the user's `.env`. Run:
  ```bash
  python scripts/elevenlabs-tts.py videos/$parse-input.output.slug --shorts --no-chunk
  ```
  The script reads `videos/<slug>/script.txt`, writes
  `videos/<slug>/audio/narration.wav` and `videos/<slug>/transcript.json`
  (word-level timestamps from ElevenLabs's `with-timestamps` endpoint).

  Required env (loaded from `.env` via `python-dotenv` -- already configured
  at both `.env` and `~/.archon/.env`):
  - `ELEVENLABS_API_KEY`
  - `ELEVENLABS_VOICE_ID`
  - `ELEVENLABS_MODEL_ID` (e.g. `eleven_multilingual_v2`)
  - Optional voice settings: `ELEVENLABS_STABILITY`,
    `ELEVENLABS_SIMILARITY_BOOST`, `ELEVENLABS_STYLE`,
    `ELEVENLABS_USE_SPEAKER_BOOST`

  If `elevenlabs` or `python-dotenv` is missing, surface the install command
  to the user and stop:
  ```bash
  pip install elevenlabs python-dotenv
  ```

- Step 7 (compute phase boundaries) -- run:
  ```bash
  python scripts/compute_timings.py videos/$parse-input.output.slug
  ```
  Show the user the computed values in your interim status update so they
  can spot-check.

- Step 8 (edit `index.html`) -- follow the 14 sub-steps in the playbook
  exactly. **Run `/hyperframes` first** (the skill encodes the framework
  rules). Pay particular attention to:
  - The hero word fit rule (<=7 wide chars at 200px; drop font-size to
    160-180px for 8-10 char words).
  - The bright-blue->sky-blue gradient text-fill appears on AT MOST one
    element per video. The hero slam carries it; subsequent slams use solid
    accents.
  - Replace `YOUR BRAND` with the brand or product name relevant to the video.
  - Replace `your-domain.com` with the real URL for the video's subject.

- Step 9 (lint) -- `npx hyperframes lint videos/$parse-input.output.slug`
  must report 0 errors. Iterate fixes from the playbook's error table
  until clean.

- Step 10 (inspect) --
  `npx hyperframes inspect videos/$parse-input.output.slug` must show no
  layout overflow. Common overflows: hero word too wide, stat-pill labels
  >18 chars, card titles too long. Fix at content level (shorten words)
  before adjusting CSS.

- Step 11 (preview) -- run in the **background** so the studio stays open:
  ```bash
  npx hyperframes preview videos/$parse-input.output.slug
  ```
  Capture the URL it prints (read the port from CLI output -- the port
  may shift if 5173 is taken).

- Step 12 (report) -- see the report format below.

---

## Required outputs

Before declaring the workflow complete, all of the following MUST be true:

- [ ] `videos/$parse-input.output.slug/script.txt` exists, paced to
      `$parse-input.output.duration` +-10% (~`$parse-input.output.duration` x 2.5 words).
- [ ] `videos/$parse-input.output.slug/audio/narration.wav` exists and is non-empty.
- [ ] `videos/$parse-input.output.slug/transcript.json` exists and contains
      word-level timestamps.
- [ ] `videos/$parse-input.output.slug/index.html` has been edited:
      `YOUR BRAND` replaced; `your-domain.com` replaced; every placeholder
      replaced with real content; transition timestamps, slam-shake offsets,
      and gradient drift anchor all recomputed from the transcript;
      `<audio id="narration">` wired.
- [ ] `videos/$parse-input.output.slug/meta.json` has the real slug and
      refined title.
- [ ] `npx hyperframes lint videos/$parse-input.output.slug` -> **0 errors**.
- [ ] `npx hyperframes inspect videos/$parse-input.output.slug` -> **no overflow**.
- [ ] `npx hyperframes preview videos/$parse-input.output.slug` was
      launched in the background and the URL was captured.

If any item fails, fix it before reporting. **Don't claim success on a
half-built composition.**

---

## Artifact write-back

Write a short summary of what was built to
`$ARTIFACTS_DIR/create-classic-short-summary.md`. Include:

```markdown
# create-classic-short -- $parse-input.output.slug

- **Topic**: $parse-input.output.topic
- **Duration target**: $parse-input.output.duration s
- **Actual narration length**: <X.X> s (from transcript)
- **Total composition length**: <Y.Y> s
- **Voice**: (voice id from .env)
- **Preview URL**: http://localhost:<port>
- **Render command** (manual): `npx hyperframes render videos/$parse-input.output.slug -o videos/$parse-input.output.slug/out/$parse-input.output.slug.mp4`
- **Brand name used**: (what you replaced YOUR BRAND with)
- **CTA URL used**: (what you replaced your-domain.com with)
- **Sources used** (one per claim):
  - <URL 1 -- what it backed>
  - <URL 2 -- what it backed>
- **Content tradeoffs** (if any): e.g. "shortened slam word from BREAKTHROUGH to MAJOR for 200px fit"
```

---

## Final report to the user

End with one concise message:

```
videos/$parse-input.output.slug/ ready for preview.

- Topic: $parse-input.output.topic
- Duration: <total_duration>s (target was $parse-input.output.duration s)
- Voice: (voice id from .env)
- Preview: <localhost URL>

Render manually with:
  npx hyperframes render videos/$parse-input.output.slug -o videos/$parse-input.output.slug/out/$parse-input.output.slug.mp4

Sources:
  - <URL 1>
  - <URL 2>

<one-line note on any content tradeoff, if any>
```

Stop. Do not render. Do not push. Wait for the user to iterate or
trigger render themselves.
