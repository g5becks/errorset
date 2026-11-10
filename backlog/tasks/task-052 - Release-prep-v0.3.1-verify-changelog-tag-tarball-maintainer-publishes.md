---
id: TASK-052
title: 'Release prep: v0.3.1 (verify, changelog, tag, tarball; maintainer publishes)'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-10T19:49:00Z'
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
- [x] #2 release:prepare 0.3.1 produced commit, tag v0.3.1, ci-local PASS on tag and branch, a verified tarball, SHA-512 and RELEASE_NOTES.md
- [x] #3 Release PR merged without squash and tags pushed (if authorized); the npm publish commands are in the notes for the maintainer
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

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Outcome: v0.3.1 prepared, merged and tagged. npm publish pending maintainer (interactive 2FA).
- [Unreleased] review: no breaking API changes; deprecations under Deprecated; sections reordered (Added, Changed, Deprecated, Fixed); the engines entry now says it is advisory. Re-verified that TS 7.0.2 and 5.9.3 emit byte-identical declarations.
- release:prepare 0.3.1 (dry run first, then real): release commit 3767df2 "chore(release): prepare v0.3.1"; annotated tag v0.3.1 (object df1321d); ci-local on the tag: Verified with scripts/ci-local.sh (3767df2, PASS); ci-local on branch release/v0.3.1: Verified with scripts/ci-local.sh (3767df2, PASS) (separate CI_LOCAL_DIR). GitHub Actions unavailable (billing lock): PR checks failed with "The job was not started because your account is locked due to a billing issue" (0 steps).
- Tarball: /Users/takinprofit/Dev/errorset-release/v0.3.1/takinprofit-errorset-0.3.1.tgz (7 files: package.json, LICENSE, README.md, dist/{index.js,index.d.ts,types.d.ts,config.d.ts}); SHA-512 c4eab6cda25cdff9b1d255012aeb6f76ee3fff2092bb21beb5c68fe052adce3c79878b955c3c815279ebd6f49e9f074d75ac8b032c671c5e160e528c09dbccf5 (identical to the TASK-051 rehearsal: reproducible). RELEASE_NOTES.md, SHA512SUMS and CI_LOCAL.log are in the same directory; consumers passed (ESM/CJS on Bun and Node).
- PR https://github.com/g5becks/errorset/pull/1 (body: CHANGELOG section + task IDs; ci-local tables posted as a comment), merged with `gh pr merge 1 --merge` (no squash/rebase/admin): merge commit e9419adf761f08eed1eb1f79bb16a2b79df5ee21 at 2026-11-10T19:48:40Z. main fast-forwarded; v0.3.1, v0.3.0, v0.2.1, v0.1.0 verified ancestors of main.
- Tags pushed: v0.1.0 (8d09ce5), v0.2.1 (301f969), v0.3.0 (a627c65), v0.3.1 (3767df2).
- Maintainer commands:
  cd /Users/takinprofit/Dev/errorset-release/v0.3.1 && npm publish ./takinprofit-errorset-0.3.1.tgz --access public
  npm view @takinprofit/errorset@0.3.1 version
  gh release create v0.3.1 --verify-tag --title v0.3.1 --notes-file /Users/takinprofit/Dev/errorset-release/v0.3.1/RELEASE_NOTES.md
- npm publish pending maintainer (interactive 2FA).
<!-- SECTION:NOTES:END -->
