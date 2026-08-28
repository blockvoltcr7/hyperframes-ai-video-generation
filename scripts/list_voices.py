"""List ElevenLabs preset male voices to help pick an expressive non-Brian one.

Loads credentials from the repository `.env` file.
Prints id + name + labels for premade/professional male English voices.
Does NOT print the API key.
"""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from elevenlabs import ElevenLabs


def main() -> int:
    repo_root = Path(__file__).resolve().parent.parent
    load_dotenv(repo_root / ".env", override=True)

    api_key = os.environ.get("ELEVENLABS_API_KEY")
    if not api_key:
        print("ERROR: ELEVENLABS_API_KEY not set")
        return 2

    client = ElevenLabs(api_key=api_key)
    voices = client.voices.get_all().voices

    print(f"{'voice_id':<24}  {'name':<16}  {'age':<10}  {'accent':<14}  description")
    print("-" * 100)
    for v in voices:
        if v.category not in ("premade", "professional"):
            continue
        labels = v.labels or {}
        gender = (labels.get("gender") or "").lower()
        if gender != "male":
            continue
        age = labels.get("age") or ""
        accent = labels.get("accent") or ""
        desc = (
            labels.get("descriptive")
            or labels.get("description")
            or labels.get("use_case")
            or ""
        )
        print(f"{v.voice_id:<24}  {v.name:<16}  {age:<10}  {accent:<14}  {desc}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
