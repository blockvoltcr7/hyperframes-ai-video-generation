#!/usr/bin/env python3
"""Validate the project's small OKF v0.1 documentation bundle."""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path


RECOMMENDED_FIELDS = ("title", "description", "resource", "tags", "timestamp")


def frontmatter(path: Path) -> tuple[dict[str, str], list[str]]:
    lines = path.read_text(encoding="utf-8").splitlines()
    errors: list[str] = []
    if not lines or lines[0].strip() != "---":
        return {}, ["missing YAML frontmatter"]
    try:
        end = next(index for index, line in enumerate(lines[1:], start=1) if line.strip() == "---")
    except StopIteration:
        return {}, ["unterminated YAML frontmatter"]

    values: dict[str, str] = {}
    for line_number, line in enumerate(lines[1:end], start=2):
        if not line.strip() or line.lstrip().startswith("#"):
            continue
        match = re.match(r"^([A-Za-z_][A-Za-z0-9_-]*):(?:\s*)(.*)$", line)
        if not match:
            errors.append(f"line {line_number}: unsupported frontmatter line")
            continue
        values[match.group(1)] = match.group(2).strip().strip("'\"")
    if not values.get("type"):
        errors.append("frontmatter requires a non-empty type")
    return values, errors


def validate(bundle: Path, strict_recommended: bool) -> list[str]:
    errors: list[str] = []
    if not bundle.is_dir():
        return [f"bundle does not exist: {bundle}"]
    markdown_files = sorted(bundle.rglob("*.md"))
    for path in markdown_files:
        if path.name in {"index.md", "log.md"}:
            continue
        values, file_errors = frontmatter(path)
        relative = path.relative_to(bundle)
        errors.extend(f"{relative}: {error}" for error in file_errors)
        if strict_recommended:
            errors.extend(
                f"{relative}: missing recommended field {field}"
                for field in RECOMMENDED_FIELDS
                if not values.get(field)
            )
    if not (bundle / "index.md").exists():
        errors.append("bundle is missing index.md")
    if not (bundle / "log.md").exists():
        errors.append("bundle is missing log.md")
    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("bundle", type=Path)
    parser.add_argument("--strict-recommended", action="store_true")
    args = parser.parse_args()
    errors = validate(args.bundle, args.strict_recommended)
    if errors:
        print("OKF validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1
    print(f"OKF validation passed: {args.bundle}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
