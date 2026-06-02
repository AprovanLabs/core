---
name: symphony-review-merge
description: Phases 3-4 of the Symphony workflow — handling human review feedback and landing PRs. Use after routing determines Phase 3 (review response) or Phase 4 (merge).
triggers:
  - review
  - merge
  - PR feedback
  - review response
  - Phase 3
  - Phase 4
---

# Symphony Review & Merge Skill (Phases 3-4)

This skill handles the review and merge lifecycle: responding to PR feedback and landing approved PRs.

## Phase 3 — Review Response

### 3.1 Entry

You are here when:
- Issue status is `in_review`
- A PR exists
- Human reviewer(s) have left feedback

### 3.2 Read All Review Feedback

```bash
# Get PR number from metadata or workpad
PR_URL=$(multica issue metadata list <issue-id> --output json | jq -r '.pr_url')
PR_NUMBER=$(echo "$PR_URL" | grep -oE '[0-9]+$')

# Read comments and review feedback
gh pr view "$PR_NUMBER" --comments
gh pr reviews "$PR_NUMBER"
```

Also read inline code review comments:
```bash
gh api repos/{owner}/{repo}/pulls/$PR_NUMBER/comments --jq '.[].body'
```

### 3.3 Categorize Feedback

Before implementing, categorize each comment:
- **Must address**: change requests, correctness issues, security concerns
- **Should address**: design suggestions, style improvements
- **Optional**: nit-level suggestions, pure preference

If any feedback is unclear: reply with a clarifying question before changing code.

### 3.4 Address Feedback

**Critical rule**: Do NOT add speculative improvements unrelated to the review feedback. Only address what reviewers asked for.

For each piece of feedback:
1. Understand what the reviewer is asking
2. Implement the change (if you agree) or write a response (if you disagree)
3. Commit with a clear message: `review: address <reviewer-name>'s feedback on <topic>`
4. Reply to the review comment with "Addressed in <commit-sha>" or your reasoning

Do not force-push. Add new commits on top of the existing branch.

```bash
# After making changes
git add <specific files>
git commit -m "review: <short description of what was addressed>"
git push
```

### 3.5 Confirm CI

After pushing review changes, confirm CI is still passing:
```bash
gh pr checks <number>
```

Wait for CI to complete before re-requesting review.

### 3.6 Re-Request Review

Once all feedback is addressed and CI is green:

```bash
# Mark review as resolved and re-request
gh pr review <number> --request-review <reviewer-username>
```

Update issue status:
```bash
multica issue status <issue-id> in_review
```

Update workpad with review round:
```
**Review Round:** 2
**Status:** Addressed all feedback — awaiting re-review
```

Post a brief result comment:
```bash
multica issue comment add <issue-id> --content "Review feedback addressed (Round 2). Re-requested review. CI green."
```

### 3.7 If Approved

When all required reviewers approve → proceed to Phase 4.

---

## Phase 4 — Merge

### 4.1 Entry

You are here when:
- PR is approved by all required reviewers
- CI is green on the current commit

### 4.2 Rebase If Behind Main

Check if the branch is behind:
```bash
git fetch origin
git log --oneline HEAD..origin/main | wc -l
```

If behind, rebase:
```bash
git rebase origin/main
git push --force-with-lease
```

Then confirm CI passes on the rebased state before merging:
```bash
gh pr checks <number>
# Wait for all checks to pass
```

### 4.3 Merge

Use squash merge to keep main history clean:
```bash
gh pr merge <number> --squash --delete-branch
```

The squash commit message should summarize the entire PR, not just the last commit.

### 4.4 Post-Merge Cleanup

1. Transition issue to `done`:
   ```bash
   multica issue status <issue-id> done
   ```

2. Update workpad:
   ```
   **Phase:** Done
   **Status:** Merged — issue closed.
   ```

3. Update metadata — remove stale `pr_url` or mark pipeline status:
   ```bash
   multica issue metadata set <issue-id> --key pipeline_status --value "merged"
   ```
   Or delete the pr_url key if it's no longer needed:
   ```bash
   multica issue metadata delete <issue-id> --key pr_url
   ```

4. Post final result comment (mandatory):
   ```bash
   multica issue comment add <issue-id> --content "Merged and closed. <Optional: brief summary of what landed>"
   ```

**Exit Phase 4**: PR merged, branch deleted, issue `done`.

---

## Edge Cases

### PR Behind Main Fails to Rebase

If rebase has conflicts:
1. Resolve conflicts locally
2. `git add <resolved files>`
3. `git rebase --continue`
4. `git push --force-with-lease`
5. Confirm CI passes

If conflicts are complex: set status `blocked`, post a comment explaining the conflict and asking for human help.

### Reviewer Unavailable

If a required reviewer hasn't responded after a reasonable period (typically 48h for an agent-driven PR):
1. Post a comment noting the PR is ready and awaiting review
2. Leave issue in `in_review` — do not merge without approval

### PR Closed Without Merging

If a reviewer closes the PR instead of merging:
1. Read their comment for the reason
2. If the work should continue on a new approach: transition back to `in_progress`, update workpad with new direction
3. If the issue is cancelled: transition to `cancelled`
