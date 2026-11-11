---
id: TASK-064
title: 'Release prep: v0.4.0 (verify, changelog, tag, tarball; maintainer publishes)'
status: In Progress
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-11T02:52:00Z'
labels:
  - release
milestone: m-1
dependencies:
  - TASK-063
documentation:
  - errorset-audit.md
priority: high
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Release prep for v0.4.0 (breaking).

## Implementation
1. Every other m-1 task is Done. In `tests/regression/`, only cases explicitly assigned to v0.5.0 (A5, A9) may remain `test.failing`.
2. The CHANGELOG `[Unreleased]` section starts with **Breaking changes** and links `docs/migration-0.4.md`.
3. On `release/v0.4.0`, run `bun run release:prepare 0.4.0`.
4. Follow the maintainer-authorized merge procedure: push, PR with the ci-local tables, merge without squashing, push the tag. **Do not publish.** Put the publish commands and the SHA-512 in the notes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All other v0.4.0 tasks Done; only v0.5.0-assigned regression cases remain test.failing
- [ ] #2 CHANGELOG [0.4.0] leads with Breaking changes and links the migration guide
- [ ] #3 release:prepare 0.4.0 produced commit, tag, ci-local PASS on tag and branch, verified tarball, SHA-512 and RELEASE_NOTES.md
- [ ] #4 Release PR merged without squash and tag pushed (if authorized); publish commands in notes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Verify all other m-1 tasks Done (060 AC #3 is the not-applicable branch of a conditional) and only A5/A9 remain test.failing.
2. CHANGELOG: add a migration-guide link at the top of [Unreleased] > Breaking changes; commit.
3. bun run release:prepare 0.4.0 on release/v0.4.0 (commit, annotated tag, ci-local on tag, worktree build/pack/validate/SHA512SUMS/consumer smoke/RELEASE_NOTES).
4. ci-local on the branch head; push branch; PR with CHANGELOG section + task IDs; comment with both ci-local tables; merge --merge; pull main; verify tag ancestor of main; push tag.
5. Notes with tarball path, SHA-512 and maintainer publish commands; Done; commit on main; push main; create release/v0.5.0.
<!-- SECTION:PLAN:END -->
