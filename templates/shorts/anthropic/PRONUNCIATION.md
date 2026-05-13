# TTS Pronunciation Map — Anthropic Shorts Template

Per-template overrides that the Phase 2a script writer MUST apply before writing `videos/<slug>/script.txt`. These decisions stem from how Anthropic and the broader AI community pronounce their model and product names — they are NOT generic acronym rules.

Authority order, narrowest wins:
1. This file (Anthropic-specific)
2. `.claude/rules/tts-pronunciation.md` -> "Acronym vs Word — disambiguation for brand / workflow tokens"
3. `.claude/rules/tts-pronunciation.md` -> "Tech & brand pronunciation pitfalls" (generic table)

## Decisions for Anthropic's surface tokens

| Token | Spoken as | TTS spelling in `script.txt` | Reason |
| ----- | --------- | ----------------------------- | ------ |
| `Anthropic` | "an-thrah-pik" | `Anthropic` | Reads correctly natively; ElevenLabs v2 handles it cleanly |
| `anthropic.com` | "anthropic dot com" | `anthropic dot com` | Standard URL spoken form; no transform needed |
| `Claude` | "klod" | `Claude` | French name; ElevenLabs multilingual v2 reads it correctly natively |
| `Claude Code` | "klod code" | `Claude Code` | Reads as two words natively; no transform needed |
| `Sonnet` | "son-it" | `Sonnet` | English word; reads correctly natively |
| `Opus` | "oh-pus" | `Opus` | Latin word; reads correctly natively |
| `Haiku` | "hy-koo" | `Haiku` | Japanese loanword; reads correctly natively in ElevenLabs v2 |
| `MCP` | "M C P" | `M C P` | Model Context Protocol — true initialism; spell out with spaces |
| `API` | "A P I" | `A P I` | True initialism — spell out per generic rule |
| `LLM` | "L L M" | `L L M` | Large Language Model — initialism |
| `SWE-bench` | "swee bench" | `swee bench` | The benchmark name: write as two words, drop the hyphen. "SWE" as an initialism ("S W E") sounds robotic in context |
| `terminal-bench` | "terminal bench" | `terminal bench` | Reads naturally as two words; drop the hyphen in script |
| `RAG` | "R A G" (initials) | `R A G` | Ambiguous in industry usage; default to initials for clarity in Shorts |
| `agentic` | "ah-jen-tik" | `agentic` | Reads correctly natively |
| `AI` | "ay-eye" (native) | `AI` | ElevenLabs `eleven_multilingual_v2` pronounces it natively. No spacing needed |
| `PR` | "P R" | `P R` | Pull Request — true initialism |
| `CLI` | "C L I" | `C L I` | True initialism |
| `IDE` | "I D E" | `I D E` | True initialism |

## Required leading comment in every Anthropic-template script

Phase 2a MUST prepend this HTML comment to `videos/<slug>/script.txt` for any short spawned from this template. The comment is stripped before TTS reaches ElevenLabs (`scripts/elevenlabs-tts.py` removes `[SCENE: ...]` markers; HTML comments are inert whitespace from the engine's perspective). It exists as a forcing function so any human editing the script can see the decisions:

```html
<!-- TTS pronunciation overrides — see templates/shorts/anthropic/PRONUNCIATION.md
     - MCP: "M C P" (initialism — never "mick-up")
     - SWE-bench: write as "swee bench" (two words, no hyphen)
     - Claude: reads natively as "klod" — do NOT write "Clode" or "Klawd"
     - AI: "AI" native — do NOT space as "A I"
     - LLM: "L L M" (initialism)
-->
```

## Adding a new Anthropic token to this map

When a regen cycle reveals a new mispronunciation specific to Anthropic's surface:

1. Add the row to the table above with the spoken form + the script-spelling + the reason.
2. If the decision overrides the generic rule in `tts-pronunciation.md`, note that in the reason column.
3. Update the leading-comment block above so Phase 2a writes the new entry into future scripts.
4. Commit this file in the same PR as the regenerated `videos/<slug>/script.txt` so the next playbook run picks it up.
