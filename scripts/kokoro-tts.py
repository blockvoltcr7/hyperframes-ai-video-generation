"""Generate Kokoro TTS for a HyperFrames video — free, local, no API key.

Drop-in replacement for `scripts/elevenlabs-tts.py` when you want a $0 path.
Writes the same files in the same format:

  <project_dir>/audio/narration.wav   (24 kHz mono PCM)
  <project_dir>/transcript.json        (flat list of {word, start, end} entries)

Downstream tooling (`scripts/compute_timings.py`, `npx hyperframes lint`) does
NOT need to know which TTS engine generated the audio — the transcript shape
matches `elevenlabs-tts.py` exactly.

Usage:
  python scripts/kokoro-tts.py <project_dir> [--shorts] [--voice NAME]
                                              [--lang CODE]

Flags:
  --shorts          Use KOKORO_SPEED_SHORTS (default 1.15) over KOKORO_SPEED
                    (default 1.0). Matches the elevenlabs-tts.py convention.
  --voice NAME      Override KOKORO_VOICE (default 'af_heart' — American
                    female). See https://huggingface.co/hexgrad/Kokoro-82M
                    for the full voice catalog (~48 voices, 8 languages).
  --lang CODE       Override KOKORO_LANG_CODE (default 'a' — American
                    English). Other codes: 'b' British, 'e' Spanish,
                    'f' French, 'h' Hindi, 'i' Italian, 'j' Japanese,
                    'p' Brazilian Portuguese, 'z' Mandarin.

First-time prerequisites:
  pip install kokoro>=0.9.4 soundfile numpy python-dotenv
  espeak-ng                      # required for phoneme conversion
    Linux:    sudo apt install espeak-ng
    macOS:    brew install espeak
    Windows:  download the .msi from
              https://github.com/espeak-ng/espeak-ng/releases

First run downloads the ~325MB model from Hugging Face. Subsequent runs are
fully offline.

How phase boundaries work without SSML breaks:
  Kokoro doesn't process SSML `<break>` tags. This script strips them before
  generation and instead splits the script on blank-line phase boundaries
  (the existing convention in script.txt). Each phase is rendered as a
  separate Kokoro pass, then concatenated with 0.4s of silence between
  phases — matching the `<break time="0.4s"/>` end-of-phase convention used
  by the ElevenLabs pipeline. Word timestamps are stitched together with
  the cumulative-time offset so the output transcript.json matches what
  `compute_timings.py` expects.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

from dotenv import load_dotenv

# ── Constants ─────────────────────────────────────────────────────────────────

# Kokoro outputs 24 kHz mono. We write the same rate to narration.wav — the
# HyperFrames bundler is sample-rate-agnostic.
KOKORO_SAMPLE_RATE = 24_000

# Silence inserted between phases — mirrors the ElevenLabs `<break time="0.4s"/>`
# phase-boundary convention. Longer (e.g. 0.65s) reintroduces re-entry artifacts
# similar to what we saw with ElevenLabs.
PHASE_BREAK_SECONDS = 0.4

# Markup that must be stripped before sending text to Kokoro:
#   - <!-- ... --> HTML comments — playbooks prepend a multi-line pronunciation
#     comment block to script.txt for human readers. ElevenLabs API treats these
#     as inert whitespace, but Kokoro reads them verbatim if not stripped.
#   - <break /> SSML tags — Kokoro doesn't process SSML; we use phase splits
#     to insert deterministic silence between phase blocks instead.
#   - [SCENE: ...] markers — scene-boundary breadcrumbs for the operator only.
_HTML_COMMENT_RE = re.compile(r"<!--.*?-->", re.DOTALL)
_BREAK_TAG_RE = re.compile(r"<break\b[^>]*/?>", re.IGNORECASE)
_SCENE_TAG_RE = re.compile(r"\[SCENE:[^\]]*\]\s*\n?", re.IGNORECASE)
_LETTER_OR_DIGIT_RE = re.compile(r"[A-Za-z0-9]")


def strip_markup(text: str) -> str:
    """Strip HTML comments, SSML `<break>` tags, and `[SCENE:]` markers.

    Order matters: strip HTML comments FIRST because the leading
    pronunciation-overrides comment block in playbook-generated script.txt
    can otherwise leave a stray `-->` that Kokoro would still try to read.
    """
    cleaned = _HTML_COMMENT_RE.sub("", text)
    cleaned = _BREAK_TAG_RE.sub("", cleaned)
    cleaned = _SCENE_TAG_RE.sub("", cleaned)
    cleaned = re.sub(r"[ \t]+", " ", cleaned)         # collapse intra-line whitespace
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned)      # collapse 3+ newlines to 2
    return cleaned.strip()


def split_phases(text: str) -> list[str]:
    """Split on blank-line phase boundaries (one or more empty lines)."""
    return [block.strip() for block in re.split(r"\n\s*\n", text) if block.strip()]


def is_real_word(token_text: str) -> bool:
    """A token counts as a word iff it has at least one letter or digit."""
    return bool(_LETTER_OR_DIGIT_RE.search(token_text))


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate Kokoro TTS narration + transcript for a HyperFrames video.",
    )
    parser.add_argument("project_dir", type=Path)
    parser.add_argument(
        "--shorts",
        action="store_true",
        help="Use KOKORO_SPEED_SHORTS instead of KOKORO_SPEED.",
    )
    parser.add_argument(
        "--voice",
        type=str,
        default=None,
        help="Override KOKORO_VOICE from .env (e.g. af_heart, am_michael).",
    )
    parser.add_argument(
        "--lang",
        type=str,
        default=None,
        help="Override KOKORO_LANG_CODE from .env (default: 'a' = American English).",
    )
    args = parser.parse_args()

    # Load the repository-local environment.
    repo_root = Path(__file__).resolve().parent.parent
    load_dotenv(repo_root / ".env", override=True)

    # Resolve project paths
    project = (
        (repo_root / args.project_dir).resolve()
        if not args.project_dir.is_absolute()
        else args.project_dir
    )
    script_path = project / "script.txt"
    narration_wav = project / "audio" / "narration.wav"
    transcript_json = project / "transcript.json"

    if not script_path.exists():
        print(f"ERROR: {script_path} not found", file=sys.stderr)
        return 2

    raw_text = script_path.read_text(encoding="utf-8").strip()
    if not raw_text:
        print(f"ERROR: {script_path} is empty", file=sys.stderr)
        return 2

    text = strip_markup(raw_text)
    if not text:
        print(f"ERROR: {script_path} is empty after stripping markup", file=sys.stderr)
        return 2

    phases = split_phases(text)
    if not phases:
        print(f"ERROR: no phase blocks found in {script_path}", file=sys.stderr)
        return 2

    # Resolve voice + lang + speed from CLI > env > default
    voice = args.voice or os.environ.get("KOKORO_VOICE", "af_heart")
    lang_code = args.lang or os.environ.get("KOKORO_LANG_CODE", "a")
    speed_var = "KOKORO_SPEED_SHORTS" if args.shorts else "KOKORO_SPEED"
    speed = float(os.environ.get(speed_var, "1.15" if args.shorts else "1.00"))

    print(f"[kokoro] voice={voice} lang={lang_code} speed={speed} shorts={args.shorts}")
    print(f"[kokoro] phases={len(phases)}  script chars={len(text)}")

    # Defer the heavy imports until we know we're actually going to generate.
    try:
        import numpy as np
        import soundfile as sf
        from kokoro import KPipeline
    except ImportError as exc:
        print(
            f"ERROR: missing dependency: {exc.name}\n\n"
            "Install with:\n"
            "    pip install kokoro>=0.9.4 soundfile numpy\n\n"
            "You ALSO need espeak-ng installed system-wide:\n"
            "    Linux:    sudo apt install espeak-ng\n"
            "    macOS:    brew install espeak\n"
            "    Windows:  download the .msi from\n"
            "              https://github.com/espeak-ng/espeak-ng/releases",
            file=sys.stderr,
        )
        return 3

    print(f"[kokoro] loading pipeline (first run downloads ~325MB model)...")
    pipeline = KPipeline(lang_code=lang_code)

    audio_chunks: list = []                 # list of numpy float32 arrays
    words: list[dict] = []                  # final transcript output
    cumulative_time = 0.0                   # offset for word timestamps

    silence = np.zeros(
        int(PHASE_BREAK_SECONDS * KOKORO_SAMPLE_RATE),
        dtype=np.float32,
    )

    for phase_idx, phase_text in enumerate(phases):
        print(f"[kokoro] generating phase {phase_idx + 1}/{len(phases)}  ({len(phase_text)} chars)")

        # Pipe each phase as a single chunk so phase boundaries are crisp.
        # split_pattern is intentionally permissive so internal newlines or
        # sentence-final periods don't fragment the phase.
        results = list(
            pipeline(phase_text, voice=voice, speed=speed, split_pattern=r"\n\s*\n")
        )

        for result in results:
            audio = result.audio
            if audio is None:
                continue
            # Audio may be a torch.Tensor or numpy array. Normalize to float32 np.
            if hasattr(audio, "detach"):       # torch tensor
                audio_np = audio.detach().cpu().numpy().astype(np.float32)
            else:
                audio_np = np.asarray(audio, dtype=np.float32)

            # Extract word timestamps from result.tokens
            # Kokoro tokens are character-level grapheme spans with start_ts /
            # end_ts. We accumulate consecutive non-whitespace tokens into a
            # single word, then push (word, start, end) into the transcript.
            if result.tokens:
                current_word: str = ""
                current_start: float | None = None
                current_end: float | None = None

                def flush() -> None:
                    nonlocal current_word, current_start, current_end
                    if current_word and current_start is not None and current_end is not None:
                        if is_real_word(current_word):
                            words.append({
                                "word": current_word,
                                "start": float(cumulative_time + current_start),
                                "end": float(cumulative_time + current_end),
                            })
                    current_word = ""
                    current_start = None
                    current_end = None

                for tok in result.tokens:
                    tok_text = tok.text or ""
                    tok_ts_start = getattr(tok, "start_ts", None)
                    tok_ts_end = getattr(tok, "end_ts", None)

                    # Tokens without timestamps (rare; usually for silent
                    # punctuation) just contribute their text to the current
                    # word if it's non-whitespace.
                    if tok_ts_start is None or tok_ts_end is None:
                        if tok_text.strip():
                            current_word += tok_text
                        continue

                    if tok_text.strip():
                        if current_start is None:
                            current_start = float(tok_ts_start)
                        current_word += tok_text
                        current_end = float(tok_ts_end)

                    # `whitespace` attribute = True means this token ends with
                    # a space; flush the accumulator on word boundaries.
                    if getattr(tok, "whitespace", False):
                        flush()

                flush()  # final word in the result

            audio_chunks.append(audio_np)
            cumulative_time += len(audio_np) / KOKORO_SAMPLE_RATE

        # Insert phase break silence (except after the last phase)
        if phase_idx < len(phases) - 1:
            audio_chunks.append(silence)
            cumulative_time += PHASE_BREAK_SECONDS

    if not audio_chunks:
        print("ERROR: Kokoro produced no audio. Check your script for unsupported "
              "characters or empty phases.", file=sys.stderr)
        return 4

    # Concatenate + write WAV
    narration_wav.parent.mkdir(parents=True, exist_ok=True)
    full_audio = np.concatenate(audio_chunks)
    sf.write(str(narration_wav), full_audio, KOKORO_SAMPLE_RATE)
    duration_s = len(full_audio) / KOKORO_SAMPLE_RATE
    print(f"[kokoro] wrote {narration_wav}  ({duration_s:.2f}s, "
          f"{narration_wav.stat().st_size} bytes)")

    # Write transcript.json — same flat shape as elevenlabs-tts.py
    transcript_json.parent.mkdir(parents=True, exist_ok=True)
    transcript_json.write_text(
        json.dumps(words, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"[kokoro] wrote {transcript_json}  ({len(words)} words)")

    return 0


if __name__ == "__main__":
    sys.exit(main())
