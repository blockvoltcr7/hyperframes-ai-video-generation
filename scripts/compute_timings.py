"""Compute HyperFrames composition timings from a generated video's script and
transcript.

Reads:
  videos/<slug>/script.txt        — narration source with optional SSML <break>
                                    tags and blank-line-separated phase blocks.
  videos/<slug>/transcript.json   — word-level alignment from elevenlabs-tts.py.

Emits a JSON object on stdout with every timing value the playbook's step 8
edits into ``index.html``. Run before patching ``index.html`` so the values
are derived from the actual audio, not template defaults.

Usage:
  python scripts/compute_timings.py videos/<slug> [--slam-word AGENTIC]

The slam word is the phase-1 ALL-CAPS payoff word the hero animation locks
to. Defaults to AGENTIC (the Archon template's default); pass --slam-word
for other templates or alternate slam words.

Why this script exists:
  - ``<break time="…s"/>`` tokens in script.txt aren't spoken words, so phase
    word counts must strip them before matching against transcript.json.
  - The transcript may still contain phantom punctuation entries even after
    ``clean_sync_data`` filters most of them; we filter again here defensively.
  - The same arithmetic was re-implemented inline several times during early
    iteration on this template. Centralizing it here prevents drift between
    one-off Python snippets.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path


_HTML_COMMENT_RE = re.compile(r'<!--.*?-->', re.DOTALL)
_BREAK_TAG_RE = re.compile(r'<break\s[^>]*/?>', re.IGNORECASE)
_LETTER_OR_DIGIT_RE = re.compile(r'[A-Za-z0-9]')


def strip_breaks(text: str) -> str:
    return _BREAK_TAG_RE.sub('', text)


def strip_html_comments(text: str) -> str:
    """Remove `<!-- ... -->` blocks (multi-line aware).

    Playbooks prepend a pronunciation-overrides comment header to script.txt
    for human readers. Without stripping it here, the comment block would be
    counted as an additional phase (4 narration phases + 1 comment = 5), and
    the phase-count assertion below would fail.
    """
    return _HTML_COMMENT_RE.sub('', text)


def real_token_count(text: str) -> int:
    """Count tokens that contain at least one letter or digit.

    Filters em-dashes and other standalone punctuation that ``re.findall(r'\\S+')``
    would otherwise count as a word, throwing off phase boundaries.
    """
    return len([t for t in re.findall(r'\S+', text) if _LETTER_OR_DIGIT_RE.search(t)])


def split_phases(script: str) -> list[str]:
    """Split script.txt into phase blocks on blank lines.

    Strips HTML comments first (so the pronunciation-overrides header doesn't
    register as a phase), then SSML `<break>` tags (not spoken words).
    """
    cleaned = strip_html_comments(script)
    return [strip_breaks(b).strip() for b in re.split(r'\n\s*\n', cleaned) if b.strip()]


def filter_real_words(transcript: list[dict]) -> list[dict]:
    """Drop entries whose word has no letter or digit (phantom punctuation)."""
    return [w for w in transcript if _LETTER_OR_DIGIT_RE.search(w['word'])]


def compute(project: Path, slam_word: str = 'AGENTIC', *, allow_drift: bool = False) -> dict:
    script_path = project / 'script.txt'
    transcript_path = project / 'transcript.json'

    raw_script = script_path.read_text(encoding='utf-8').strip()
    transcript = json.loads(transcript_path.read_text(encoding='utf-8'))

    phases = split_phases(raw_script)
    if len(phases) != 4:
        raise ValueError(
            f'expected 4 phase blocks in {script_path}, got {len(phases)}'
        )

    counts = [real_token_count(p) for p in phases]
    real = filter_real_words(transcript)

    if sum(counts) != len(real):
        mismatch = (
            f'script tokens ({sum(counts)}) != transcript words ({len(real)})'
        )
        if not allow_drift:
            raise ValueError(
                f'{mismatch}; pass --allow-drift to continue with drifted phase boundaries'
            )
        print(
            f'[compute_timings] WARN {mismatch}; phase boundaries may drift',
            file=sys.stderr,
        )

    cum = 0
    phase_ends: list[float] = []
    for n in counts:
        cum += n
        cum = min(cum, len(real))
        phase_ends.append(real[cum - 1]['end'])
    p1e, p2e, p3e, p4e = phase_ends

    total = round(p4e + 1.5, 1)
    T1 = round(p1e - 0.2, 2)
    T2 = round(p2e - 0.2, 2)
    T3 = round(p3e - 0.2, 2)
    P2 = round(T1 + 0.4, 2)
    P3 = round(T2 + 0.4, 2)
    P4 = round(T3 + 0.4, 2)

    slam = slam_word.upper()
    phase1_words = real[: counts[0]]
    slam_idx = next(
        (i for i, w in enumerate(phase1_words) if w['word'].upper().strip('.,!?') == slam),
        None,
    )
    if slam_idx is None:
        raise ValueError(
            f'slam word {slam!r} not found in phase 1 of transcript. '
            f'Pass --slam-word to override (current: {slam}).'
        )
    slam_t = round(real[slam_idx]['start'], 3)
    shake = [round(slam_t + i * 0.05, 3) for i in range(4)]
    grad_dur = round(p1e - slam_t - 0.5, 1)
    hero_entrance = round(slam_t - 0.4, 2)

    return {
        'phase_word_counts': counts,
        'phase_ends': [round(t, 3) for t in phase_ends],
        'total_duration': total,
        'narration_data_duration': round(p4e, 2),
        'T1': T1, 'T2': T2, 'T3': T3,
        'P2': P2, 'P3': P3, 'P4': P4,
        'slam_t': slam_t,
        'hero_entrance': hero_entrance,
        'shake_offsets': shake,
        'gradient_drift_duration': grad_dur,
        'ambient_breath_half_period': round(total / 2, 2),
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument('project', type=Path,
                        help='Path to videos/<slug>/')
    parser.add_argument('--slam-word', default='AGENTIC',
                        help='Phase-1 ALL-CAPS slam word (default: AGENTIC)')
    parser.add_argument('--json', action='store_true',
                        help='Emit a single JSON object instead of key=value lines')
    parser.add_argument('--allow-drift', action='store_true',
                        help='Continue when script token counts do not match the transcript')
    args = parser.parse_args()

    project = args.project.resolve()
    if not project.exists():
        print(f'ERROR: {project} does not exist', file=sys.stderr)
        return 2

    result = compute(project, slam_word=args.slam_word, allow_drift=args.allow_drift)

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        for k, v in result.items():
            print(f'{k}={v}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
