---
id: TASK-064
title: 'Release prep: v0.4.0 (verify, changelog, tag, tarball; maintainer publishes)'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-11T03:07:00Z'
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
- [x] #1 All other v0.4.0 tasks Done; only v0.5.0-assigned regression cases remain test.failing
- [x] #2 CHANGELOG [0.4.0] leads with Breaking changes and links the migration guide
- [x] #3 release:prepare 0.4.0 produced commit, tag, ci-local PASS on tag and branch, verified tarball, SHA-512 and RELEASE_NOTES.md
- [x] #4 Release PR merged without squash and tag pushed (if authorized); publish commands in notes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Verify all other m-1 tasks Done (060 AC #3 is the not-applicable branch of a conditional) and only A5/A9 remain test.failing.
2. CHANGELOG: add a migration-guide link at the top of [Unreleased] > Breaking changes; commit.
3. bun run release:prepare 0.4.0 on release/v0.4.0 (commit, annotated tag, ci-local on tag, worktree build/pack/validate/SHA512SUMS/consumer smoke/RELEASE_NOTES).
4. ci-local on the branch head; push branch; PR with CHANGELOG section + task IDs; comment with both ci-local tables; merge --merge; pull main; verify tag ancestor of main; push tag.
5. Notes with tarball path, SHA-512 and maintainer publish commands; Done; commit on main; push main; create release/v0.5.0.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Pre-checks: every other m-1 task Done (TASK-060 AC #3 is the not-applicable 'callable kept' branch, documented in its notes); tests/regression: only A5 [TASK-065] and A9 [TASK-067], both v0.5.0, remain test.failing.
- CHANGELOG: [Unreleased] > Breaking changes now opens with a link to docs/migration-0.4.md (9593eec); release:prepare rolled it to [0.4.0] (leads with Breaking changes).
- release:prepare 0.4.0: commit 316b084 'chore(release): prepare v0.4.0', annotated tag v0.4.0 (tag object d0a620a5187f55b5e81e2d2668985b8eb1f5bfbb -> 316b084e10adb503a5badb7e6c532a8e86bf61c5). Verified with scripts/ci-local.sh on the tag (316b084, PASS; CI_LOCAL.log) and on branch release/v0.4.0 (316b084, PASS; separate CI_LOCAL_DIR); GitHub Actions unavailable (billing lock). Worktree build, pack (7 files: package.json, LICENSE, README.md, dist/{index.js,index.d.ts,types.d.ts,config.d.ts}), archive-entry validation and packed consumer smoke (ESM+CJS, Bun and Node) passed.
- Tarball: /Users/takinprofit/Dev/errorset-release/v0.4.0/takinprofit-errorset-0.4.0.tgz; SHA-512 b7951d8b52aa70395184d2f135632dd479e1a53f98adb1d238c86cf07f34199cfc8bfc91deea3b14388fe99ac8c5b134df32ecaf58dd9fc0d45144f163b3c9cc (SHA512SUMS beside it). RELEASE_NOTES.md: the migration-guide link was changed to the absolute https://github.com/g5becks/errorset/blob/v0.4.0/docs/migration-0.4.md (relative links break on release pages); the file is outside the repo.
- PR https://github.com/g5becks/errorset/pull/2 (body = CHANGELOG section + task IDs; ci-local tables in a comment), merged with a merge commit (gh pr merge --merge): 0cacc30ee5c35ce825b72fdd6e8168d6f2b77835. Tag verified as an ancestor of main, then pushed. Not published.
- Maintainer commands:
  cd /Users/takinprofit/Dev/errorset-release/v0.4.0 && npm publish ./takinprofit-errorset-0.4.0.tgz --access public
  npm view @takinprofit/errorset@0.4.0 version
  gh release create v0.4.0 --verify-tag --title v0.4.0 --notes-file /Users/takinprofit/Dev/errorset-release/v0.4.0/RELEASE_NOTES.md
<!-- SECTION:NOTES:END -->
