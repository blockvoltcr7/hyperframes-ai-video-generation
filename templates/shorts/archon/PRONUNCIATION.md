# TTS Pronunciation Map — Archon Shorts Template

Per-template overrides that the Phase 2a script writer MUST apply before writing `videos/<slug>/script.txt`. These decisions stem from how the Archon team and community actually pronounce their workflow / product names in talks and docs — they are NOT generic acronym rules.

Authority order, narrowest wins:
1. This file (Archon-specific)
2. `.claude/rules/tts-pronunciation.md` → "Acronym vs Word — disambiguation for brand / workflow tokens"
3. `.claude/rules/tts-pronunciation.md` → "Tech & brand pronunciation pitfalls" (generic table)

## Decisions for Archon's surface tokens

| Token | Spoken as | TTS spelling in `script.txt` | Reason |
| ----- | --------- | ----------------------------- | ------ |
| `Archon` | "ark-on" | `Archon` | Native English pronunciation reads correctly; no transform needed |
| `archon.diy` | "archon dot D I Y" | `archon dot D I Y` | `.diy` is initials in Archon's own marketing; `DIY` is the acronym people say letter-by-letter |
| `PIV` | "P I V" | `P I V` | True initialism — Plan-Implement-Validate loop. The team uses initials in talks ("the P I V loop") |
| `FIX` | "fix" (the English verb) | `fix` | The `fix-issue` workflow. Spelling out turns "the fix workflow" into robotic "F I X" — never do this |
| `RVW` | "review" | `review` | Vowel-stripped abbreviation of Review. The workflow does code reviews; spell it out to the full word |
| `AI` | "ay-eye" (native) | `AI` | ElevenLabs `eleven_multilingual_v2` pronounces it natively. No spacing needed |
| `PR` | "P R" | `P R` | Pull Request — true initialism, spell out |
| `API` | "A P I" | `A P I` | True initialism — spell out per generic rule |
| `MCP` | "M C P" | `M C P` | Model Context Protocol — initialism |
| `LLM` | "L L M" | `L L M` | Large Language Model — initialism |
| `RAG` | "R A G" (initials) OR "rag" (word) | `R A G` | Ambiguous in industry usage; default to initials for clarity in Shorts (short attention, listeners need the technical-term signal) |
| `CLI` | "C L I" | `C L I` | True initialism |
| `IDE` | "I D E" | `I D E` | True initialism |
| `JWT` | "J W T" | `J W T` | True initialism |
| `Claude` | "klod" | `Claude` | Reads correctly natively |
| `Anthropic` | "an-thrah-pik" | `Anthropic` | Reads correctly natively |

## Required leading comment in every Archon-template script

Phase 2a MUST prepend this HTML comment to `videos/<slug>/script.txt` for any short spawned from this template. The comment is stripped before TTS reaches ElevenLabs (`scripts/elevenlabs-tts.py` removes `[SCENE: ...]` markers; HTML comments are inert whitespace from the engine's perspective). It exists as a forcing function so any human editing the script can see the decisions:

```html
<!-- TTS pronunciation overrides — see templates/shorts/archon/PRONUNCIATION.md
     - PIV: "P I V" (initialism)
     - FIX: "fix" (English verb — NEVER spell as F I X)
     - RVW: "review" (expand vowel-stripped abbreviation)
     - AI: "AI" (native — do NOT space as A I)
     - PR: "P R" (initialism)
-->
```

## Adding a new Archon token to this map

When a regen cycle reveals a new mispronunciation specific to Archon's surface:

1. Add the row to the table above with the spoken form + the script-spelling + the reason.
2. If the decision overrides the generic rule in `tts-pronunciation.md`, note that in the reason column.
3. Update the leading-comment block above so Phase 2a writes the new entry into future scripts.
4. Commit this file in the same PR as the regenerated `videos/<slug>/script.txt` so the next playbook run picks it up.
