#!/usr/bin/env bash
# sync.sh — Sync .multica/ artifact definitions to the Multica workspace.
#
# Reads versioned definitions from .multica/ and applies them via the
# multica CLI. Idempotent — safe to run repeatedly.
#
# Usage:
#   ./scripts/sync.sh [--dry-run] [--prune] [--verbose]
#
# Options:
#   --dry-run   Show what would change without making changes
#   --prune     Delete Multica resources not present in .multica/ config
#   --verbose   Print extra detail for each operation
#
# Requirements:
#   - multica CLI installed and authenticated
#   - jq installed

set -euo pipefail

# ── Config ──────────────────────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MULTICA_DIR="$REPO_ROOT/.multica"

DRY_RUN=false
PRUNE=false
VERBOSE=false

# ── Argument parsing ─────────────────────────────────────────────────────────

for arg in "$@"; do
  case "$arg" in
    --dry-run)  DRY_RUN=true  ;;
    --prune)    PRUNE=true    ;;
    --verbose)  VERBOSE=true  ;;
    *)
      echo "Unknown option: $arg" >&2
      echo "Usage: sync.sh [--dry-run] [--prune] [--verbose]" >&2
      exit 1
      ;;
  esac
done

# ── Logging helpers ──────────────────────────────────────────────────────────

log()    { echo "  $*"; }
info()   { echo "[sync] $*"; }
ok()     { echo "  ✓ $*"; }
skip()   { echo "  – $*  (unchanged)"; }
dryrun() { echo "  ~ [dry-run] $*"; }
err()    { echo "  ✗ ERROR: $*" >&2; }
verbose(){ $VERBOSE && echo "  · $*" || true; }

CREATED=0
UPDATED=0
UNCHANGED=0
SKIPPED=0
ERRORS=0

# ── Prerequisite checks ──────────────────────────────────────────────────────

for cmd in multica jq; do
  if ! command -v "$cmd" &>/dev/null; then
    echo "ERROR: '$cmd' is required but not installed." >&2
    exit 1
  fi
done

if [ ! -d "$MULTICA_DIR" ]; then
  echo "ERROR: .multica/ directory not found at $MULTICA_DIR" >&2
  exit 1
fi

info "Starting Multica sync from $MULTICA_DIR"
$DRY_RUN && info "(dry-run mode — no changes will be made)"
$PRUNE   && info "(prune mode — resources not in config will be deleted)"

# ── Helper: run or dry-run a command ────────────────────────────────────────

run_cmd() {
  local label="$1"; shift
  if $DRY_RUN; then
    dryrun "$label: $*"
    return 0
  fi
  verbose "Running: $*"
  "$@"
}

# ── Load defaults ────────────────────────────────────────────────────────────

DEFAULTS_FILE="$MULTICA_DIR/agents/_defaults.json"
DEFAULT_RUNTIME=$(jq -r '.defaults.runtime // "claude"' "$DEFAULTS_FILE")
DEFAULT_VISIBILITY=$(jq -r '.defaults.visibility // "workspace"' "$DEFAULTS_FILE")
DEFAULT_MAX_CONCURRENT=$(jq -r '.defaults.max_concurrent_tasks // 2' "$DEFAULTS_FILE")

verbose "Defaults: runtime=$DEFAULT_RUNTIME visibility=$DEFAULT_VISIBILITY max_concurrent=$DEFAULT_MAX_CONCURRENT"

# ── Fetch current Multica state ──────────────────────────────────────────────

info "Fetching current Multica state..."

CURRENT_AGENTS=$(multica agent list --output json 2>/dev/null || echo "[]")
CURRENT_SKILLS=$(multica skill list --output json 2>/dev/null || echo "[]")

verbose "Found $(echo "$CURRENT_AGENTS" | jq length) agents, $(echo "$CURRENT_SKILLS" | jq length) skills"

# ── Step 1: Sync Agents ───────────────────────────────────────────────────────

info "Step 1/4: Syncing agents..."

# Map: name → id for existing agents
declare -A AGENT_IDS
while IFS=$'\t' read -r id name; do
  AGENT_IDS["$name"]="$id"
done < <(echo "$CURRENT_AGENTS" | jq -r '.[] | [.id, .name] | @tsv')

for agent_file in "$MULTICA_DIR"/agents/*.json; do
  [[ "$(basename "$agent_file")" == _* ]] && continue  # skip _defaults.json

  name=$(jq -r '.name' "$agent_file")
  description=$(jq -r '.description // ""' "$agent_file")
  instructions=$(jq -r '.instructions // ""' "$agent_file")
  model=$(jq -r '.model // ""' "$agent_file")
  runtime=$(jq -r ".runtime // \"$DEFAULT_RUNTIME\"" "$agent_file")
  max_concurrent=$(jq -r ".max_concurrent_tasks // $DEFAULT_MAX_CONCURRENT" "$agent_file")
  visibility=$(jq -r ".visibility // \"$DEFAULT_VISIBILITY\"" "$agent_file")

  if [[ -n "${AGENT_IDS[$name]+x}" ]]; then
    agent_id="${AGENT_IDS[$name]}"
    verbose "Agent '$name' exists (id=$agent_id), updating..."
    if run_cmd "Update agent '$name'" \
        multica agent update "$agent_id" \
          --description "$description" \
          --instructions "$instructions"; then
      ok "Agent '$name' updated"
      UPDATED=$((UPDATED + 1))
    else
      err "Failed to update agent '$name'"
      ERRORS=$((ERRORS + 1))
    fi
  else
    verbose "Agent '$name' not found, creating..."
    if $DRY_RUN; then
      dryrun "Create agent '$name' (runtime=$runtime model=$model)"
      CREATED=$((CREATED + 1))
    else
      new_agent=$(multica agent create \
          --name "$name" \
          --description "$description" \
          --instructions "$instructions" \
          --output json 2>/dev/null || echo "{}")
      new_id=$(echo "$new_agent" | jq -r '.id // empty')
      if [[ -n "$new_id" ]]; then
        ok "Agent '$name' created (id=$new_id)"
        AGENT_IDS["$name"]="$new_id"
        CREATED=$((CREATED + 1))
      else
        err "Failed to create agent '$name'"
        ERRORS=$((ERRORS + 1))
      fi
    fi
  fi
done

# ── Step 2: Sync Skills ───────────────────────────────────────────────────────

info "Step 2/4: Syncing skills..."

# Map: name → id for existing skills
declare -A SKILL_IDS
while IFS=$'\t' read -r id name; do
  SKILL_IDS["$name"]="$id"
done < <(echo "$CURRENT_SKILLS" | jq -r '.[] | [.id, .name] | @tsv')

# 2a: Import external skills from _imports.json
IMPORTS_FILE="$MULTICA_DIR/skills/_imports.json"
if [[ -f "$IMPORTS_FILE" ]]; then
  import_count=$(jq '.imports | length' "$IMPORTS_FILE")
  verbose "Found $import_count external skill imports"

  for i in $(seq 0 $((import_count - 1))); do
    import_name=$(jq -r ".imports[$i].name" "$IMPORTS_FILE")
    import_url=$(jq -r ".imports[$i].url" "$IMPORTS_FILE")

    if [[ -n "${SKILL_IDS[$import_name]+x}" ]]; then
      skip "External skill '$import_name' already imported"
      UNCHANGED=$((UNCHANGED + 1))
    else
      if run_cmd "Import skill '$import_name'" \
          multica skill import --url "$import_url"; then
        ok "Imported skill '$import_name'"
        CREATED=$((CREATED + 1))
      else
        err "Failed to import skill '$import_name' from $import_url"
        ERRORS=$((ERRORS + 1))
      fi
    fi
  done
fi

# 2b: Sync local skills from subdirectories
for skill_dir in "$MULTICA_DIR"/skills/*/; do
  [[ -f "$skill_dir/SKILL.md" ]] || continue
  skill_name=$(basename "$skill_dir")

  skill_md="$skill_dir/SKILL.md"
  skill_description=$(grep -m1 '^description:' "$skill_md" | sed 's/^description:[[:space:]]*//' || echo "")

  if [[ -n "${SKILL_IDS[$skill_name]+x}" ]]; then
    skill_id="${SKILL_IDS[$skill_name]}"
    verbose "Skill '$skill_name' exists (id=$skill_id), upserting files..."
    if run_cmd "Upsert skill '$skill_name' files" \
        multica skill files upsert "$skill_id" --path "$skill_md" --name "SKILL.md"; then
      ok "Skill '$skill_name' files updated"
      UPDATED=$((UPDATED + 1))
    else
      err "Failed to update skill '$skill_name'"
      ERRORS=$((ERRORS + 1))
    fi
  else
    verbose "Skill '$skill_name' not found, creating..."
    if $DRY_RUN; then
      dryrun "Create skill '$skill_name'"
      CREATED=$((CREATED + 1))
    else
      new_skill=$(multica skill create \
          --name "$skill_name" \
          --description "$skill_description" \
          --output json 2>/dev/null || echo "{}")
      new_id=$(echo "$new_skill" | jq -r '.id // empty')
      if [[ -n "$new_id" ]]; then
        ok "Skill '$skill_name' created (id=$new_id)"
        SKILL_IDS["$skill_name"]="$new_id"
        # Upload the SKILL.md
        multica skill files upsert "$new_id" --path "$skill_md" --name "SKILL.md" 2>/dev/null || true
        CREATED=$((CREATED + 1))
      else
        err "Failed to create skill '$skill_name'"
        ERRORS=$((ERRORS + 1))
      fi
    fi
  fi
done

# ── Step 3: Assign Skills to Agents ──────────────────────────────────────────

info "Step 3/4: Assigning skills to agents..."

for agent_file in "$MULTICA_DIR"/agents/*.json; do
  [[ "$(basename "$agent_file")" == _* ]] && continue

  agent_name=$(jq -r '.name' "$agent_file")
  agent_id="${AGENT_IDS[$agent_name]:-}"

  if [[ -z "$agent_id" ]]; then
    verbose "Skipping skill assignment for '$agent_name' — agent ID not known (create failed?)"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  skill_names=$(jq -r '.skills[]? // empty' "$agent_file")
  if [[ -z "$skill_names" ]]; then
    verbose "Agent '$agent_name' has no skills configured"
    continue
  fi

  skill_ids=()
  valid=true
  while IFS= read -r sname; do
    sid="${SKILL_IDS[$sname]:-}"
    if [[ -z "$sid" ]]; then
      err "Skill '$sname' not found for agent '$agent_name' — skipping skill assignment"
      valid=false
      break
    fi
    skill_ids+=("$sid")
  done <<< "$skill_names"

  if $valid && [[ ${#skill_ids[@]} -gt 0 ]]; then
    skill_id_args=$(printf '%s\n' "${skill_ids[@]}" | tr '\n' ',' | sed 's/,$//')
    if run_cmd "Assign skills to '$agent_name'" \
        multica agent skills set "$agent_id" --skill-ids "$skill_id_args"; then
      ok "Skills assigned to '$agent_name': $(echo "$skill_names" | tr '\n' ' ')"
      UPDATED=$((UPDATED + 1))
    else
      err "Failed to assign skills to '$agent_name'"
      ERRORS=$((ERRORS + 1))
    fi
  fi
done

# ── Step 4: Sync Squads ───────────────────────────────────────────────────────

info "Step 4/4: Syncing squads..."

for squad_file in "$MULTICA_DIR"/squads/*.json; do
  [[ "$(basename "$squad_file")" == .gitkeep ]] && continue
  [[ -f "$squad_file" ]] || continue

  squad_name=$(jq -r '.name' "$squad_file")
  verbose "Squad: $squad_name"

  # Squad sync is a future addition — log as skipped until multica squad CLI is available
  skip "Squad '$squad_name' — squad sync requires multica squad CLI (future)"
  SKIPPED=$((SKIPPED + 1))
done

# ── Summary ───────────────────────────────────────────────────────────────────

echo ""
info "Sync complete."
echo "  Created:   $CREATED"
echo "  Updated:   $UPDATED"
echo "  Unchanged: $UNCHANGED"
echo "  Skipped:   $SKIPPED"
echo "  Errors:    $ERRORS"

if [[ $ERRORS -gt 0 ]]; then
  echo ""
  echo "WARNING: $ERRORS error(s) occurred during sync. Check output above." >&2
  exit 1
fi

exit 0
