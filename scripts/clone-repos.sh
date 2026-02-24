#!/bin/bash

# Clone all AprovanLabs repos defined in aprovan.code-workspace
# Ignores entries with a 'name' field and suppresses clone/pull errors

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKSPACE_FILE="$SCRIPT_DIR/../aprovan.code-workspace"
PARENT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

ORG="AprovanLabs"

# Parse workspace file: extract repo names from paths without a 'name' field
# Strip JSONC artifacts (trailing commas, comments) then use jq
repos=$(sed 's|//.*||' "$WORKSPACE_FILE" \
    | sed -E 's/,([[:space:]]*[}\]])/\1/g' \
    | jq -r '.folders[] | select(has("name") | not) | .path | split("/") | last' \
)

for repo in $repos; do
    target="$PARENT_DIR/$repo"
    if [ -d "$target/.git" ]; then
        echo "Pulling $repo..."
        git -C "$target" pull 2>/dev/null || true
    else
        echo "Cloning $ORG/$repo..."
        git clone "git@github.com:$ORG/$repo.git" "$target" 2>/dev/null || true
    fi
done
