# new-classic-short -- Playbook

End-to-end pipeline that turns a **topic prompt** into a previewable HyperFrames Short in the Classic dev-tool dark aesthetic (bright blue + sky blue + soft indigo + teal, deep navy canvas). Zero manual steps; ends at preview, never renders.

This is the **default template playbook** -- use it for any topic that is not specifically Archon-workflow content or Anthropic/Claude content. The shape is identical to [new-anthropic-short.md](./new-anthropic-short.md) and [new-archon-short.md](./new-archon-short.md). If you have used either, the deltas are:

- Template: `templates/shorts/classic/` (instead of `templates/shorts/anthropic/` or `templates/shorts/archon/`)
- Palette: bright blue / sky blue / soft indigo / teal-green rotation (no Archon cyan/magenta, no Anthropic orange/cream)
- Hero slam: uses a bright-blue->sky-blue gradient text-fill with a 4s `background-position` drift. Use ONCE per video.
- Top banner: shipped as a CSS-rendered `<div id="top-banner-wordmark">` reading "YOUR BRAND" -- **this is a placeholder you MUST replace** with the brand or product name that fits the video topic.
- Default CTA URL: `your-domain.com` -- **this is a placeholder you MUST replace** with the real URL for the video's subject. Note it in the report if you use a topic-derived URL.

## Inputs

User provides ONE of:

- A **topic / prompt** (e.g. _"RAG pipeline explained"_, _"What is Kubernetes?"_) -- agent drafts the full script
- A **title + key facts** (e.g. _"LangChain 0.3 -- 40% faster, native MCP support"_) -- agent uses the facts verbatim
- A **pre-written `script.txt`** -- agent skips drafting (jump to step 5)

If the topic has no real source data and would require fabricated stats/dates, **stop and ask the user for a source URL** before proceeding. Never invent numbers.

## Outputs

A previewable HyperFrames project at `videos/<slug>/` with:

- `script.txt` -- narration script
- `audio/narration.wav` -- ElevenLabs TTS narration (single-call mode, MP3 fetched then decoded to WAV via ffmpeg)
- `transcript.json` -- word-level timestamps
- `index.html` -- composition filled with real content, transitions sync'd to spoken-word frames, placeholder strings replaced
- Preview studio open in the browser at the URL printed by `hyperframes preview`

The user runs render themselves: `npx hyperframes render videos/<slug> -o videos/<slug>/out/<slug>.mp4`.

---

## Steps

### 1. Confirm slug + title

Derive a kebab-case slug from the topic (3-6 words, no stopwords). Examples:

- "RAG pipeline explained" -> `rag-pipeline-explained`
- "What is Kubernetes?" -> `what-kubernetes`
- "LangChain 0.3 release" -> `langchain-0-3-release`

Confirm with the user in one line: _"Spawning `videos/rag-pipeline-explained/` -- title 'RAG Pipeline Explained'. Proceed?"_ Skip confirmation if the user already gave you both.

### 2. Copy the template

```bash
cp -r templates/shorts/classic videos/<slug>
```

PowerShell: `Copy-Item -Recurse templates/shorts/classic videos/<slug>`

Verify the copy: `videos/<slug>/index.html`, `meta.json`, `hyperframes.json`, `DESIGN.md`, `README.md`, `audio/`, `assets/`, `compositions/` should all exist.

### 3. Update meta.json

Replace the placeholders:

```json
{
  "id": "<slug>",
  "name": "<Title Case Name>"
}
```

### 4. Draft the script

Map narration to the four phase archetypes the template ships:

| Phase | Duration target | What to write |
|---|---|---|
| **1 -- Hero hook** | 5-7s | Mono overline (2-3 words, ALL CAPS): the section label. Secondary line (5-9 words): the setup. ONE slam word (1-2 syllables, ALL CAPS, **<=7 wide characters at 200px** -- see "Hero word fit" below): the emotional payoff. Caption pill (4-8 words): the receipt. |
| **2 -- Stat row** | 5-7s | Mono overline. Headline (5-9 words). Two huge numbers with 2-3 word labels each. Numbers MUST be real. |
| **3 -- Cards** | 6-8s | Mono overline. 3 labeled cards: short label (3-5 chars), title (3-5 words), sub (3-6 words). Rotate accent classes (cyan -> purple -> blue). |
| **4 -- CTA** | 4-6s | Mono overline. URL pill (real, working URL -- replace `your-domain.com` with the real URL for the video topic). Subscribe pill ("Subscribe" or short variant). |

**Hero word fit:** at the template's default 200px Inter 900 with `letter-spacing: -4px`, the hero slam word fits ~7 wide characters before overflowing the 920px max-width. If the user's slam word is longer (8-10 chars), drop `#p1-hero` font-size to 160-180px in step 8 -- the template's CSS has a comment marking the line. Or shorten via synonym.

**Style rules for narration text (tuned for ElevenLabs single-call mode):**

- Short sentences. Periods are sentence-end full stops; commas are mid-sentence breaths.
- **`<break time="...s"/>` SSML tags between sentences are mandatory in single-call mode.** Without them ElevenLabs reads sentences as a continuous monologue and the result sounds rushed. See "Break tag layout" below for the tested durations.
- Em-dashes are fine on ElevenLabs.
- **Natural abbreviations, not spaced letters.** Write `MCP`, `LLM`, `API` -- NOT `M C P`, `L L M`, `A P I`. At ElevenLabs style >=0.7, spaced forms trip the model and produce garbled phonemes. For long abbreviations that need extra clarity, separate from the expansion with an em-dash: `MCP -- Model Context Protocol.`
- Numbers: write digits, not words ("84 percent", not "eighty-four percent") -- matches the visual stat pills.
- **Selective CAPS on 1-2 power words per phase** = localized energy without retuning the voice. The hero slam word in phase 1 is always CAPS. Add one more in phases 2 or 4 for emphasis. Don't go higher than ~2 CAPS per phase or the read feels shouty.
- Total target: 24-45s of narration. Going past 60s is fine for content-dense topics.

**Break tag layout** (these are the tested durations; deviating risks artifacts or pacing problems):

| Position | `<break time>` | Why |
|---|---|---|
| Between sentences inside a phase | `0.35s` | Natural sentence-final intonation lands; not so long it drags |
| Between list items (e.g. 3 cards in phase 3) | `0.45s` | Slightly longer to mark each item as discrete |
| **End of each phase** | `0.4s` | **Critical**: longer than this causes a re-entry artifact (click / breath / vocalization) on the first word of the next phase |

Save to `videos/<slug>/script.txt`. Use this exact format (one phase per blank-line block, with inline break tags):

```
[phase 1 sentence one]. <break time="0.35s"/> [phase 1 sentence two]. <break time="0.4s"/>

[phase 2 narration with inline breaks]. <break time="0.4s"/>

[phase 3 narration with inline breaks]. <break time="0.4s"/>

[phase 4 narration with inline breaks].
```

The blank lines between phases are NOT spoken; they help you map narration to phases when you read the transcript back later.

### 4.5. (Optional) Ground the script in real source content

**Skip if**: the topic is text-only opinion / commentary, OR the user already provided full key facts verbatim, OR the source is reachable via plain `WebFetch`.

**Use when**: the source is a JS-rendered page (SPA, dashboard), or you need to verify a specific stat / version number against the current state of the page.

Cross-check every stat / date / quote in the draft `script.txt` against the source text. If a fact in the script can't be found in the source, remove it or ask the user. **Never preserve a fabricated fact** just because the draft was already written.

**Pre-step (TTS pronunciation pass -- MANDATORY before TTS).** Before the TTS API call, audit the script against three sources, in narrowest-wins order:

1. **`templates/shorts/classic/PRONUNCIATION.md`** -- generic dev-ecosystem token decisions (AI / API / LLM / MCP / RAG / CLI / etc.). This file overrides the generic rules. Apply every override that matches a token in your draft.
2. **`.claude/rules/tts-pronunciation.md`** -> "Acronym vs Word -- disambiguation for brand / workflow tokens" (decision tree for uppercase short tokens NOT covered by the per-template map).
3. **`.claude/rules/tts-pronunciation.md`** -> "Tech & brand pronunciation pitfalls" table (generic acronym + tech-term handling) -- apply only if no narrower decision exists above.

Prepend the leading HTML comment from `PRONUNCIATION.md` ("Required leading comment" section) to `videos/<slug>/script.txt` so future humans editing the script can see the decisions.

### 5. Generate TTS

The repo ships **two TTS engines**. Pick one based on `.env`:

**Option A — Kokoro (free, local, default for new users):**

```bash
python scripts/kokoro-tts.py videos/<slug> --shorts
```

Open-weight, Apache-licensed, runs on CPU. No API key. First run downloads a ~325MB model. Native word-level timestamps — no separate transcribe step. Requires `pip install kokoro soundfile numpy` and `espeak-ng` system-wide.

**Option B — ElevenLabs (paid, premium quality, voice cloning):**

```bash
python scripts/elevenlabs-tts.py videos/<slug> --shorts --no-chunk
```

**Always use `--no-chunk` for shorts.** Single-call mode gives ElevenLabs the full script in one request so cross-sentence prosody flows naturally. Requires `ELEVENLABS_API_KEY` set.

**Same output contract either way.** Both scripts write `videos/<slug>/audio/narration.wav` (the narration) AND `videos/<slug>/transcript.json` (flat `[{word, start, end}, ...]` array). Step 6 (transcribe) is therefore SKIPPED — both engines return alignment data inline, no Whisper pass needed. `scripts/compute_timings.py` doesn't care which engine generated the transcript.

Both scripts load `.env` from both `repo_root/.env` and `repo_root/.archon/.env`.

**Voice / model / settings are read from `.env`.** The tested-good values for shorts:

| Var | Tested-good for IVC clone | Tested-good for ElevenLabs preset |
|---|---|---|
| `ELEVENLABS_VOICE_ID` | (your clone ID) | `nPczCjzI2devNBz1zQrb` (Brian) |
| `ELEVENLABS_MODEL_ID` | `eleven_multilingual_v2` | `eleven_multilingual_v2` |
| `ELEVENLABS_STABILITY` | `0.40` | `0.45` |
| `ELEVENLABS_SIMILARITY_BOOST` | `0.75` | `0.75` |
| `ELEVENLABS_STYLE` | `0.70` | `0.30` |
| `ELEVENLABS_SPEED_SHORTS` | `1.15` | `1.15` |
| `ELEVENLABS_USE_SPEAKER_BOOST` | `true` | `true` |

**Flags**:
- `--shorts` -- use `ELEVENLABS_SPEED_SHORTS` instead of `ELEVENLABS_SPEED`
- `--no-chunk` -- single API call (use this for shorts)
- `--force` -- re-generate every chunk (no-op with `--no-chunk`)

If `ELEVENLABS_API_KEY` is missing the script exits 2 with a clear error.

### 6. ~~Transcribe for word-level sync~~ (SKIPPED -- handled by step 5)

`elevenlabs-tts.py` writes `transcript.json` directly from the ElevenLabs alignment payload.

### 7. Compute phase boundaries

```bash
python scripts/compute_timings.py videos/<slug>
```

The script reads `videos/<slug>/script.txt` and `videos/<slug>/transcript.json`, and prints every timing value you need:

```
phase_word_counts=[...]
phase_ends=[p1e, p2e, p3e, p4e]
total_duration=...              # = phase4_end + 1.5 (CTA tail before loop)
narration_data_duration=...     # = phase4_end (audio element data-duration)
T1, T2, T3                    # = phaseNe - 0.2 (transition fire times)
P2, P3, P4                    # = TN + 0.4 (next phase entrance anchors)
slam_t                        # ALL-CAPS slam word start time
hero_entrance                 # = slam_t - 0.4 (hero scale-in anchor)
shake_offsets=[...]             # = [slam_t + i*0.05 for i in 0..3]
gradient_drift_duration       # = phase1_end - slam_t - 0.5
ambient_breath_half_period    # = total_duration / 2
```

Take these values into step 8.

### 8. Edit `videos/<slug>/index.html`

Always invoke the `/hyperframes` skill before this step -- it has the framework-specific rules.

Edit in this exact order (one Edit per change):

1. **`<title>`** in `<head>` -> the video title
2. **`<div id="root">`** `data-duration` -> `total_duration` (rounded to 0.1s)
3. **`#top-banner-wordmark`** -- replace "YOUR BRAND" with the brand name or product name relevant to the video topic. Use ALL CAPS to match the letterform. Examples: if covering Kubernetes, write "KUBERNETES"; if covering a company's tool, write the company name.
4. **Phase 1**: `#p1-overline`, `#p1-pre`, `#p1-hero` (the slam word -- keep <=7 chars at 200px, or drop to 160-180px in CSS for longer words), `#p1-caption`. The bright-blue->sky-blue gradient text-fill on `#p1-hero` is the signature classic flourish -- use it ONCE per video.
5. **Phase 2**: `#p2-overline`, `#p2-headline`, both `.stat-pill` blocks (`.stat-num` and `.stat-label`). Pill accent classes are `.cyan` and `.magenta` (class names retained from the archon template for structural parity, but they render as bright blue and sky blue here -- see DESIGN.md).
6. **Phase 3**: `#p3-overline`, all three `.tl-card` blocks (`.tl-date`, `.tl-title`, `.tl-sub`). Rotate accent classes (`cyan` -> `purple` -> `blue`, which render here as bright-blue -> soft-indigo -> teal-green) so no two adjacent cards share an accent. Sky blue is reserved for the CTA (Phase 4).
7. **Phase 4**: `#p4-overline`, `#p4-url` (replace `your-domain.com` with the real URL for this video's topic), `#p4-subscribe`. The CTA pill uses sky blue -- closing accent that mirrors Phase 1's gradient end.
8. **Transition timestamps**: replace `const T1 = 5.6;`, `const T2 = 11.6;`, `const T3 = 17.6;` with computed values
9. **Phase anchors**: replace `const P2 = 6.4;`, `const P3 = 12.4;`, `const P4 = 18.4;` with computed values
10. **Progress bar tween**: change `duration: 24` (in the `#progress-fill` `fromTo`) to the new `total_duration`
11. **Ambient breath**: change `duration: 12` (yoyo half-period) to `total_duration / 2`
12. **Hero entrance + slam shake** (both tied to `slam_t`):
    - **Entrance**: replace the `tl.from("#p1-hero", { scale: 0.78, opacity: 0, duration: 0.8 }, 1.4)` anchor with `hero_entrance` (from `compute_timings.py`; = `slam_t - 0.4`).
    - **Shake**: replace the four `tl.to("#p1-hero", { x: ...}, <time>)` offsets with `shake_offsets`.
13. **Gradient drift**: update the `tl.fromTo("#p1-hero", { backgroundPosition: ... }, ..., 1.6)` line -- change `1.6` to `slam_t` and `duration: 4.0` to `gradient_drift_duration`
14. **Audio element**: insert just before `</div>` (the closing tag of `#root`), at the same indent level as `<div id="phase4">`:

```html
  <audio id="narration"
         class="clip"
         src="audio/narration.wav"
         data-start="0"
         data-duration="<phase4_end>"
         data-track-index="2"
         data-volume="1"></audio>
```

### 9. Lint

```bash
npx hyperframes lint videos/<slug>
```

Must report `0 errors`. Fix any errors before continuing:

| Error | Likely cause | Fix |
|---|---|---|
| `audio_src_not_found` (narration) | `narration.wav` missing or path wrong | Check `videos/<slug>/audio/narration.wav` exists; case-sensitive paths |
| `overlapping_gsap_tweens` | Two tweens hit the same prop at the same time | Add `overwrite: "auto"` to the later tween, or shift its start |
| `duplicate_media_discovery_risk` | Stray `<img src=...>` text in an HTML comment | Rephrase the comment |
| `missing_track_index` | Element has timing attrs but no `data-track-index` | Add it (use 2 for narration) |

Warnings are advisory.

### 10. Inspect for layout overflow

```bash
npx hyperframes inspect videos/<slug>
```

Common overflows on this template:

- **Hero slam word too wide** -- the 200px font + the chosen word exceeds 1080px - 120px padding. Drop `#p1-hero` font-size to 160-180px for 8-10 char words, or shorten via synonym.
- **Stat pill labels wrap onto 3 lines** -- labels >18 chars overflow the 460px pill. Shorten the label.
- **Card title overflows** -- 40px font + long title overflows the card width. Shorten or drop title to 36px.

Fix overflow at the content level (shorten words) before adjusting CSS.

### 11. Open preview (final step -- never render)

Run in background so the studio stays open while you report:

```bash
npx hyperframes preview videos/<slug>
```

Capture the URL it prints (read from CLI output -- the port may shift if 5173 is taken).

### 12. Report to the user

One concise message containing:

- **Slug + path**: `videos/<slug>/`
- **Total duration**: `XX.Xs`
- **Voice**: (the voice id from `.env`)
- **Preview URL**: `http://localhost:<port>`
- **Brand name used** in the top banner (what you replaced "YOUR BRAND" with)
- **CTA URL used** (what you replaced "your-domain.com" with)
- **Render command** (do NOT run it): `npx hyperframes render videos/<slug> -o videos/<slug>/out/<slug>.mp4`
- **Any inspect findings** that needed manual content tradeoffs

That's it. Stop. Wait for user to iterate or trigger render manually.

---

## Quality bar -- required before reporting done

- [ ] `npx hyperframes lint videos/<slug>` -> 0 errors
- [ ] `npx hyperframes inspect videos/<slug>` -> no overflow on hero word, stat pills, or cards
- [ ] All four phases have real content (no leftover template placeholders)
- [ ] "YOUR BRAND" replaced with a real brand / product name
- [ ] "your-domain.com" replaced with a real URL (or noted as topic-derived placeholder)
- [ ] Phase transition timestamps computed from transcript, NOT left at template defaults
- [ ] Audio element wired with correct `data-duration`
- [ ] Hero word fits at the chosen `#p1-hero` font-size -- re-check if you changed the word
- [ ] Gradient text-fill (`#p1-hero` `background-clip: text`) appears on AT MOST one element in the entire composition
- [ ] No Archon cyan/magenta or Anthropic orange/cream anywhere in the composition
- [ ] Preview URL is reachable (the `hyperframes preview` background command is still running)

If any item fails, fix it before reporting. Don't claim success on a half-built composition.

## Don'ts

- Never auto-render -- user explicitly always triggers render manually.
- Never fabricate stats, dates, URLs, or quotes. Ask for source if missing.
- Never modify `templates/shorts/classic/` -- only the copy under `videos/<slug>/`.
- Never use the bright-blue->sky-blue gradient text-fill on more than one element per video -- it's the signature classic flourish; using it twice dilutes it.
- Never use Archon cyan (`#22D9A0`) or magenta (`#E64DCC`) as an accent.
- Never use Anthropic orange (`#E07B3C`) or cream-clay (`#C97A5C`) as an accent.
- Never use `Math.random()` / `Date.now()` in the generated composition (HyperFrames is deterministic).
- Never write `<br>` in content text -- use `max-width` for natural wrapping (HyperFrames `/hyperframes` skill rule).
- Never animate `visibility` or `display` -- use opacity (HyperFrames rule). `tl.set({visibility: ...})` IS allowed.
- Never skip the `/hyperframes` skill before editing the composition HTML.
- Never run multiple `new-classic-short` invocations in parallel against the same slug.
- Never ship `YOUR BRAND` or `your-domain.com` as literal text in a published video.
