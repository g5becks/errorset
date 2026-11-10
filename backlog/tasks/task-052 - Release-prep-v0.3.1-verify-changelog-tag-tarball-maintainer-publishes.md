---
id: TASK-052
title: 'Release prep: v0.3.1 (verify, changelog, tag, tarball; maintainer publishes)'
status: In Progress
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-10T19:41:00Z'
labels:
  - release
milestone: m-0
dependencies:
  - TASK-040
  - TASK-041
  - TASK-042
  - TASK-043
  - TASK-044
  - TASK-045
  - TASK-046
  - TASK-047
  - TASK-048
  - TASK-049
  - TASK-050
  - TASK-051
documentation:
  - errorset-audit.md
priority: high
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Release prep for v0.3.1 (non-breaking).

## Implementation
1. Confirm every other m-0 task is Done, and that the full gate and `scripts/ci-local.sh HEAD` pass.
2. Review `[Unreleased]`: it must contain no breaking changes. The deprecations are listed under "Deprecated".
3. On branch `release/v0.3.1`, run `bun run release:prepare 0.3.1`.
4. Then follow the maintainer-authorized merge procedure from the agent's instructions: push the branch, open a PR with the ci-local tables as a comment, merge without squashing, push the tags (including the retroactive ones). **Do not publish**; put the exact publish commands and the SHA-512 in the notes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 All other v0.3.1 tasks are Done; [Unreleased] has no breaking changes
- [ ] #2 release:prepare 0.3.1 produced commit, tag v0.3.1, ci-local PASS on tag and branch, a verified tarball, SHA-512 and RELEASE_NOTES.md
- [ ] #3 Release PR merged without squash and tags pushed (if authorized); the npm publish commands are in the notes for the maintainer
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Confirm TASK-040..051 Done; review [Unreleased] (no breaking changes; deprecations under Deprecated); tidy section order.
2. Gate + ci-local HEAD (done for 744ae4f; rerun on the release tag via release:prepare and on the branch).
3. bun run release:prepare 0.3.1 on release/v0.3.1 (clean tree).
4. ci-local release/v0.3.1; push branch; PR to main (body: CHANGELOG section + task IDs); comment with both ci-local tables; merge --merge.
5. switch main, pull --ff-only, verify v0.3.1 is an ancestor of main; push v0.3.1 and the retroactive tags v0.1.0, v0.2.1, v0.3.0.
6. Notes: PR, merge commit, tag, tarball path, SHA-512, publish pending maintainer; Done; commit on main; push main. Create release/v0.4.0.
<!-- SECTION:PLAN:END -->
