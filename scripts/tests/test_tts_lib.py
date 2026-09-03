import json
import sys
import tempfile
import types
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

elevenlabs = types.ModuleType("elevenlabs")
elevenlabs.VoiceSettings = object
client = types.ModuleType("elevenlabs.client")
client.ElevenLabs = object
sys.modules.setdefault("elevenlabs", elevenlabs)
sys.modules.setdefault("elevenlabs.client", client)

from tts_lib import (  # noqa: E402
    clean_sync_data,
    compute_checksum,
    diff_chunks,
    generation_config,
    history_matches_config,
    split_into_chunks,
    write_json_atomic,
)


class FakeVoiceSettings:
    def __init__(self, stability=0.4, similarity_boost=0.8, style=0.0, speed=1.0, use_speaker_boost=True):
        self.stability = stability
        self.similarity_boost = similarity_boost
        self.style = style
        self.speed = speed
        self.use_speaker_boost = use_speaker_boost


def config_for(**overrides):
    values = {
        "voice_id": "voice-a",
        "model_id": "eleven_multilingual_v2",
        "voice_settings": FakeVoiceSettings(),
        "pronunciation_dictionary_locators": None,
        "inter_chunk_silence_ms": 650,
    }
    values.update(overrides)
    return generation_config(**values)


class TtsLibTest(unittest.TestCase):
    def test_history_reuse_requires_identical_voice_model_and_settings(self):
        history = {**config_for(), "chunks": []}
        self.assertTrue(history_matches_config(history, config_for()))
        self.assertFalse(history_matches_config(history, config_for(voice_id="voice-b")))
        self.assertFalse(history_matches_config(history, config_for(model_id="eleven_turbo_v2_5")))
        self.assertFalse(history_matches_config(history, config_for(voice_settings=FakeVoiceSettings(speed=1.13))))
        self.assertFalse(history_matches_config(history, config_for(pronunciation_dictionary_locators=[{"id": "x"}])))
        self.assertFalse(history_matches_config(history, config_for(inter_chunk_silence_ms=500)))
        self.assertFalse(history_matches_config(None, config_for()))

    def test_legacy_history_without_config_is_not_reused(self):
        self.assertFalse(history_matches_config({"chunks": []}, config_for()))

    def test_write_json_atomic_replaces_file_and_leaves_no_temp(self):
        directory = Path(tempfile.mkdtemp(prefix="tts-lib-"))
        target = directory / "nested" / "transcript-history.json"
        write_json_atomic(target, {"a": 1}, indent=2)
        write_json_atomic(target, {"a": 2}, indent=2)
        self.assertEqual(json.loads(target.read_text(encoding="utf-8")), {"a": 2})
        self.assertEqual([p.name for p in target.parent.iterdir()], ["transcript-history.json"])

    def test_write_json_atomic_keeps_previous_file_on_failure(self):
        directory = Path(tempfile.mkdtemp(prefix="tts-lib-"))
        target = directory / "chunk-00-sync.json"
        write_json_atomic(target, {"words": []})
        with self.assertRaises(TypeError):
            write_json_atomic(target, {"bad": object()})
        self.assertEqual(json.loads(target.read_text(encoding="utf-8")), {"words": []})
        self.assertEqual([p.name for p in directory.iterdir()], ["chunk-00-sync.json"])

    def test_split_protects_abbreviations_and_merges_short_sentences(self):
        chunks = split_into_chunks("Dr. Smith arrived. Then the team left.", min_chars=40, max_chars=400)
        self.assertEqual(len(chunks), 1)
        self.assertIn("Dr. Smith arrived.", chunks[0])

    def test_checksum_normalizes_whitespace(self):
        self.assertEqual(compute_checksum("hello   world"), compute_checksum("hello world"))

    def test_clean_sync_data_drops_ssml_and_punctuation(self):
        cleaned = clean_sync_data([
            {"word": "<break", "start": 0.0, "end": 0.1},
            {"word": "choices:<break", "start": 0.1, "end": 0.4},
            {"word": ".", "start": 0.4, "end": 0.5},
            {"word": "ready", "start": 0.45, "end": 0.8},
        ])
        self.assertEqual([item["word"] for item in cleaned], ["choices:", "ready"])
        self.assertLessEqual(cleaned[0]["end"], cleaned[1]["start"])

    def test_diff_chunks_compares_by_index_checksum(self):
        history = {"chunks": [{"checksum": compute_checksum("one")}, {"checksum": compute_checksum("two")}]}
        changed, unchanged = diff_chunks(["one", "changed"], history)
        self.assertEqual(unchanged, [0])
        self.assertEqual(changed, [1])


if __name__ == "__main__":
    unittest.main()
