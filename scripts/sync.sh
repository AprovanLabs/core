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

# ── ID store (bash 3-compatible, no associative arrays) ─────────────────────
# Uses a temp directory: files named "${kind}_${sanitized_name}" hold IDs.
# In dry-run mode, planned-but-not-yet-created resources use id="dry-run"
# as a placeholder so downstream dependency steps can simulate correctly.

TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

_sanitize() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]' | tr ' ' '_' | tr -cd 'a-z0-9_-'
}

store_id() {
  # store_id <kind> <name> <id>
  local key
  key="$(_sanitize "$2")"
  printf '%s' "$3" > "$TMP_DIR/${1}_${key}"
}

get_id() {
  # get_id <kind> <name>  — prints stored ID or empty string
  local key file
  key="$(_sanitize "$2")"
  file="$TMP_DIR/${1}_${key}"
  [[ -f "$file" ]] && cat "$file" || printf ''
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
CURRENT_RUNTIMES=$(multica runtime list --output json 2>/dev/null || echo "[]")
CURRENT_SQUADS=$(multica squad list --output json 2>/dev/null || echo "[]")

verbose "Found $(echo "$CURRENT_AGENTS" | jq length) agents, $(echo "$CURRENT_SKILLS" | jq length) skills, $(echo "$CURRENT_RUNTIMES" | jq length) runtimes, $(echo "$CURRENT_SQUADS" | jq length) squads"

# Build runtime provider → id map (e.g. "claude" → UUID)
while IFS=$'\t' read -r rid rprovider; do
  store_id "runtime" "$rprovider" "$rid"
done < <(echo "$CURRENT_RUNTIMES" | jq -r '.[] | [.id, .provider] | @tsv')

# Build agent name → id map
while IFS=$'\t' read -r id name; do
  store_id "agent" "$name" "$id"
done < <(echo "$CURRENT_AGENTS" | jq -r '.[] | [.id, .name] | @tsv')

# Build skill name → id map
while IFS=$'\t' read -r id name; do
  store_id "skill" "$name" "$id"
done < <(echo "$CURRENT_SKILLS" | jq -r '.[] | [.id, .name] | @tsv')

# Build squad name → id map
while IFS=$'\t' read -r id name; do
  store_id "squad" "$name" "$id"
done < <(echo "$CURRENT_SQUADS" | jq -r '.[] | [.id, .name] | @tsv')

# ── Step 1: Sync Agents ───────────────────────────────────────────────────────

info "Step 1/4: Syncing agents..."

for agent_file in "$MULTICA_DIR"/agents/*.json; do
  [[ "$(basename "$agent_file")" == _* ]] && continue  # skip _defaults.json

  name=$(jq -r '.name' "$agent_file")
  description=$(jq -r '.description // ""' "$agent_file")
  instructions=$(jq -r '.instructions // ""' "$agent_file")
  model=$(jq -r '.model // ""' "$agent_file")
  runtime=$(jq -r ".runtime // \"$DEFAULT_RUNTIME\"" "$agent_file")
  max_concurrent=$(jq -r ".max_concurrent_tasks // $DEFAULT_MAX_CONCURRENT" "$agent_file")
  visibility=$(jq -r ".visibility // \"$DEFAULT_VISIBILITY\"" "$agent_file")

  # Resolve runtime provider name → workspace runtime UUID
  runtime_id=$(get_id "runtime" "$runtime")
  if [[ -z "$runtime_id" ]]; then
    err "Runtime provider '$runtime' not found in workspace — skipping agent '$name'"
    ERRORS=$((ERRORS + 1))
    continue
  fi

  agent_id=$(get_id "agent" "$name")

  if [[ -n "$agent_id" ]]; then
    verbose "Agent '$name' exists (id=$agent_id), updating..."
    if $DRY_RUN; then
      dryrun "Update agent '$name' (runtime=$runtime model=$model)"
      UPDATED=$((UPDATED + 1))
    elif multica agent update "$agent_id" \
          --description "$description" \
          --instructions "$instructions" \
          --model "$model" \
          --max-concurrent-tasks "$max_concurrent" \
          --visibility "$visibility" \
          --output json > /dev/null; then
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
      store_id "agent" "$name" "dry-run"  # placeholder for Step 3 dry-run simulation
      CREATED=$((CREATED + 1))
    else
      new_agent=$(multica agent create \
          --name "$name" \
          --description "$description" \
          --instructions "$instructions" \
          --runtime-id "$runtime_id" \
          --model "$model" \
          --max-concurrent-tasks "$max_concurrent" \
          --visibility "$visibility" \
          --output json 2>/dev/null || echo "{}")
      new_id=$(echo "$new_agent" | jq -r '.id // empty')
      if [[ -n "$new_id" ]]; then
        ok "Agent '$name' created (id=$new_id)"
        store_id "agent" "$name" "$new_id"
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

# 2a: Import external skills from _imports.json
IMPORTS_FILE="$MULTICA_DIR/skills/_imports.json"
if [[ -f "$IMPORTS_FILE" ]]; then
  import_count=$(jq '.imports | length' "$IMPORTS_FILE")
  verbose "Found $import_count external skill import(s)"

  for i in $(seq 0 $((import_count - 1))); do
    import_name=$(jq -r ".imports[$i].name" "$IMPORTS_FILE")
    import_url=$(jq -r ".imports[$i].url" "$IMPORTS_FILE")

    existing_id=$(get_id "skill" "$import_name")
    if [[ -n "$existing_id" ]]; then
      skip "External skill '$import_name' already imported"
      UNCHANGED=$((UNCHANGED + 1))
    else
      if $DRY_RUN; then
        dryrun "Import skill '$import_name' from $import_url"
        store_id "skill" "$import_name" "dry-run"
        CREATED=$((CREATED + 1))
      elif multica skill import --url "$import_url" --output json > /dev/null; then
        ok "Imported skill '$import_name'"
        CREATED=$((CREATED + 1))
      else
        err "Failed to import skill '$import_name' from $import_url"
        ERRORS=$((ERRORS + 1))
      fi
    fi
  done
fi

# 2b: Sync local SKILL.md files from subdirectories
for skill_dir in "$MULTICA_DIR"/skills/*/; do
  [[ -f "$skill_dir/SKILL.md" ]] || continue
  skill_name=$(basename "$skill_dir")
  skill_md="$skill_dir/SKILL.md"

  # Extract description from SKILL.md frontmatter (strip surrounding quotes if present)
  skill_description=$(awk '/^description:/{sub(/^description:[[:space:]]*/,""); gsub(/^"|"$/,""); print; exit}' "$skill_md")
  skill_content=$(cat "$skill_md")

  skill_id=$(get_id "skill" "$skill_name")

  if [[ -n "$skill_id" ]]; then
    verbose "Skill '$skill_name' exists (id=$skill_id), updating content..."
    if $DRY_RUN; then
      dryrun "Update skill '$skill_name'"
      UPDATED=$((UPDATED + 1))
    elif multica skill update "$skill_id" \
          --content "$skill_content" \
          --output json > /dev/null; then
      ok "Skill '$skill_name' updated"
      UPDATED=$((UPDATED + 1))
    else
      err "Failed to update skill '$skill_name'"
      ERRORS=$((ERRORS + 1))
    fi
  else
    verbose "Skill '$skill_name' not found, creating..."
    if $DRY_RUN; then
      dryrun "Create skill '$skill_name'"
      store_id "skill" "$skill_name" "dry-run"  # placeholder for Step 3 dry-run simulation
      CREATED=$((CREATED + 1))
    else
      new_skill=$(multica skill create \
          --name "$skill_name" \
          --description "$skill_description" \
          --content "$skill_content" \
          --output json 2>/dev/null || echo "{}")
      new_id=$(echo "$new_skill" | jq -r '.id // empty')
      if [[ -n "$new_id" ]]; then
        ok "Skill '$skill_name' created (id=$new_id)"
        store_id "skill" "$skill_name" "$new_id"
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
  agent_id=$(get_id "agent" "$agent_name")

  if [[ -z "$agent_id" ]]; then
    verbose "Skipping skill assignment for '$agent_name' — agent ID unknown (create may have failed)"
    SKIPPED=$((SKIPPED + 1))
    continue
  fi

  skill_names=$(jq -r '.skills[]? // empty' "$agent_file")
  if [[ -z "$skill_names" ]]; then
    verbose "Agent '$agent_name' has no skills configured"
    continue
  fi

  skill_ids=""
  valid=true
  while IFS= read -r sname; do
    [[ -z "$sname" ]] && continue
    sid=$(get_id "skill" "$sname")
    if [[ -z "$sid" ]]; then
      err "Skill '$sname' not found for agent '$agent_name' — skipping all skill assignments for this agent"
      valid=false
      break
    fi
    if [[ -z "$skill_ids" ]]; then
      skill_ids="$sid"
    else
      skill_ids="$skill_ids,$sid"
    fi
  done <<< "$skill_names"

  if $valid && [[ -n "$skill_ids" ]]; then
    if $DRY_RUN; then
      dryrun "Assign skills to '$agent_name': $(echo "$skill_names" | tr '\n' ' ')"
      UPDATED=$((UPDATED + 1))
    elif multica agent skills set "$agent_id" \
          --skill-ids "$skill_ids" \
          --output json > /dev/null; then
      ok "Skills assigned to '$agent_name': $(echo "$skill_names" | tr '\n' ' ')"
      UPDATED=$((UPDATED + 1))
    else
      err "Failed to assign skills to '$agent_name'"
      ERRORS=$((ERRORS + 1))
    fi
  elif ! $valid; then
    ERRORS=$((ERRORS + 1))
  fi
done

# ── Step 4: Sync Squads ───────────────────────────────────────────────────────

info "Step 4/4: Syncing squads..."

squad_file_count=0
for squad_file in "$MULTICA_DIR"/squads/*.json; do
  [[ -f "$squad_file" ]] || continue
  squad_name=$(jq -r '.name' "$squad_file" 2>/dev/null) || continue
  squad_description=$(jq -r '.description // ""' "$squad_file")
  squad_leader_ref=$(jq -r '.leader' "$squad_file")
  squad_file_count=$((squad_file_count + 1))

  # Resolve leader ref → agent ID
  # The ref is the filename stem (e.g. "architect") — find matching agent by
  # normalising to lowercase+hyphen and comparing against each agent's name.
  leader_id=$(echo "$CURRENT_AGENTS" | jq -r --arg ref "$squad_leader_ref" '
    .[] | select((.name | ascii_downcase | gsub(" "; "-")) == $ref) | .id' | head -1)
  if [[ -z "$leader_id" ]]; then
    err "Leader agent ref '$squad_leader_ref' not found for squad '$squad_name' — skipping"
    ERRORS=$((ERRORS + 1))
    continue
  fi

  squad_id=$(get_id "squad" "$squad_name")

  if [[ -n "$squad_id" ]]; then
    verbose "Squad '$squad_name' exists (id=$squad_id), updating..."
    if $DRY_RUN; then
      dryrun "Update squad '$squad_name'"
      UPDATED=$((UPDATED + 1))
    elif multica squad update "$squad_id" \
          --description "$squad_description" \
          --output json > /dev/null; then
      ok "Squad '$squad_name' updated"
      UPDATED=$((UPDATED + 1))
    else
      err "Failed to update squad '$squad_name'"
      ERRORS=$((ERRORS + 1))
      continue
    fi
  else
    verbose "Squad '$squad_name' not found, creating..."
    if $DRY_RUN; then
      dryrun "Create squad '$squad_name' (leader=$squad_leader_ref)"
      store_id "squad" "$squad_name" "dry-run"
      CREATED=$((CREATED + 1))
    else
      new_squad=$(multica squad create \
          --name "$squad_name" \
          --description "$squad_description" \
          --leader "$leader_id" \
          --output json 2>/dev/null || echo "{}")
      new_id=$(echo "$new_squad" | jq -r '.id // empty')
      if [[ -n "$new_id" ]]; then
        ok "Squad '$squad_name' created (id=$new_id)"
        store_id "squad" "$squad_name" "$new_id"
        squad_id="$new_id"
        CREATED=$((CREATED + 1))
      else
        err "Failed to create squad '$squad_name'"
        ERRORS=$((ERRORS + 1))
        continue
      fi
    fi
  fi

  # Sync members — read desired member refs from JSON
  member_count=$(jq '.members | length' "$squad_file")
  if [[ "$member_count" -eq 0 ]]; then
    verbose "Squad '$squad_name' has no members configured"
    continue
  fi

  # Fetch current members to avoid duplicate adds
  if [[ -n "$squad_id" ]] && ! $DRY_RUN; then
    current_members=$(multica squad member list "$squad_id" --output json 2>/dev/null || echo "[]")
  else
    current_members="[]"
  fi

  for i in $(seq 0 $((member_count - 1))); do
    member_ref=$(jq -r ".members[$i].ref" "$squad_file")
    member_role=$(jq -r ".members[$i].role // \"member\"" "$squad_file")

    # Resolve member ref → agent ID
    member_id=$(echo "$CURRENT_AGENTS" | jq -r --arg ref "$member_ref" '
      .[] | select((.name | ascii_downcase | gsub(" "; "-")) == $ref) | .id' | head -1)
    if [[ -z "$member_id" ]]; then
      err "Member agent ref '$member_ref' not found for squad '$squad_name' — skipping member"
      ERRORS=$((ERRORS + 1))
      continue
    fi

    # Check if already a member (field is member_id in the API response)
    already_member=$(echo "$current_members" | jq -r --arg id "$member_id" '
      any(.[]; .member_id == $id)')

    if [[ "$already_member" == "true" ]]; then
      skip "Member '$member_ref' already in squad '$squad_name'"
      UNCHANGED=$((UNCHANGED + 1))
    elif $DRY_RUN; then
      dryrun "Add member '$member_ref' to squad '$squad_name' (role=$member_role)"
      CREATED=$((CREATED + 1))
    elif multica squad member add "$squad_id" \
          --member-id "$member_id" \
          --role "$member_role" \
          --output json > /dev/null 2>&1; then
      ok "Added member '$member_ref' to squad '$squad_name'"
      CREATED=$((CREATED + 1))
    else
      err "Failed to add member '$member_ref' to squad '$squad_name'"
      ERRORS=$((ERRORS + 1))
    fi
  done
done

if [[ $squad_file_count -eq 0 ]]; then
  verbose "No squad definitions found"
fi

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
