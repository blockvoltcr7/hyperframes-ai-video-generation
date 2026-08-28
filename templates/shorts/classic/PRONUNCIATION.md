# TTS Pronunciation Map — Classic Shorts Template

Per-template overrides that the Phase 2a script writer MUST apply before writing `videos/<slug>/script.txt`. This template is brand-neutral, so decisions cover only generic developer-ecosystem acronyms and common tech tokens — no product-specific entries.

Authority order, narrowest wins:
1. This file (classic-template generic dev tokens)
2. `.agents/rules/tts-pronunciation.md` -> "Acronym vs Word — disambiguation for brand / workflow tokens"
3. `.agents/rules/tts-pronunciation.md` -> "Tech & brand pronunciation pitfalls" (generic table)

## Decisions for generic developer tokens

| Token | Spoken as | TTS spelling in `script.txt` | Reason |
| ----- | --------- | ----------------------------- | ------ |
| `AI` | "ay-eye" (native) | `AI` | ElevenLabs `eleven_multilingual_v2` pronounces it natively. No spacing needed |
| `API` | "A P I" | `A P I` | True initialism — spell out with spaces |
| `LLM` | "L L M" | `L L M` | Large Language Model — true initialism |
| `MCP` | "M C P" | `M C P` | Model Context Protocol — true initialism; never "mick-up" |
| `RAG` | "R A G" | `R A G` | Retrieval-Augmented Generation — initialism preferred for clarity in Shorts |
| `CLI` | "C L I" | `C L I` | True initialism |
| `IDE` | "I D E" | `I D E` | True initialism |
| `JWT` | "J W T" | `J W T` | JSON Web Token — true initialism |
| `CSS` | "C S S" | `C S S` | True initialism |
| `HTML` | "H T M L" | `H T M L` | True initialism |
| `JSON` | "jay-son" | `JSON` | Reads correctly as a word; ElevenLabs handles it natively |
| `URL` | "U R L" | `U R L` | True initialism |

## Required leading comment in every Classic-template script

Phase 2a MUST prepend this HTML comment to `videos/<slug>/script.txt` for any short spawned from this template. The comment is stripped before TTS reaches ElevenLabs (`scripts/elevenlabs-tts.py` removes `[SCENE: ...]` markers; HTML comments are inert whitespace from the engine's perspective). It exists as a forcing function so any human editing the script can see the decisions:

```html
<!-- TTS pronunciation overrides — see templates/shorts/classic/PRONUNCIATION.md
     - MCP: "M C P" (initialism — never "mick-up")
     - API: "A P I" (initialism — never "app-ee")
     - LLM: "L L M" (initialism)
     - RAG: "R A G" (initialism)
     - JSON: reads natively as "jay-son" — do NOT space as "J S O N"
     - AI: "AI" native — do NOT space as "A I"
-->
```

## Adding a new token to this map

When a regen cycle reveals a new mispronunciation on this template:

1. Add the row to the table above with the spoken form + the script-spelling + the reason.
2. If the decision overrides the generic rule in `tts-pronunciation.md`, note that in the reason column.
3. Update the leading-comment block above so Phase 2a writes the new entry into future scripts.
4. Commit this file in the same PR as the regenerated `videos/<slug>/script.txt` so the next playbook run picks it up.
