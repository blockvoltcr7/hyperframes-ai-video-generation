import sys
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

from tts_lib import clean_sync_data, compute_checksum, diff_chunks, split_into_chunks  # noqa: E402


class TtsLibTest(unittest.TestCase):
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
