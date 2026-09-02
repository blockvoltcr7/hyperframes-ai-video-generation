import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))

from compute_timings import compute, split_phases  # noqa: E402


def write_project(script: str, words: list[dict]) -> Path:
    directory = Path(tempfile.mkdtemp(prefix="compute-timings-"))
    (directory / "script.txt").write_text(script, encoding="utf-8")
    (directory / "transcript.json").write_text(json.dumps(words), encoding="utf-8")
    return directory


def words_for(*tokens: str) -> list[dict]:
    entries = []
    start = 0.0
    for token in tokens:
        entries.append({"word": token, "start": start, "end": start + 0.4})
        start += 0.4
    return entries


class ComputeTimingsTest(unittest.TestCase):
    def test_split_phases_ignores_comment_header(self):
        script = "<!-- pronunciation -->\n\nOne two.\n\nThree four.\n\nFive six.\n\nSeven eight."
        self.assertEqual(len(split_phases(script)), 4)

    def test_fails_closed_on_token_transcript_mismatch(self):
        project = write_project(
            "Alpha beta.\n\nGamma delta.\n\nEpsilon zeta.\n\nEta theta.",
            words_for("Alpha", "beta", "Gamma"),
        )
        with self.assertRaisesRegex(ValueError, "pass --allow-drift"):
            compute(project, slam_word="ALPHA")

    def test_allow_drift_continues_on_mismatch(self):
        project = write_project(
            "Alpha beta.\n\nGamma delta.\n\nEpsilon zeta.\n\nEta theta.",
            words_for("Alpha", "beta", "Gamma", "delta", "Epsilon", "zeta", "Eta"),
        )
        result = compute(project, slam_word="ALPHA", allow_drift=True)
        self.assertIn("T1", result)
        self.assertEqual(result["slam_t"], 0.0)

    def test_slam_word_must_appear_in_phase_one(self):
        project = write_project(
            "Alpha beta.\n\nGamma NOW.\n\nEpsilon zeta.\n\nEta theta.",
            words_for("Alpha", "beta", "Gamma", "NOW", "Epsilon", "zeta", "Eta", "theta"),
        )
        with self.assertRaisesRegex(ValueError, "not found in phase 1"):
            compute(project, slam_word="NOW")

    def test_phase_one_slam_word_is_used(self):
        project = write_project(
            "Alpha AGENTIC.\n\nGamma delta.\n\nEpsilon zeta.\n\nEta AGENTIC.",
            words_for("Alpha", "AGENTIC", "Gamma", "delta", "Epsilon", "zeta", "Eta", "AGENTIC"),
        )
        result = compute(project, slam_word="AGENTIC")
        self.assertEqual(result["slam_t"], 0.4)


if __name__ == "__main__":
    unittest.main()
