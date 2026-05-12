---
name: text-to-speech
description: Convert text to speech using ElevenLabs voice AI. Use when generating audio from text, creating voiceovers, building voice apps, or synthesizing speech in 70+ languages.
license: MIT
compatibility: Requires internet access and an ElevenLabs API key (ELEVENLABS_API_KEY).
metadata: {"openclaw": {"requires": {"env": ["ELEVENLABS_API_KEY"]}, "primaryEnv": "ELEVENLABS_API_KEY"}}
---

# ElevenLabs Text-to-Speech

Generate natural speech from text - supports 70+ languages, multiple models for quality vs latency tradeoffs.

> **Setup:** See [Installation Guide](references/installation.md). For JavaScript, use `@elevenlabs/*` packages only.

## Project defaults — load `.env` FIRST

Before any TTS call in this repo, load `.env` and use the project defaults defined there. Pull `voice_id`, `model_id`, and all `voice_settings` from environment variables — do **not** hardcode them, even in throwaway scripts.

| Env var | Maps to | Notes |
|---|---|---|
| `ELEVENLABS_API_KEY` | client auth | required |
| `ELEVENLABS_VOICE_ID` | `voice_id` | project's chosen voice |
| `ELEVENLABS_MODEL_ID` | `model_id` | project's chosen model |
| `ELEVENLABS_STABILITY` / `ELEVENLABS_SIMILARITY_BOOST` / `ELEVENLABS_STYLE` / `ELEVENLABS_USE_SPEAKER_BOOST` | `voice_settings.*` | tone/timbre |
| `ELEVENLABS_SPEED` / `ELEVENLABS_SPEED_SHORTS` | `voice_settings.speed` | use `_SHORTS` for vertical 1080×1920 / Shorts compositions, otherwise `ELEVENLABS_SPEED` |

Full snippets (Python / JS / cURL) and the speed-selection rule live in [references/voice-settings.md](references/voice-settings.md#project-defaults-from-env--always-use-these-first). The Quick Start below shows hardcoded values for illustration only — every real call must read from env.

## Quick Start

### Python

```python
from elevenlabs import ElevenLabs

client = ElevenLabs()

audio = client.text_to_speech.convert(
    text="Hello, welcome to ElevenLabs!",
    voice_id="JBFqnCBsd6RMkjVDRZzb",  # George
    model_id="eleven_multilingual_v2"
)

with open("output.mp3", "wb") as f:
    for chunk in audio:
        f.write(chunk)
```

### JavaScript

```javascript
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { createWriteStream } from "fs";

const client = new ElevenLabsClient();
const audio = await client.textToSpeech.convert("JBFqnCBsd6RMkjVDRZzb", {
  text: "Hello, welcome to ElevenLabs!",
  modelId: "eleven_multilingual_v2",
});
audio.pipe(createWriteStream("output.mp3"));
```

### cURL

```bash
curl -X POST "https://api.elevenlabs.io/v1/text-to-speech/JBFqnCBsd6RMkjVDRZzb" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" -H "Content-Type: application/json" \
  -d '{"text": "Hello!", "model_id": "eleven_multilingual_v2"}' --output output.mp3
```

## Models

| Model ID | Languages | Latency | Best For |
|----------|-----------|---------|----------|
| `eleven_v3` | 70+ | Standard | Highest quality, emotional range |
| `eleven_multilingual_v2` | 29 | Standard | High quality, long-form content |
| `eleven_flash_v2_5` | 32 | ~75ms | Ultra-low latency, real-time |
| `eleven_flash_v2` | English | ~75ms | English-only, fastest |
| `eleven_turbo_v2_5` | 32 | ~250-300ms | Balanced quality/speed |
| `eleven_turbo_v2` | English | ~250-300ms | English-only, balanced |

## Voice IDs

Use pre-made voices or create custom voices in the dashboard.

**Popular voices:**
- `JBFqnCBsd6RMkjVDRZzb` - George (male, narrative)
- `EXAVITQu4vr4xnSDxMaL` - Sarah (female, soft)
- `onwK4e9ZLuTAKqWW03F9` - Daniel (male, authoritative)
- `XB0fDUnXU5powFXDhCwa` - Charlotte (female, conversational)

```python
voices = client.voices.get_all()
for voice in voices.voices:
    print(f"{voice.voice_id}: {voice.name}")
```

## Voice Settings

Fine-tune how the voice sounds:

- **Stability**: How consistent the voice stays. Lower values = more emotional range and variation, but can sound unstable. Higher = steady, predictable delivery.
- **Similarity boost**: How closely to match the original voice sample. Higher values sound more like the original but may amplify audio artifacts.
- **Style**: Exaggerates the voice's unique style characteristics (only works with v2+ models).
- **Speaker boost**: Post-processing that enhances clarity and voice similarity.

```python
from elevenlabs import VoiceSettings

audio = client.text_to_speech.convert(
    text="Customize my voice settings.",
    voice_id="JBFqnCBsd6RMkjVDRZzb",
    voice_settings=VoiceSettings(
        stability=0.5,
        similarity_boost=0.75,
        style=0.5,
        speed=1.0,             # 0.25 to 4.0 (default 1.0)
        use_speaker_boost=True
    )
)
```

## Language Enforcement

Force specific language for pronunciation:

```python
audio = client.text_to_speech.convert(
    text="Bonjour, comment allez-vous?",
    voice_id="JBFqnCBsd6RMkjVDRZzb",
    model_id="eleven_multilingual_v2",
    language_code="fr"  # ISO 639-1 code
)
```

## Text Normalization

Controls how numbers, dates, and abbreviations are converted to spoken words. For example, "01/15/2026" becomes "January fifteenth, twenty twenty-six":

- `"auto"` (default): Model decides based on context
- `"on"`: Always normalize (use when you want natural speech)
- `"off"`: Speak literally (use when you want "zero one slash one five...")

```python
audio = client.text_to_speech.convert(
    text="Call 1-800-555-0123 on 01/15/2026",
    voice_id="JBFqnCBsd6RMkjVDRZzb",
    apply_text_normalization="on"
)
```

## Request Stitching

When generating long audio in multiple requests, the audio can have pops, unnatural pauses, or tone shifts at the boundaries. Request stitching solves this by letting each request know what comes before/after it:

```python
# First request
audio1 = client.text_to_speech.convert(
    text="This is the first part.",
    voice_id="JBFqnCBsd6RMkjVDRZzb",
    next_text="And this continues the story."
)

# Second request using previous context
audio2 = client.text_to_speech.convert(
    text="And this continues the story.",
    voice_id="JBFqnCBsd6RMkjVDRZzb",
    previous_text="This is the first part."
)
```

## Output Formats

| Format | Description |
|--------|-------------|
| `mp3_44100_128` | MP3 44.1kHz 128kbps (default) - compressed, good for web/apps |
| `mp3_44100_192` | MP3 44.1kHz 192kbps (Creator+) - higher quality compressed |
| `mp3_44100_64` | MP3 44.1kHz 64kbps - lower quality, smaller files |
| `mp3_22050_32` | MP3 22.05kHz 32kbps - smallest MP3 files |
| `pcm_16000` | Raw PCM 16kHz - use for real-time processing |
| `pcm_22050` | Raw PCM 22.05kHz |
| `pcm_24000` | Raw PCM 24kHz - good balance for streaming |
| `pcm_44100` | Raw PCM 44.1kHz (Pro+) - CD quality |
| `pcm_48000` | Raw PCM 48kHz (Pro+) - highest quality |
| `ulaw_8000` | μ-law 8kHz - standard for phone systems (Twilio, telephony) |
| `alaw_8000` | A-law 8kHz - telephony (alternative to μ-law) |
| `opus_48000_64` | Opus 48kHz 64kbps - efficient streaming codec |
| `wav_44100` | WAV 44.1kHz - uncompressed with headers |

## Word/character timestamps — default for any sync use case

If downstream code needs to know **when each word is spoken** (subtitles, captions, marker highlights, animation triggers, scene transitions tied to narration), use `convert_with_timestamps` — **never** generate audio first and run Whisper on it. ElevenLabs returns character-level alignment alongside the audio in a single call, so timestamps come from the same model that produced the audio (sample-accurate, no transcription drift, no extra dependency).

### Python — audio + word-level transcript

```python
import base64, json, os, wave
from dotenv import load_dotenv
from elevenlabs import ElevenLabs, VoiceSettings

load_dotenv()
client = ElevenLabs(api_key=os.environ["ELEVENLABS_API_KEY"])

resp = client.text_to_speech.convert_with_timestamps(
    voice_id=os.environ["ELEVENLABS_VOICE_ID"],
    text="Claude just got fifteen new connectors. AllTrails. Spotify.",
    model_id=os.environ["ELEVENLABS_MODEL_ID"],
    output_format="pcm_44100",
    voice_settings=VoiceSettings(
        stability=float(os.environ["ELEVENLABS_STABILITY"]),
        similarity_boost=float(os.environ["ELEVENLABS_SIMILARITY_BOOST"]),
        style=float(os.environ["ELEVENLABS_STYLE"]),
        speed=float(os.environ["ELEVENLABS_SPEED"]),
        use_speaker_boost=True,
    ),
)

# 1. Audio: base64-decode and wrap raw PCM in a WAV header.
pcm = base64.b64decode(resp.audio_base_64)
with wave.open("narration.wav", "wb") as f:
    f.setnchannels(1); f.setsampwidth(2); f.setframerate(44100)
    f.writeframes(pcm)

# 2. Word-level transcript: collapse character alignment into whitespace-delimited tokens.
align = resp.normalized_alignment or resp.alignment  # normalized strips punctuation oddities
words, current = [], None
for ch, t0, t1 in zip(align.characters, align.character_start_times_seconds, align.character_end_times_seconds):
    if ch.isspace():
        if current: words.append(current); current = None
    else:
        if current is None: current = {"word": ch, "start": t0, "end": t1}
        else: current["word"] += ch; current["end"] = t1
if current: words.append(current)

with open("transcript.json", "w", encoding="utf-8") as f:
    json.dump(words, f, ensure_ascii=False, indent=2)
```

### Response shape

`AudioWithTimestampsResponse` has:
- `audio_base_64` — the audio (base64-encoded; decode before writing to disk)
- `alignment` — character-level: `characters[]`, `character_start_times_seconds[]`, `character_end_times_seconds[]`
- `normalized_alignment` — same shape, but for the *normalized* text (numbers expanded, abbreviations spelled out, etc.). **Prefer this** when grouping into words — it matches what the model actually spoke.

### When to skip timestamps

Plain `convert` (no timestamps) is fine when the audio is the only output and nothing downstream needs sync — e.g. one-off voiceovers, podcasts where word-by-word timing doesn't matter. For anything visual that has to land on a syllable, use `convert_with_timestamps`.

## Streaming

For real-time applications, use the `stream` method (returns audio chunks as they're generated):

```python
audio_stream = client.text_to_speech.stream(
    text="This text will be streamed as audio.",
    voice_id="JBFqnCBsd6RMkjVDRZzb",
    model_id="eleven_flash_v2_5"  # Ultra-low latency
)

for chunk in audio_stream:
    play_audio(chunk)
```

See [references/streaming.md](references/streaming.md) for WebSocket streaming.

## Error Handling

```python
try:
    audio = client.text_to_speech.convert(
        text="Generate speech",
        voice_id="invalid-voice-id"
    )
except Exception as e:
    print(f"API error: {e}")
```

Common errors:
- **401**: Invalid API key
- **422**: Invalid parameters (check voice_id, model_id)
- **429**: Rate limit exceeded

## Tracking Costs

Monitor character usage via response headers (`x-character-count`, `request-id`):

```python
response = client.text_to_speech.convert.with_raw_response(
    text="Hello!", voice_id="JBFqnCBsd6RMkjVDRZzb", model_id="eleven_multilingual_v2"
)
audio = response.parse()
print(f"Characters used: {response.headers.get('x-character-count')}")
```

## References

- [Installation Guide](references/installation.md)
- [Streaming Audio](references/streaming.md)
- [Voice Settings](references/voice-settings.md)
