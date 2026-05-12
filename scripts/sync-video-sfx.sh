#!/usr/bin/env bash
# sync-video-sfx.sh — Copy SFX cues from shared/audio/sfx/ into a video's
# assets/sfx/. The HyperFrames bundler / preview server rejects paths outside
# a project's directory, so SFX must be local copies.
#
# Usage:
#   bash scripts/sync-video-sfx.sh <project_dir> [cue1 cue2 ...]
#   bash scripts/sync-video-sfx.sh <project_dir> --force [cue1 cue2 ...]
#
# If no cue names are given, reads <project_dir>/sfx-cues.txt (one cue per line,
# blank lines and `#` comments allowed).
#
# Cue names must match a file in shared/audio/sfx/<cue>.mp3 — see
# shared/audio/MANIFEST.md for the canonical list.
#
# Default copy mode is no-clobber (cp -n). Pass --force to overwrite.

set -euo pipefail

usage() {
  cat <<EOF
Usage: $(basename "$0") <project_dir> [--force] [cue1 cue2 ...]

  <project_dir>  Path to a HyperFrames video project (e.g. videos/my-short).
  --force        Overwrite existing files in <project_dir>/assets/sfx/.
  cue names      Cue names from shared/audio/MANIFEST.md (e.g. impact-slam).
                 If omitted, read from <project_dir>/sfx-cues.txt.

Examples:
  $(basename "$0") videos/my-short impact-slam scale-slam
  $(basename "$0") videos/my-short --force spring-pop
  $(basename "$0") videos/my-short              # reads sfx-cues.txt
EOF
}

if [ $# -lt 1 ] || [ "${1:-}" = "-h" ] || [ "${1:-}" = "--help" ]; then
  usage
  exit 1
fi

# Locate repo root
if REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"; then
  :
else
  REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
fi

LIB_DIR="$REPO_ROOT/shared/audio/sfx"

PROJECT_DIR="$1"
shift

# Normalize project dir relative to repo root if not absolute
if [[ "$PROJECT_DIR" != /* ]] && [[ "$PROJECT_DIR" != [A-Za-z]:* ]]; then
  PROJECT_DIR="$REPO_ROOT/$PROJECT_DIR"
fi

if [ ! -d "$PROJECT_DIR" ]; then
  echo "[sfx-sync] ERROR: project dir not found: $PROJECT_DIR" >&2
  exit 1
fi

# Optional --force flag (anywhere in the remaining args)
FORCE=0
ARGS=()
for arg in "$@"; do
  case "$arg" in
    --force) FORCE=1 ;;
    -*)
      echo "[sfx-sync] ERROR: unknown flag: $arg" >&2
      usage
      exit 1
      ;;
    *) ARGS+=("$arg") ;;
  esac
done

# Resolve cue list — CLI args take precedence over sfx-cues.txt
CUES=()
if [ "${#ARGS[@]}" -gt 0 ]; then
  CUES=("${ARGS[@]}")
else
  CUES_FILE="$PROJECT_DIR/sfx-cues.txt"
  if [ ! -f "$CUES_FILE" ]; then
    echo "[sfx-sync] ERROR: no cues given and $CUES_FILE not found" >&2
    echo "         Pass cue names as args or create the file (one cue per line)." >&2
    exit 1
  fi
  while IFS= read -r line || [ -n "$line" ]; do
    line="${line%%#*}"                 # strip inline comments
    line="$(echo "$line" | tr -d '[:space:]')"
    [ -n "$line" ] && CUES+=("$line")
  done < "$CUES_FILE"
fi

if [ "${#CUES[@]}" -eq 0 ]; then
  echo "[sfx-sync] ERROR: cue list is empty" >&2
  exit 1
fi

# Validate every cue exists in the library before copying anything
MISSING=()
for cue in "${CUES[@]}"; do
  if [ ! -f "$LIB_DIR/$cue.mp3" ]; then
    MISSING+=("$cue")
  fi
done

if [ "${#MISSING[@]}" -gt 0 ]; then
  echo "[sfx-sync] ERROR: cue(s) not in shared/audio/sfx/: ${MISSING[*]}" >&2
  echo "         Available cues:" >&2
  for f in "$LIB_DIR"/*.mp3; do
    [ -f "$f" ] && echo "           - $(basename "$f" .mp3)" >&2
  done
  echo "         See shared/audio/MANIFEST.md for the canonical list." >&2
  exit 1
fi

# Copy cues into the project's assets/sfx/
TARGET_DIR="$PROJECT_DIR/assets/sfx"
mkdir -p "$TARGET_DIR"

# Display project path relative to repo root for cleaner output
DISPLAY_PROJECT="${PROJECT_DIR#$REPO_ROOT/}"
[ "$DISPLAY_PROJECT" = "$PROJECT_DIR" ] && DISPLAY_PROJECT="$PROJECT_DIR"

for cue in "${CUES[@]}"; do
  src="$LIB_DIR/$cue.mp3"
  dst="$TARGET_DIR/$cue.mp3"
  if [ -f "$dst" ] && [ "$FORCE" -eq 0 ]; then
    echo "[sfx-sync] skipped $cue.mp3 (exists; pass --force to overwrite)"
    continue
  fi
  cp -f "$src" "$dst"
  echo "[sfx-sync] copied  $cue.mp3 → $DISPLAY_PROJECT/assets/sfx/"
done
