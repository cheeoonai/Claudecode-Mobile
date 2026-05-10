#!/bin/bash
set -euo pipefail

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

SKILL_DIR="$HOME/.claude/skills/follow-builders"
REPO_URL="https://github.com/zarazhangrui/follow-builders.git"

if [ ! -d "$SKILL_DIR/.git" ]; then
  rm -rf "$SKILL_DIR"
  mkdir -p "$(dirname "$SKILL_DIR")"
  git clone --quiet --depth 1 "$REPO_URL" "$SKILL_DIR"
fi

if [ -f "$SKILL_DIR/scripts/package.json" ]; then
  (cd "$SKILL_DIR/scripts" && npm install --silent --no-audit --no-fund --no-progress)
fi
