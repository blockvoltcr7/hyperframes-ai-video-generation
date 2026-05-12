---
paths:
  - "**/youtube-description.md"
  - "**/youtube-description.txt"
  - "**/script.txt"
---

# YouTube Description & Metadata

> **Adapted for this repo** — the legacy rule lived in the Remotion project at
> `diy-yt-creator/.claude/rules/youtube-metadata.md`. Path conventions are
> remapped for this HyperFrames repo: video projects are under `videos/<slug>/`,
> not `src/<Name>/`. All other constraints (vidIQ research, keyword-first
> descriptions, SEO chapter titles, link validation, mandatory CTAs, brand link
> format, thumbnail rules) remain in force.

## MANDATORY: YouTube Description File

Every video MUST include a `videos/<slug>/youtube-description.md` file.
This file contains the complete YouTube description ready for copy-paste upload.

**Required Structure** (in this exact order):

```
<Hook paragraph — keyword-rich opening, 1-3 sentences>

----
🚀 Want to learn agentic coding with live daily events and workshops?
Check out Dynamous AI: https://dynamous.ai/?code=646a60
Get 10% off here 👉 https://shorturl.smartcode.diy/dynamous_ai_10_percent_discount
----

Key Changes in This Release:
- <bullet 1 — keyword-dense, names specific features/APIs>
- <bullet 2>
- <…>

Chapters
<Chapter timestamps — M:SS format, one per line>

Resources:
<Links section — release notes, docs, sources, validated URLs>

To pull every fix in this video:
$ claude update    (or other primary CTA — context-dependent)

<Engagement question — debate-sparking, polarizing, references a video claim>

#Hashtag1 #Hashtag2 …    (15-25 hashtags)
```

**CRITICAL: Dynamous CTA Format** — The Dynamous block MUST be wrapped in `----`
separators (four dashes) above and below, placed ABOVE Chapters (between hook
paragraph and Chapters). This exact format is mandatory:

```
----
🚀 Want to learn agentic coding with live daily events and workshops?
Check out Dynamous AI: https://dynamous.ai/?code=646a60
Get 10% off here 👉 https://shorturl.smartcode.diy/dynamous_ai_10_percent_discount
----
```

**MANDATORY: "Chapters" Header Line** — The chapter list MUST be preceded by the
word `Chapters` on its own line. YouTube uses this as a signal for chapter
parsing. Without it, chapters may not render in the player.

```
Chapters
0:00 Three Claude Code Releases — 32 Features / 71 Fixes / 11 Improvements
0:30 Six Headline Changes …
```

## Chapter Timestamp Calculation (HyperFrames-specific)

Source data: each scene wrapper's `data-start` in `videos/<slug>/index.html`
gives the scene boundary in **render time** (seconds, at the speed the
HyperFrames render baked into the MP4 — typically 1.0× of the audio).

```
chapter_seconds = scene.data_start
```

**If the rendered MP4 was post-processed with ffmpeg `setpts/atempo` for
playback speedup** (per [`.claude/rules/video-speedup.md`](./video-speedup.md)),
divide every chapter timestamp by the speed factor:

```
chapter_seconds_final = scene.data_start / speed_factor
```

Format as `M:SS` (e.g., `1:35` for 95 seconds). Round to the nearest second; do
not include milliseconds. The first chapter MUST be `0:00`. Minimum gap between
chapters is 10s (YouTube enforcement); merge adjacent scenes into a single
chapter if they sit closer than that.

**Example** — `videos/claude-code-v2119-123/` rendered at 1.0× then ffmpeg-sped to 1.1×:

| Scene | `data-start` (raw) | ÷ 1.1 (final) | M:SS |
|---|---|---|---|
| stats-opener | 0.00 | 0.00 | 0:00 |
| feature-cards | 33.66 | 30.60 | 0:30 |
| detail-headless | 57.26 | 52.05 | 0:52 |
| detail-performance | 84.31 | 76.65 | 1:16 |
| detail-plugin-system | 109.06 | 99.15 | 1:39 |
| detail-terminal-ui | 134.14 | 121.95 | 2:01 |
| detail-network | 153.03 | 139.12 | 2:19 |
| cta | 194.28 | 176.62 | 2:56 |

## MANDATORY: vidIQ Keyword Research Before Writing

**Every YouTube description MUST be preceded by a vidIQ MCP research pass.** Do
not write the description from intuition or training-data assumptions about
what people search for — query the live vidIQ data and let it drive keyword
choices, chapter titles, and hashtags.

The vidIQ MCP tools are available in this environment under the
`mcp__claude_ai_vidiq__` namespace. At minimum, run these three before drafting:

| Tool | Purpose | How to use output |
|---|---|---|
| `vidiq_keyword_research` | Returns volume / competition / related keywords for a seed term | Pick 3-5 seed terms from the topic. Use top related terms with good volume + low-to-medium competition as hashtags + body keywords + chapter titles. |
| `vidiq_outliers` | Videos outperforming their channel's baseline on this topic | Read titles + thumbnails to see which keyword framings are working RIGHT NOW. Mirror the phrasing patterns (not the literal titles). |
| `vidiq_trending_videos` | Currently trending videos in the niche | Confirms whether the topic has current momentum and what adjacent keywords co-occur. |

**Workflow**:
1. Extract 3-5 seed keywords from the content brief (e.g., "Claude Code", "AI coding agent", "Claude skills").
2. Call `vidiq_keyword_research` for each seed — save the top 10 related keywords per seed.
3. Call `vidiq_outliers` with the primary topic keyword — log the top 5 outlier titles.
4. Call `vidiq_trending_videos` scoped to the niche if applicable.
5. Build a **keyword shortlist** (15-25 terms) from the above, weighted toward high-volume + low-competition.
6. Use this shortlist to drive:
   - The first 200 characters (must contain the top 2-3 keywords)
   - Chapter titles (each chapter should include at least one shortlist term)
   - Hashtags (15-25 tags drawn from the shortlist)
   - Long-tail keywords in the body
7. Save a brief research snapshot to `videos/<slug>/research/vidiq-keywords.md` so it's reproducible.

**Do not skip this step.** A description written without vidIQ data is guessing
— descriptions written with it consistently match real search demand.

## MANDATORY: Keyword-First Descriptions

YouTube SEO requires **keywords in the first 200 characters** of the
description. The opening line must contain the primary search terms (e.g.,
"Claude Code", the feature name, the topic).

**Rules**:
- First sentence MUST contain 2-3 target keywords naturally
- Do NOT start with generic hooks like "Every PR review..." or "What if..." —
  lead with the topic
- Do NOT use `→` or `->` arrows in descriptions — YouTube may flag or hide them
- For Shorts: front-load the video topic + "Claude Code" in the first line

**Example (BAD)** — no keywords in first 200 chars:
```
Every PR review. Every commit message. Every session. You're repeating yourself.
```

**Example (GOOD)** — keywords front-loaded:
```
Claude Code Skills, Sub-agents, Hooks, MCP Servers, and CLAUDE.md — 5 features
that eliminate repeating yourself every session.
```

## MANDATORY: SEO-Optimized Chapter Titles

YouTube chapters are **individually indexed by Google and YouTube search**. Each
chapter title is a mini SEO target. Generic labels like "Introduction" or
"Part 3" waste this opportunity.

**Rules**:

1. **Front-load the searchable keyword** — the concept/stat/framework name goes
   first, context second.
   - BAD: `The Problem With AI Tools`
   - GOOD: `METR Study Breakdown: Why AI Made Developers Slower`

2. **Include specific numbers/stats** — numbers increase CTR in search results.
   - BAD: `Career Impact`
   - GOOD: `The Career Ladder Is Collapsing: Stanford Employment Data`

3. **Name frameworks, people, and companies** — proper nouns are search magnets.
   - BAD: `The Levels Framework`
   - GOOD: `The Six Levels of AI-Native Development (Dan Shapiro Framework)`

4. **Use "How/Why/What" phrasing** for action chapters — matches search intent.
   - BAD: `Advice for Developers`
   - GOOD: `What Developers Should Actually Do Now (By Career Stage)`

5. **Add parenthetical context** for disambiguation — helps both SEO and viewer
   scanning.
   - BAD: `The New Org`
   - GOOD: `The New AI-Native Org: Cursor's $3.3M Revenue Per Employee`

6. **Never use generic labels**: "Introduction", "Part 1", "Conclusion",
   "Outro", "Summary", "Preview". The first chapter (`0:00`) MUST use the
   video's title/topic with an SEO keyword, NOT "Preview". Example:
   `0:00 Markdown for Agents — 80% Token Savings`

7. **Chapter should standalone as a search result** — if someone finds ONLY
   this chapter title in search, would they click?

**Template patterns**:

```
[Concept/Framework Name]: [Specific Detail or Stat]
[Stat/Number] [What It Means] ([Source/Context])
Why [Searchable Question] ([Framework/Answer])
[Action Verb] [Specific Advice] (By [Segment])
```

## MANDATORY: Validate All Resource Links

Every URL in `youtube-description.md` **MUST be validated** before finalizing.
Use `WebFetch` to check each link returns a 200 (not 404, 403, or redirect to
an error page).

**Process**:
1. After generating the description, extract all URLs.
2. `WebFetch` each one with a simple prompt like "Does this page exist and what is it about?"
3. If a link returns 404 or error: find the correct URL (search the web) or remove the link.
4. If a link redirects: use the final destination URL instead.

**Why**: Viewers who click dead links in descriptions lose trust immediately. A
commenter asking "Can you post a link?" means the description failed them.

## MANDATORY: Engagement CTA (Debate Question)

Every YouTube description MUST end with a **polarizing or debate-sparking
question** — not a generic "What do you think?" This drives comment engagement.

**Rules**:
- The question should reference a specific claim or hot take from the video
- Frame it as a choice or stance viewers can take sides on
- Bold claims and contrarian takes get the most comments

**Examples (GOOD)**:
- "Is RAG actually dead, or is it just evolving? Drop your take below."
- "Claude Code vs Cursor — which one are you shipping with in 2026?"
- "Which patch made your day — Vim modes, the 67% faster /resume, or the OAuth cleanup?"

**Examples (BAD — too generic)**:
- "What do you think? Let me know in the comments!"
- "Did you enjoy this video?"
- "Share your thoughts below."

The same debate question should also be spoken as the **final line of the
narration script** in `videos/<slug>/script.txt`.

## MANDATORY: Full SEO/Keyword Optimization

YouTube descriptions are indexed by both YouTube search and Google. Every
description must be comprehensively keyword-optimized, not just the first line.

**Rules**:

1. **First 200 characters**: Must contain primary keywords (product name,
   topic, key technology). This is what shows in search results before
   "Show more."

2. **Chapter titles are individual search results**: Each chapter is indexed
   separately by Google. Every chapter title must be a standalone search query
   someone would type. Front-load the searchable term, include specific
   numbers/stats/names. Never use generic labels.
   - BAD: `1:25 The Pattern`
   - GOOD: `1:25 defineCatalog() Deep Dive: Zod Schemas + Auto-Generated LLM Prompts`

3. **Long-tail keywords in body**: Include related search terms naturally
   throughout the description.

4. **Package/API/command names are keywords**: List every package, function,
   hook, env var, CLI flag, and API name explicitly (e.g., `claude ultrareview`,
   `--from-pr`, `ANTHROPIC_BEDROCK_SERVICE_TIER`). Developers search for these
   exact terms.

5. **Competitor/adjacent names are keywords**: Mention competing tools/protocols
   by name (e.g., "vs Cursor", "vs Cline"). Comparison searches have high
   intent.

6. **Stats in chapters and body**: Include specific numbers — they increase CTR
   in search results.

7. **Hashtags**: 15-25 relevant hashtags. Include the product name, brand,
   technology stack, and broad category terms. Mix specific (`#ClaudeCode`,
   `#MCP`) with broad (`#AICoding`, `#DevTools`).

8. **Key Concepts section**: List and briefly explain 3-5 technical concepts
   from the video. These are keyword-dense paragraphs that YouTube indexes.

9. **Resource links with context**: Don't just drop URLs — add keyword-rich
   anchor text: `Release Notes (v2.1.123): https://...` not just `https://...`.

## Brand Links (MANDATORY)

Always use these exact links — never use placeholders:

| Brand | Link |
|-------|------|
| Dynamous AI | <pre>🚀 Want to learn agentic coding with live daily events and workshops?<br/>Check out Dynamous AI: https://dynamous.ai/?code=646a60<br/>Get 10% off here 👉 https://shorturl.smartcode.diy/dynamous_ai_10_percent_discount</pre> |

When generating YouTube descriptions, scripts mentioning Dynamous, or any CTA
referencing the course, **always include the full link above**. Never use
`[link in description]` or similar placeholders.

## Thumbnail: Version Badge Must Be LARGE

In Claude Code (and any version-update) video thumbnails, the version number
badge MUST be prominently sized. YouTube thumbnails are scanned at tiny sizes
in the feed — a small version badge is unreadable.

Minimum dimensions in the thumbnail manifest:
- **Width:** ≥ 280px at thumbnail render size (1280×720)
- **Height:** ≥ 60px
- **Font equivalent:** ≥ 48px (bold, sans-serif)

Always describe the version badge as "LARGE" with explicit dimensions in the
thumbnail concept descriptions. Default thumbnail skill output runs too small.

## Thumbnail: Never Place Critical Content in Bottom-Right

YouTube's own UI (duration badge, progress bar, recommendation overlays)
covers the bottom-right of every thumbnail. Never place titles, version
badges, or key stats in that corner. Safe zones: top half, center, and
bottom-left.

## Reference Implementation

The canonical example for this repo is
[`videos/claude-code-v2119-123/youtube-description.md`](../../videos/claude-code-v2119-123/youtube-description.md)
— mirror its structure when generating descriptions for new videos.
