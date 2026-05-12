---
description: Spawn a previewable HyperFrames Short from templates/shorts/archon with research-grounded script + ElevenLabs TTS, paced to a target duration
argument-hint: (no arguments — reads slug/topic/duration from $parse-input.output)
---

# Create Archon Short

**Workflow ID**: $WORKFLOW_ID
**Artifacts directory**: $ARTIFACTS_DIR

---

## Inputs (from upstream nodes)

The `parse-input` script node has already normalized the user's message into a
JSON object. Access the fields via dot notation — Archon substitutes them at
invocation time:

- **Topic**: `$parse-input.output.topic`
- **Slug**: `$parse-input.output.slug`
- **Duration target (seconds)**: `$parse-input.output.duration`
- **Title (rough)**: `$parse-input.output.title`

The `precheck` bash node has already confirmed that `templates/shorts/archon/`
exists and that `videos/$parse-input.output.slug/` does NOT exist. You can
proceed without re-verifying those facts.

Echo the inputs in your first message so the user sees what's being built.

---

## Mission

Spawn a previewable HyperFrames Short at `videos/$parse-input.output.slug/` in
the Archon dark-blue / cyan-magenta aesthetic. Narration must clock in at
approximately **$parse-input.output.duration seconds** (±10%). The composition
must lint clean, inspect clean, and open in `hyperframes preview` at the end.

**You MUST NOT auto-render.** The user always triggers `npx hyperframes render`
manually. Stop at preview.

**You MUST NOT fabricate facts.** Every stat, date, URL, version, and quote in
the script must trace to a real source — `WebSearch` / `WebFetch` the topic
before writing anything quantitative. If the topic is too niche to verify, ask
the user for a source URL before drafting (use one short clarifying question;
don't loop).

**You MUST NOT modify `templates/shorts/archon/` itself.** Only edit the copy
under `videos/$parse-input.output.slug/`.

---

## Authoritative Playbook

The end-to-end recipe lives at
[`.claude/skills/diy-yt-creator/new-archon-short.md`](../../.claude/skills/diy-yt-creator/new-archon-short.md).
**Read it now, in full.** It covers every step in detail: template copy,
`meta.json` update, script drafting rules, hero-word fit constraints,
TTS voice picker, transcript-driven phase boundary computation, the exact
`index.html` edit order, lint/inspect fix table, and the report format.

Sibling rules that the playbook depends on — read them too:

- [`CLAUDE.md`](../../CLAUDE.md) — repo-wide rules, especially key rules 1-13
  and "Hard rules across every command".
- [`.claude/rules/shorts-typography.md`](../../.claude/rules/shorts-typography.md) — minimum font sizes for the 1080×1920 canvas.
- [`.claude/rules/shorts-thumbnail-final-frame.md`](../../.claude/rules/shorts-thumbnail-final-frame.md) — the final frame MUST be thumbnail-grade.
- [`.claude/rules/step-by-step-reveal.md`](../../.claude/rules/step-by-step-reveal.md) — enumerated lists reveal item-by-item.
- [`.claude/rules/visual-pacing-5s.md`](../../.claude/rules/visual-pacing-5s.md) — never let the foreground stay static more than 5s.
- [`.claude/rules/tts-pronunciation.md`](../../.claude/rules/tts-pronunciation.md) — heteronym audit before TTS.

The `/hyperframes` skill encodes framework-specific patterns (timeline
registration on `window.__timelines`, phase mutex, `data-*` attribute
semantics, deterministic-only logic). Invoke it before editing
`index.html`.

---

## Duration Discipline ($parse-input.output.duration second target)

For a **30-second default** target, map narration to the four phase
archetypes roughly as follows. Scale linearly for other targets:

| Phase | Share of total | At 30s | Narration content |
|---|---|---|---|
| 1 — Hero hook | ~22% | ~6.5s | Mono overline, secondary line, ONE slam word, caption pill |
| 2 — Stat row | ~22% | ~6.5s | Mono overline, headline, two stat pills with real numbers |
| 3 — Workflow / item cards | ~33% | ~10s | Mono overline + 3 labeled cards |
| 4 — CTA | ~17% | ~5s | Mono overline, URL pill, subscribe pill |
| Tail (no narration) | ~6% | ~1.5s | Reading time on the held final frame |

These are guidelines — let the topic's natural cadence drive the actual
seconds per phase. Total narration MUST land within ±10% of the target.
If the topic is too rich to fit, narrow the angle rather than running long.

**Speaking-rate reference**: ElevenLabs in single-call mode at `SPEED_SHORTS=1.15`
delivers roughly **2.3 words per second** of comfortable English with
`<break time="0.35s"/>` between sentences. For a 30s target, budget ~70 words
of narration (±10). For 45s, ~105 words. For 60s, ~140 words. SSML break tags
add ~3-4s of silence to a typical 4-phase short on top of spoken words.

---

## Step-by-step

Follow the playbook at
`.claude/skills/diy-yt-creator/new-archon-short.md` in order. The exact
parameter substitutions for THIS run are:

- Step 1 (slug + title) — already done. Use `$parse-input.output.slug` and
  the title `$parse-input.output.title` (refine to a punchier headline if
  the rough title is awkward).
- Step 2 (copy template) — run:
  ```bash
  cp -r templates/shorts/archon "videos/$parse-input.output.slug"
  ```
  PowerShell: `Copy-Item -Recurse templates/shorts/archon videos/$parse-input.output.slug`
- Step 3 (meta.json) — overwrite with:
  ```json
  {
    "id": "$parse-input.output.slug",
    "name": "<refined title>",
    "dynamousPromotion": false
  }
  ```
- Step 3.5 (Dynamous promotion) — **skip the prompt**. This workflow does
  NOT ask interactively. Default to `"dynamousPromotion": false`. If the
  user wants the promotion wired, they should run the
  `/diy-yt-creator:new-archon-short` Claude Code skill instead — that path
  prompts.
- Step 4 (draft the script) — Branch B (inline drafting) only. Pipeline
  artifacts (`scripts/full-script.md`, `plan.md`,
  `retention-strategy.md`) will not exist on a fresh spawn. Target
  ~`$parse-input.output.duration` seconds of narration per the duration
  table above. Save to `videos/$parse-input.output.slug/script.txt`.
- Step 4.5 (ground in real source content) — REQUIRED for any quantitative
  claim. Use `WebSearch` first to find authoritative sources, then
  `WebFetch` to read them. For JS-rendered pages you can't reach via
  `WebFetch`, ask the user for a source URL or for the facts verbatim.
- **Pre-step (TTS pronunciation pass — MANDATORY before TTS).** Before
  the TTS API call, the script you generated in step 4 MUST be audited
  against three sources, in narrowest-wins order:
  1. **`templates/shorts/archon/PRONUNCIATION.md`** — Archon-specific
     token decisions (PIV / FIX / RVW / AI / PR / etc.). This file
     overrides the generic rules. Apply every override that matches a
     token in your draft script.
  2. **`.claude/rules/tts-pronunciation.md`** → "Acronym vs Word —
     disambiguation for brand / workflow tokens" (the decision tree
     for any uppercase short token NOT covered by the per-template
     map). The trap to avoid: do NOT uniformly space-out every
     uppercase 3-letter token. `FIX` is the English word, not an
     initialism — write `fix`. `RVW` is "review" — expand it.
  3. **`.claude/rules/tts-pronunciation.md`** → "Tech & brand
     pronunciation pitfalls" table (generic acronym + tech-term
     handling: `API` → `A P I`, `nginx` → `engine-x`, `npm` → `N P M`,
     etc.) — apply only if no narrower decision exists above.
  **Also invoke the `text-to-speech` skill** (`.claude/skills/text-to-speech/`)
  before issuing the TTS command — it carries the env-var conventions
  and ElevenLabs-specific guidance the `elevenlabs-tts.py` script
  depends on.
  Prepend the leading HTML comment from `PRONUNCIATION.md` (the
  "Required leading comment" section) to `videos/<slug>/script.txt`
  so future humans editing the script can see the decisions. The
  TTS scripts strip these comments before the API call, so they don't
  affect generated audio.

- Step 5 + 6 (TTS + transcript, single command) — **this workflow uses
  ElevenLabs production voice** loaded from the user's `.env`
  (`ELEVENLABS_VOICE_ID`, `ELEVENLABS_MODEL_ID`, voice settings, and
  `ELEVENLABS_SPEED_SHORTS` for the rate). Run:
  ```bash
  python scripts/elevenlabs-tts.py videos/$parse-input.output.slug --shorts
  ```
  The script reads `videos/<slug>/script.txt`, writes
  `videos/<slug>/audio/narration.wav` and
  `videos/<slug>/transcript.json` (word-level timestamps from
  ElevenLabs's `with-timestamps` endpoint). It uses chunked generation
  with delta regen by default — per-chunk WAV + sync JSON land in
  `videos/<slug>/audio/narration-chunks/`, and a SHA-256 of each
  chunk's text is tracked in `transcript-history.json` so re-runs only
  re-hit the API for changed chunks. **Do NOT run `npx hyperframes
  tts` or `npx hyperframes transcribe`** — this single call replaces
  both.

  The `--shorts` flag picks `ELEVENLABS_SPEED_SHORTS` (default 1.13)
  over `ELEVENLABS_SPEED` (default 1.10), matching the faster cadence
  the user prefers for vertical Shorts.

  Required env (loaded from `.env` via `python-dotenv` — already
  configured at both `.env` and `~/.archon/.env`):
  - `ELEVENLABS_API_KEY`
  - `ELEVENLABS_VOICE_ID`
  - `ELEVENLABS_MODEL_ID` (e.g. `eleven_multilingual_v2`)
  - Optional voice settings: `ELEVENLABS_STABILITY`,
    `ELEVENLABS_SIMILARITY_BOOST`, `ELEVENLABS_STYLE`,
    `ELEVENLABS_USE_SPEAKER_BOOST`
  - Optional pronunciation dict: `ELEVENLABS_PRONUNCIATION_DICT_ID` +
    `ELEVENLABS_PRONUNCIATION_DICT_VERSION_ID` (both required if used)

  Fallback path — if the user explicitly asks for the draft voice
  (e.g. ElevenLabs quota exhausted, faster iteration), use:
  ```bash
  python scripts/edge-tts-fallback.py videos/$parse-input.output.slug \
    --voice en-US-AndrewNeural --rate +10%
  ```
  Avoid `*MultilingualNeural` voices in edge-tts — they emit empty
  WordBoundary arrays and break the transcript step silently.

  If `elevenlabs` or `python-dotenv` is missing, surface the install
  command to the user and stop:
  ```bash
  pip install elevenlabs python-dotenv
  ```
- Step 7 (compute phase boundaries) — read
  `videos/$parse-input.output.slug/transcript.json` and compute
  `phase{1,2,3,4}_end`, `total_duration`, `T1/T2/T3`, `P2/P3/P4`,
  `slam_t`, and `shake_offsets` per the playbook's exact formulas. Show
  the user the computed values in your interim status update so they can
  spot-check.
- Step 8 (edit `index.html`) — follow the 15 sub-steps in the playbook
  exactly. **Run `/hyperframes` first** (the skill encodes the framework
  rules). Pay particular attention to:
  - The hero word fit rule (≤7 wide chars at 200px; drop font-size to
    160-180px for 8-10 char words).
  - The cyan→magenta gradient text-fill appears on AT MOST one element
    per video. The hero slam carries it; subsequent slams use solid
    accents.
  - No orange anywhere — orange has no role in the Archon palette.
  - The final phase MUST satisfy
    `.claude/rules/shorts-thumbnail-final-frame.md` — held still ≥1.5s
    with topic statement ≥120px, visual anchor, brand chrome, outcome
    line.
- Step 8.5 (lib pick) — skip unless the topic specifically needs a
  shared-lib block; the Archon template's inline patterns cover the
  default short.
- Step 9 (lint) — `npx hyperframes lint videos/$parse-input.output.slug`
  must report 0 errors. Iterate fixes from the playbook's error table
  until clean.
- Step 10 (inspect) — `npx hyperframes inspect videos/$parse-input.output.slug`
  must show no layout overflow. Common overflows: hero word too wide,
  stat-pill labels >18 chars, workflow card titles too long. Fix at
  content level (shorten words) before adjusting CSS.
- Step 11 (preview) — run in the **background** so the studio stays open:
  ```bash
  npx hyperframes preview videos/$parse-input.output.slug
  ```
  Capture the URL it prints (usually `http://localhost:5173`, but read
  from the CLI output — the port may shift if 5173 is taken).
- Step 11.5 (visual QA) — skip unless lint or inspect flagged warnings
  you couldn't fully resolve. The workflow's job is to ship a
  preview-ready short, not to spend a turn on advisory QA.
- Step 12 (report) — see the report format below.

---

## Required outputs

Before declaring the workflow complete, all of the following MUST be true:

- [ ] `videos/$parse-input.output.slug/script.txt` exists, paced to
      `$parse-input.output.duration` ±10% (~`$parse-input.output.duration` × 2.5 words).
- [ ] `videos/$parse-input.output.slug/audio/narration.wav` exists and is non-empty.
- [ ] `videos/$parse-input.output.slug/transcript.json` exists and contains
      word-level timestamps.
- [ ] `videos/$parse-input.output.slug/index.html` has been edited:
      every placeholder ("AGENTIC", "Built for parallel work.",
      "20 / workflows shipped", "PIV / FIX / RVW", "archon.diy" unless
      genuinely about Archon) replaced with real content; transition
      timestamps, slam-shake offsets, and gradient drift anchor all
      recomputed from the transcript; `<audio id="narration">` wired.
- [ ] `videos/$parse-input.output.slug/meta.json` has the real slug,
      refined title, and `"dynamousPromotion": false`.
- [ ] `npx hyperframes lint videos/$parse-input.output.slug` → **0 errors**.
- [ ] `npx hyperframes inspect videos/$parse-input.output.slug` → **no
      overflow**.
- [ ] `npx hyperframes preview videos/$parse-input.output.slug` was
      launched in the background and the URL was captured.
- [ ] The final phase satisfies the thumbnail-grade rule (topic ≥120px,
      anchor, brand chrome, outcome line, ≥1.5s held still).

If any item fails, fix it before reporting. **Don't claim success on a
half-built composition.**

---

## Artifact write-back

Write a short summary of what was built to
`$ARTIFACTS_DIR/create-archon-short-summary.md`. This is what the
workflow's `$create-short.output` will carry downstream and what the user
sees in the Archon run history. Include:

```markdown
# create-archon-short — $parse-input.output.slug

- **Topic**: $parse-input.output.topic
- **Duration target**: $parse-input.output.duration s
- **Actual narration length**: <X.X> s (from transcript)
- **Total composition length**: <Y.Y> s
- **Voice**: en-US-AndrewNeural (draft voice, edge-tts +10%)
- **Preview URL**: http://localhost:<port>
- **Render command** (manual): `npx hyperframes render videos/$parse-input.output.slug -o videos/$parse-input.output.slug/out/$parse-input.output.slug.mp4`
- **Sources used** (one per claim):
  - <URL 1 — what it backed>
  - <URL 2 — what it backed>
- **Content tradeoffs** (if any): e.g. "shortened slam word from WORKTREES to AGENTIC for 200px fit"
```

---

## Final report to the user

End with one concise message:

```
✅ videos/$parse-input.output.slug/ ready for preview.

- Topic: $parse-input.output.topic
- Duration: <total_duration>s (target was $parse-input.output.duration s)
- Voice: en-US-AndrewNeural (draft voice, edge-tts +10%)
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
