---
id: TASK-076
title: >-
  Release prep: v0.5.0 (verify, docs, changelog, tag, tarball; maintainer
  publishes)
status: In Progress
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-11T04:05:00Z'
labels:
  - release
milestone: m-2
dependencies:
  - TASK-074
  - TASK-075
documentation:
  - errorset-audit.md
priority: high
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Release prep for v0.5.0 (additive).

## Implementation
1. Every other m-2 task is Done, and no `test.failing` remains anywhere.
2. The README and the generated LLMS.txt cover the new APIs (`from`, `merge`, per-kind keys, `toError`, interpolation).
3. On `release/v0.5.0`, run `bun run release:prepare 0.5.0`.
4. Follow the maintainer-authorized merge procedure: push, PR, merge without squashing, push the tag. **Do not publish**; put the publish commands and the SHA-512 in the notes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 All other v0.5.0 tasks Done; no test.failing remains
- [ ] #2 README and generated LLMS.txt document the new APIs
- [ ] #3 release:prepare 0.5.0 produced commit, tag, ci-local PASS on tag and branch, verified tarball, SHA-512 and RELEASE_NOTES.md
- [ ] #4 Release PR merged without squash and tag pushed (if authorized); publish commands in notes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Preconditions: all other m-2 tasks Done; no test.failing anywhere (only comment mentions; update the regression-suite header); README + generated LLMS.txt document from, merge, per-kind keys, toError, interpolation (checked; LLMS fresh).
2. bun run release:prepare 0.5.0 on release/v0.5.0 (commit, tag, ci-local on the tag, worktree build/pack/validate, SHA512SUMS, consumer smoke, RELEASE_NOTES.md); make relative links in RELEASE_NOTES.md absolute.
3. ci-local on the branch; push; PR with the CHANGELOG section + task IDs; ci-local tables as a comment; merge --merge; pull main; verify the tag is an ancestor; push the tag. Do not publish.
4. Notes with tarball, SHA-512 and maintainer commands; Done; commit on main; push main.
<!-- SECTION:PLAN:END -->
