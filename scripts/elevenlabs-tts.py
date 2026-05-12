"""Generate ElevenLabs TTS for a HyperFrames video using project .env defaults.

Usage:
  python scripts/elevenlabs-tts.py <project_dir> [--shorts] [--force] [--no-chunk]
                                   [--inter-chunk-silence-ms N]

Reads <project_dir>/script.txt, writes <project_dir>/audio/narration.wav and
<project_dir>/transcript.json.

Default behavior: chunked generation with auto-detect delta regen. The script
is split into sentence-sized chunks; each chunk is an independent TTS call.
Per-chunk WAV + sync JSON land in audio/narration-chunks/. A SHA-256 checksum
of each chunk's text is written to transcript-history.json — on the next run,
only changed chunks re-hit the ElevenLabs API.

Flags:
  --shorts                      Use ELEVENLABS_SPEED_SHORTS over ELEVENLABS_SPEED.
  --force                       Regenerate every chunk regardless of history.
  --no-chunk                    Single API call (legacy behavior, no delta regen).
  --inter-chunk-silence-ms N    Silence between chunks in chunked mode (default: 650).
                                Calibrated to match natural sentence pauses.

Loads voice_id, model_id, and voice_settings from .env (see voice-settings.md).
If ELEVENLABS_PRONUNCIATION_DICT_ID and ELEVENLABS_PRONUNCIATION_DICT_VERSION_ID
are set, applies the dictionary to the request (both must be present).
"""
from __future__ import annotations

import argparse
import base64
import json
import os
import re
import sys
from pathlib import Path

from dotenv import load_dotenv
from elevenlabs import ElevenLabs, VoiceSettings

# tts_lib lives next to this CLI; add scripts/ to sys.path so the import works
# whether the user invokes us as `python scripts/elevenlabs-tts.py …` or as
# `python -m scripts.elevenlabs-tts` (the dash in the filename forbids the
# latter today, but be defensive).
sys.path.insert(0, str(Path(__file__).resolve().parent))
from tts_lib import (  # noqa: E402
    DEFAULT_INTER_CHUNK_SILENCE_MS,
    clean_sync_data,
    decode_mp3_to_pcm,
    generate_chunked,
    write_pcm_as_wav,
)


# ElevenLabs reads literal `[SCENE: name]` tags as narration ("bracket scene
# colon stats opener"). Strip them before TTS — they exist solely as scene
# boundary markers for the operator and are not meant to be spoken.
_SCENE_TAG_RE = re.compile(r"\[SCENE:[^\]]*\]\s*\n?", re.IGNORECASE)


def strip_scene_tags(text: str) -> str:
    """Remove `[SCENE: name]` markers and collapse the resulting blank-line runs."""
    cleaned = _SCENE_TAG_RE.sub("", text)
    cleaned = re.sub(r"\n{3,}", "\n\n", cleaned).strip()
    return cleaned


def project_voice_settings(*, is_shorts: bool) -> VoiceSettings:
    speed_var = "ELEVENLABS_SPEED_SHORTS" if is_shorts else "ELEVENLABS_SPEED"
    return VoiceSettings(
        stability=float(os.environ["ELEVENLABS_STABILITY"]),
        similarity_boost=float(os.environ["ELEVENLABS_SIMILARITY_BOOST"]),
        style=float(os.environ["ELEVENLABS_STYLE"]),
        speed=float(os.environ[speed_var]),
        use_speaker_boost=os.environ["ELEVENLABS_USE_SPEAKER_BOOST"].lower() == "true",
    )


def resolve_pronunciation_locators() -> list[dict] | None:
    dict_id = os.environ.get("ELEVENLABS_PRONUNCIATION_DICT_ID", "").strip()
    dict_ver = os.environ.get("ELEVENLABS_PRONUNCIATION_DICT_VERSION_ID", "").strip()
    if dict_id and dict_ver:
        return [{"pronunciation_dictionary_id": dict_id, "version_id": dict_ver}]
    if dict_id and not dict_ver:
        print("ERROR: ELEVENLABS_PRONUNCIATION_DICT_ID is set but "
              "ELEVENLABS_PRONUNCIATION_DICT_VERSION_ID is missing — "
              "ElevenLabs requires both. Fetch the version with "
              "client.pronunciation_dictionaries.get(pronunciation_dictionary_id=...).",
              file=sys.stderr)
        sys.exit(2)
    return None


def run_single_call(
    *,
    text: str,
    narration_wav: Path,
    transcript_json: Path,
    client: ElevenLabs,
    voice_id: str,
    model_id: str,
    voice_settings: VoiceSettings,
    pronunciation_dictionary_locators: list[dict] | None,
) -> None:
    """Legacy --no-chunk path: one API call, write WAV + flat transcript.json.

    Kept as an escape hatch for back-compat. Does not write
    transcript-history.json (no chunks to track).
    """
    resp = client.text_to_speech.convert_with_timestamps(
        voice_id=voice_id,
        text=text,
        model_id=model_id,
        output_format="mp3_44100_128",
        voice_settings=voice_settings,
        pronunciation_dictionary_locators=pronunciation_dictionary_locators,
    )

    mp3_bytes = base64.b64decode(resp.audio_base_64)
    pcm_bytes = decode_mp3_to_pcm(mp3_bytes)
    print(f"[tts] received mp3 bytes={len(mp3_bytes)}, decoded pcm bytes={len(pcm_bytes)}")

    narration_wav.parent.mkdir(parents=True, exist_ok=True)
    write_pcm_as_wav(pcm_bytes, str(narration_wav))
    duration_s = len(pcm_bytes) / 2 / 44100
    print(f"[tts] wrote {narration_wav}  ({duration_s:.2f}s, {narration_wav.stat().st_size} bytes)")

    align = resp.normalized_alignment or resp.alignment
    words: list[dict] = []
    current: dict | None = None
    for ch, t0, t1 in zip(
        align.characters,
        align.character_start_times_seconds,
        align.character_end_times_seconds,
    ):
        if ch.isspace():
            if current is not None:
                words.append(current)
                current = None
        else:
            if current is None:
                current = {"word": ch, "start": float(t0), "end": float(t1)}
            else:
                current["word"] += ch
                current["end"] = float(t1)
    if current is not None:
        words.append(current)
    words = clean_sync_data(words)

    transcript_json.parent.mkdir(parents=True, exist_ok=True)
    transcript_json.write_text(
        json.dumps(words, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )
    print(f"[tts] wrote {transcript_json}  ({len(words)} words)")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("project_dir", type=Path)
    parser.add_argument("--shorts", action="store_true",
                        help="Use ELEVENLABS_SPEED_SHORTS")
    parser.add_argument("--force", action="store_true",
                        help="Regenerate every chunk regardless of transcript-history.json")
    parser.add_argument("--no-chunk", action="store_true",
                        help="Single API call (legacy behavior, no delta regen)")
    parser.add_argument(
        "--inter-chunk-silence-ms",
        type=int,
        default=DEFAULT_INTER_CHUNK_SILENCE_MS,
        help=f"Silence between chunks in ms (default: {DEFAULT_INTER_CHUNK_SILENCE_MS})",
    )
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    # Env precedence (later wins): .archon/.env, then .env. .archon/.env is
    # where Archon-related secrets typically live in this repo, so we read it
    # first and let a repo-root .env override on a per-key basis if present.
    load_dotenv(repo_root / ".archon" / ".env", override=False)
    load_dotenv(repo_root / ".env", override=True)
    project = (repo_root / args.project_dir).resolve() if not args.project_dir.is_absolute() else args.project_dir
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
    text = strip_scene_tags(raw_text)
    if not text:
        print(f"ERROR: {script_path} is empty after stripping [SCENE:] tags", file=sys.stderr)
        return 2
    if text != raw_text:
        stripped_count = len(_SCENE_TAG_RE.findall(raw_text))
        print(f"[tts] stripped {stripped_count} [SCENE:] marker(s) before TTS")

    voice_id = os.environ["ELEVENLABS_VOICE_ID"]
    model_id = os.environ["ELEVENLABS_MODEL_ID"]
    settings = project_voice_settings(is_shorts=args.shorts)
    locators = resolve_pronunciation_locators()

    print(f"[tts] voice_id={voice_id} model_id={model_id} shorts={args.shorts}")
    print(f"[tts] settings stability={settings.stability} similarity={settings.similarity_boost} "
          f"style={settings.style} speed={settings.speed} speaker_boost={settings.use_speaker_boost}")
    if locators:
        print(f"[tts] pronunciation_dictionary={locators[0]['pronunciation_dictionary_id']} "
              f"version={locators[0]['version_id']}")
    else:
        print("[tts] pronunciation_dictionary=<none>")
    print(f"[tts] text chars={len(text)}")
    print(f"[tts] mode={'single-call' if args.no_chunk else 'chunked'}"
          + ("" if args.no_chunk else f" silence_ms={args.inter_chunk_silence_ms}")
          + (" force=true" if args.force and not args.no_chunk else ""))

    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        print("ERROR: ELEVENLABS_API_KEY not set in environment", file=sys.stderr)
        return 2
    client = ElevenLabs(api_key=api_key)

    if args.no_chunk:
        if args.force:
            print("[tts] note: --force is a no-op with --no-chunk (no history to ignore)")
        run_single_call(
            text=text,
            narration_wav=narration_wav,
            transcript_json=transcript_json,
            client=client,
            voice_id=voice_id,
            model_id=model_id,
            voice_settings=settings,
            pronunciation_dictionary_locators=locators,
        )
        return 0

    summary = generate_chunked(
        text=text,
        narration_wav=narration_wav,
        transcript_json=transcript_json,
        client=client,
        voice_id=voice_id,
        model_id=model_id,
        voice_settings=settings,
        pronunciation_dictionary_locators=locators,
        inter_chunk_silence_ms=args.inter_chunk_silence_ms,
        force=args.force,
    )
    print(f"[tts] wrote {narration_wav}  "
          f"({summary['duration_s']:.2f}s, {narration_wav.stat().st_size} bytes)")
    print(f"[tts] wrote {transcript_json}  ({summary['words']} words)")
    print(f"[tts] chunks={summary['chunks']} changed={summary['changed']} "
          f"unchanged={summary['unchanged']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
