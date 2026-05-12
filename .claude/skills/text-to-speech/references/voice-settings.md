# Voice Settings

Fine-tune voice characteristics for your use case.

## Project defaults from `.env` — ALWAYS use these first

**This project ships voice defaults in `.env` at the repo root. Every ElevenLabs TTS call from this skill must load them and pass them as `voice_settings` unless the user explicitly overrides a value in the prompt.**

| Env var | Maps to | Project default |
|---|---|---|
| `ELEVENLABS_VOICE_ID` | `voice_id` | `7kXNOCqiaLdszL0OEXks` |
| `ELEVENLABS_MODEL_ID` | `model_id` | `eleven_multilingual_v2` |
| `ELEVENLABS_STABILITY` | `stability` | `0.65` |
| `ELEVENLABS_SIMILARITY_BOOST` | `similarity_boost` | `0.65` |
| `ELEVENLABS_STYLE` | `style` | `0` |
| `ELEVENLABS_SPEED` | `speed` (long-form) | `1.10` |
| `ELEVENLABS_SPEED_SHORTS` | `speed` (Shorts / vertical 1080×1920) | `1.13` |
| `ELEVENLABS_USE_SPEAKER_BOOST` | `use_speaker_boost` | `true` |

**Speed selection rule:** if the target video is a YouTube Short / vertical / `templates/shorts/**` composition, use `ELEVENLABS_SPEED_SHORTS`. Otherwise use `ELEVENLABS_SPEED`. Never hardcode `1.0`.

### Python — load defaults and call

```python
import os
from dotenv import load_dotenv  # pip install python-dotenv
from elevenlabs import ElevenLabs, VoiceSettings

load_dotenv()  # reads .env at repo root

def project_voice_settings(*, is_shorts: bool = False) -> VoiceSettings:
    speed_var = "ELEVENLABS_SPEED_SHORTS" if is_shorts else "ELEVENLABS_SPEED"
    return VoiceSettings(
        stability=float(os.environ["ELEVENLABS_STABILITY"]),
        similarity_boost=float(os.environ["ELEVENLABS_SIMILARITY_BOOST"]),
        style=float(os.environ["ELEVENLABS_STYLE"]),
        speed=float(os.environ[speed_var]),
        use_speaker_boost=os.environ["ELEVENLABS_USE_SPEAKER_BOOST"].lower() == "true",
    )

client = ElevenLabs()  # picks up ELEVENLABS_API_KEY from env
audio = client.text_to_speech.convert(
    text="Hello from the project defaults.",
    voice_id=os.environ["ELEVENLABS_VOICE_ID"],
    model_id=os.environ["ELEVENLABS_MODEL_ID"],
    voice_settings=project_voice_settings(is_shorts=True),
)
```

### JavaScript — load defaults and call

```javascript
import "dotenv/config";  // npm i dotenv  (or pnpm add dotenv)
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";

function projectVoiceSettings({ isShorts = false } = {}) {
  const speedVar = isShorts ? "ELEVENLABS_SPEED_SHORTS" : "ELEVENLABS_SPEED";
  return {
    stability: parseFloat(process.env.ELEVENLABS_STABILITY),
    similarityBoost: parseFloat(process.env.ELEVENLABS_SIMILARITY_BOOST),
    style: parseFloat(process.env.ELEVENLABS_STYLE),
    speed: parseFloat(process.env[speedVar]),
    useSpeakerBoost: process.env.ELEVENLABS_USE_SPEAKER_BOOST === "true",
  };
}

const client = new ElevenLabsClient();
const audio = await client.textToSpeech.convert(process.env.ELEVENLABS_VOICE_ID, {
  text: "Hello from the project defaults.",
  modelId: process.env.ELEVENLABS_MODEL_ID,
  voiceSettings: projectVoiceSettings({ isShorts: true }),
});
```

### cURL — source `.env` and substitute

```bash
set -a; source .env; set +a   # exports every key from .env into the shell

curl -X POST "https://api.elevenlabs.io/v1/text-to-speech/$ELEVENLABS_VOICE_ID" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"text\": \"Hello from the project defaults.\",
    \"model_id\": \"$ELEVENLABS_MODEL_ID\",
    \"voice_settings\": {
      \"stability\": $ELEVENLABS_STABILITY,
      \"similarity_boost\": $ELEVENLABS_SIMILARITY_BOOST,
      \"style\": $ELEVENLABS_STYLE,
      \"speed\": $ELEVENLABS_SPEED_SHORTS,
      \"use_speaker_boost\": $ELEVENLABS_USE_SPEAKER_BOOST
    }
  }" \
  --output output.mp3
```

> If a value is missing from `.env`, fail loudly — do NOT silently fall back to the ElevenLabs defaults below. The fallback table is reference material for callers who explicitly opt out of project defaults.

### When the audio drives anything visual: use `convert_with_timestamps`

For HyperFrames work — captions, marker highlights, scene transitions tied to narration — call `convert_with_timestamps` instead of `convert`. ElevenLabs returns character-level alignment in the same response, so you get the audio AND a word-level transcript from one model in one call. Don't generate audio first and run Whisper on it; that adds a dependency, costs a second pass, and introduces transcription drift.

See [SKILL.md → Word/character timestamps](../SKILL.md#wordcharacter-timestamps--default-for-any-sync-use-case) for the full pattern. The repo ships a working invocation at `scripts/elevenlabs-tts.py` that loads `.env`, calls `convert_with_timestamps`, writes `audio/narration.wav`, and emits `transcript.json` in HyperFrames' `[{word, start, end}]` shape:

```bash
python scripts/elevenlabs-tts.py videos/<slug> --shorts   # use ELEVENLABS_SPEED_SHORTS
python scripts/elevenlabs-tts.py videos/<slug>            # use ELEVENLABS_SPEED (long-form)
```

---

## Parameters

| Parameter | Range | Default | Description |
|-----------|-------|---------|-------------|
| `stability` | 0.0 - 1.0 | 0.5 | How consistent the voice sounds across the generation. Lower = more emotional variation and expressiveness (but can sound erratic). Higher = steady, predictable tone. |
| `similarity_boost` | 0.0 - 1.0 | 0.75 | How closely to match the original voice sample. Higher sounds more like the source voice but may amplify audio artifacts or background noise from the original recording. |
| `style` | 0.0 - 1.0 | 0.0 | Exaggerates the unique characteristics of the voice's speaking style (v2+ and v3 models only). Higher values make the voice more "characterful" but can reduce stability. |
| `speed` | 0.25 - 4.0 | 1.0 | Speech speed multiplier. 1.0 = normal speed. Range is 0.25-4.0 for the REST API; the Agents Platform restricts to 0.7-1.2. |
| `use_speaker_boost` | boolean | true | Post-processing that enhances voice clarity and similarity to the original. Generally leave this on unless you're experiencing artifacts. |

## Python Example

```python
from elevenlabs import ElevenLabs
from elevenlabs import VoiceSettings

client = ElevenLabs()

audio = client.text_to_speech.convert(
    text="Testing different voice settings.",
    voice_id="JBFqnCBsd6RMkjVDRZzb",
    model_id="eleven_v3",
    voice_settings=VoiceSettings(
        stability=0.5,
        similarity_boost=0.75,
        style=0.0,
        use_speaker_boost=True
    )
)
```

## JavaScript Example

```javascript
const audio = await client.textToSpeech.convert("JBFqnCBsd6RMkjVDRZzb", {
  text: "Testing different voice settings.",
  modelId: "eleven_v3",
  voiceSettings: {
    stability: 0.5,
    similarityBoost: 0.75,
    style: 0.0,
    useSpeakerBoost: true,
  },
});
```

## cURL Example

```bash
curl -X POST "https://api.elevenlabs.io/v1/text-to-speech/JBFqnCBsd6RMkjVDRZzb" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Testing different voice settings.",
    "model_id": "eleven_v3",
    "voice_settings": {
      "stability": 0.5,
      "similarity_boost": 0.75,
      "style": 0.0,
      "use_speaker_boost": true
    }
  }' \
  --output output.mp3
```

## Use Case Recommendations

### Audiobooks / Narration
```python
voice_settings=VoiceSettings(
    stability=0.7,        # Consistent tone
    similarity_boost=0.5, # Natural variation
    style=0.0
)
```

### Conversational / Chatbots
```python
voice_settings=VoiceSettings(
    stability=0.4,        # More expressive
    similarity_boost=0.75,
    style=0.3             # Slight style emphasis
)
```

### News / Professional
```python
voice_settings=VoiceSettings(
    stability=0.8,        # Very consistent
    similarity_boost=0.6,
    style=0.0
)
```

### Character Voices / Drama
```python
voice_settings=VoiceSettings(
    stability=0.3,        # Highly expressive
    similarity_boost=0.8,
    style=0.5             # Strong style
)
```

## Tips

- **Start with defaults** and adjust incrementally
- **Lower stability** if voice sounds monotonous
- **Reduce similarity_boost** if you hear audio artifacts
- **Style works** with v2+, v3, and multilingual models
- **Test with representative text** from your actual use case
- **Flash models** ignore some voice settings for speed
