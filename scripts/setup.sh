#!/usr/bin/env bash
# setup.sh — Bootstrap the local agent environment for this repo.
#
# Creates the ~/.agents/skills symlink so all agent runtimes (Claude Code,
# OpenCode, Kiro, etc.) can discover skills from a single canonical location.
#
# Usage:
#   ./scripts/setup.sh
#
# What it does:
#   1. Creates ~/.agents/ directory if it doesn't exist
#   2. Sets ~/.agents/skills → <repo-root>/skills/
#      (making core/ the canonical source of shared skills)
#   3. Creates <repo-root>/.agents/skills → ~/.agents/skills
#      (thin pointer per-repo, consistent with other repos)
#
# Run this once after cloning. Safe to re-run — idempotent.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SKILLS_DIR="$REPO_ROOT/skills"
AGENTS_HOME="${HOME}/.agents"

echo "[setup] Bootstrapping agent environment..."
echo "  Repo:          $REPO_ROOT"
echo "  Skills source: $SKILLS_DIR"
echo "  Agent home:    $AGENTS_HOME"

# ── Step 1: Create ~/.agents/ ────────────────────────────────────────────────

if [ ! -d "$AGENTS_HOME" ]; then
  mkdir -p "$AGENTS_HOME"
  echo "  ✓ Created $AGENTS_HOME"
else
  echo "  – $AGENTS_HOME already exists"
fi

# ── Step 2: ~/.agents/skills → <repo>/skills/ ────────────────────────────────

TARGET="$AGENTS_HOME/skills"
if [ -L "$TARGET" ]; then
  current_dest=$(readlink "$TARGET")
  if [ "$current_dest" = "$SKILLS_DIR" ]; then
    echo "  – ~/.agents/skills already points to $SKILLS_DIR"
  else
    echo "  ! ~/.agents/skills points to $current_dest — updating to $SKILLS_DIR"
    ln -sf "$SKILLS_DIR" "$TARGET"
    echo "  ✓ Updated ~/.agents/skills → $SKILLS_DIR"
  fi
elif [ -e "$TARGET" ]; then
  echo "  ! ~/.agents/skills exists but is not a symlink — skipping (manual resolution needed)"
  echo "    Remove $TARGET and re-run to create the symlink."
else
  ln -s "$SKILLS_DIR" "$TARGET"
  echo "  ✓ Created ~/.agents/skills → $SKILLS_DIR"
fi

# ── Step 3: <repo>/.agents/skills → ~/.agents/skills ────────────────────────

REPO_AGENTS_DIR="$REPO_ROOT/.agents"
REPO_SKILLS_LINK="$REPO_AGENTS_DIR/skills"

mkdir -p "$REPO_AGENTS_DIR"

if [ -L "$REPO_SKILLS_LINK" ]; then
  current_dest=$(readlink "$REPO_SKILLS_LINK")
  if [ "$current_dest" = "$TARGET" ]; then
    echo "  – .agents/skills already points to ~/.agents/skills"
  else
    ln -sf "$TARGET" "$REPO_SKILLS_LINK"
    echo "  ✓ Updated .agents/skills → ~/.agents/skills"
  fi
elif [ -e "$REPO_SKILLS_LINK" ]; then
  echo "  ! .agents/skills exists but is not a symlink — skipping"
else
  ln -s "$TARGET" "$REPO_SKILLS_LINK"
  echo "  ✓ Created .agents/skills → ~/.agents/skills"
fi

echo ""
echo "[setup] Done. Skill discovery path: ~/.agents/skills → $SKILLS_DIR"
echo "        Other repos can symlink their .agents/skills to ~/.agents/skills"
echo "        to inherit shared skills from core."
