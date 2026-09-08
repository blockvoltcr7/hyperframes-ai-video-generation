"""Edge-TTS fallback narration generator.

Used when ElevenLabs quota is exhausted. Produces narration.wav + transcript.json
with word-level timestamps in the format HyperFrames expects:
  [{ "word": str, "start": float, "end": float }, ...]

Usage:
  python scripts/edge-tts-fallback.py <project_dir> [--voice VOICE] [--rate +N%]

Defaults:
  voice = en-US-AndrewMultilingualNeural  (warm/confident, tech-narration grade)
  rate  = +10%  (matches ELEVENLABS_SPEED_SHORTS=1.13 feel)
"""

import argparse
import asyncio
import json
import re
import subprocess
import sys
from pathlib import Path

import edge_tts


def strip_punctuation(word: str) -> str:
    return re.sub(r"^[\W_]+|[\W_]+$", "", word)


_HTML_COMMENT_RE = re.compile(r"<!--.*?-->", re.DOTALL)
_BREAK_TAG_RE = re.compile(r"<break\b[^>]*/?>", re.IGNORECASE)
_SCENE_TAG_RE = re.compile(r"\[SCENE:[^\]]*\]\s*\n?", re.IGNORECASE)


def clean_script_text(raw: str) -> str:
    """Strip everything the other TTS CLIs strip before synthesis.

    HTML comments are pronunciation headers for humans, ``<break>`` tags are
    read by edge-tts as literal text rather than silence, and ``[SCENE:]``
    markers are operator breadcrumbs. Leaving any of them in would speak them
    aloud and inject phantom words into ``transcript.json``, breaking the
    word-count alignment that ``compute_timings.py`` relies on.
    """
    text = _HTML_COMMENT_RE.sub("", raw)
    text = _BREAK_TAG_RE.sub("", text)
    text = _SCENE_TAG_RE.sub("", text)
    return re.sub(r"\n{3,}", "\n\n", text).strip()


async def synthesize(text: str, voice: str, rate: str, out_mp3: Path) -> list[dict]:
    """Run edge-tts streaming, capture WordBoundary events, write MP3, return words."""
    communicate = edge_tts.Communicate(text, voice, rate=rate)
    words: list[dict] = []
    with open(out_mp3, "wb") as f:
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                f.write(chunk["data"])
            elif chunk["type"] == "WordBoundary":
                offset_s = chunk["offset"] / 10_000_000.0
                dur_s = chunk["duration"] / 10_000_000.0
                raw = chunk["text"]
                clean = strip_punctuation(raw)
                if not clean:
                    continue
                words.append(
                    {
                        "word": raw,
                        "start": round(offset_s, 3),
                        "end": round(offset_s + dur_s, 3),
                    }
                )
    return words


def mp3_to_wav(src: Path, dst: Path) -> None:
    """Convert MP3 to WAV via ffmpeg (PCM 44.1kHz mono — matches ElevenLabs pipeline)."""
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            str(src),
            "-ar",
            "44100",
            "-ac",
            "1",
            "-c:a",
            "pcm_s16le",
            str(dst),
        ],
        check=True,
        capture_output=True,
    )


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("project_dir", type=Path)
    ap.add_argument("--voice", default="en-US-AndrewMultilingualNeural")
    ap.add_argument("--rate", default="+10%")
    args = ap.parse_args()

    # Match the other TTS CLIs: relative project paths resolve against the repo
    # root, not the caller's cwd.
    repo_root = Path(__file__).resolve().parent.parent
    proj = args.project_dir if args.project_dir.is_absolute() else (repo_root / args.project_dir).resolve()
    script_path = proj / "script.txt"
    if not script_path.exists():
        print(f"[edge-tts] script not found: {script_path}", file=sys.stderr)
        return 1

    raw = script_path.read_text(encoding="utf-8")
    text = clean_script_text(raw)
    if not text:
        print(f"[edge-tts] {script_path} is empty after stripping comments, breaks, and [SCENE:] markers", file=sys.stderr)
        return 1
    print(f"[edge-tts] voice={args.voice} rate={args.rate}")
    print(f"[edge-tts] chars={len(text)}")

    audio_dir = proj / "audio"
    audio_dir.mkdir(exist_ok=True)
    mp3_path = audio_dir / "narration.mp3"
    wav_path = audio_dir / "narration.wav"
    transcript_path = proj / "transcript.json"

    words = asyncio.run(synthesize(text, args.voice, args.rate, mp3_path))
    print(f"[edge-tts] generated {len(words)} word boundaries")

    mp3_to_wav(mp3_path, wav_path)
    print(f"[edge-tts] wav: {wav_path}")

    transcript_path.write_text(json.dumps(words, indent=2), encoding="utf-8")
    print(f"[edge-tts] transcript: {transcript_path}")

    if words:
        last = words[-1]["end"]
        print(f"[edge-tts] total duration ~ {last:.2f}s")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
