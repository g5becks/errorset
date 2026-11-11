---
id: TASK-076
title: >-
  Release prep: v0.5.0 (verify, docs, changelog, tag, tarball; maintainer
  publishes)
status: Done
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-11T04:12:00Z'
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
- [x] #1 All other v0.5.0 tasks Done; no test.failing remains
- [x] #2 README and generated LLMS.txt document the new APIs
- [x] #3 release:prepare 0.5.0 produced commit, tag, ci-local PASS on tag and branch, verified tarball, SHA-512 and RELEASE_NOTES.md
- [x] #4 Release PR merged without squash and tag pushed (if authorized); publish commands in notes
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Preconditions: all other m-2 tasks Done; no test.failing anywhere (only comment mentions; update the regression-suite header); README + generated LLMS.txt document from, merge, per-kind keys, toError, interpolation (checked; LLMS fresh).
2. bun run release:prepare 0.5.0 on release/v0.5.0 (commit, tag, ci-local on the tag, worktree build/pack/validate, SHA512SUMS, consumer smoke, RELEASE_NOTES.md); make relative links in RELEASE_NOTES.md absolute.
3. ci-local on the branch; push; PR with the CHANGELOG section + task IDs; ci-local tables as a comment; merge --merge; pull main; verify the tag is an ancestor; push the tag. Do not publish.
4. Notes with tarball, SHA-512 and maintainer commands; Done; commit on main; push main.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Pre-checks: TASK-065..075 Done; no test.failing anywhere (only comments mention it; the regression-suite header now says every Appendix A case is a plain test since v0.5.0, 5ab422b); README and the generated LLMS.txt document from(), variadic merge with recover/inspect, per-kind keys ('Exact Data per Kind'), toError() and interpolation; LLMS.txt verified fresh (docs:llms + git diff --exit-code).
- release:prepare 0.5.0: commit 2cc8918 'chore(release): prepare v0.5.0', annotated tag v0.5.0 (tag object 3d306ea4fb7a119b2309d55ab3a45075aa6d4b90 -> 2cc891829610d06d3894f0da6d38347ce31adc7a). Verified with scripts/ci-local.sh on the tag (2cc8918, PASS; CI_LOCAL.log) and on branch release/v0.5.0 (2cc8918, PASS; separate CI_LOCAL_DIR); GitHub Actions unavailable (billing lock). Worktree build, pack (16 files: package.json, LICENSE, README.md, dist/index.js and one .d.ts per module), archive-entry validation and packed consumer smoke (ESM+CJS, Bun and Node; TS 5.9/6.0/7.0) passed. RELEASE_NOTES.md has no relative links.
- Tarball: /Users/takinprofit/Dev/errorset-release/v0.5.0/takinprofit-errorset-0.5.0.tgz; SHA-512 2d891bdac7256679941bc8d19609b20c87bf15a0d63f1e46aeee068d79d92c7c9389464b5f250a68cc1296f5271fa0e5f8d0a2e6bf97aafa79670b329db96b36 (SHA512SUMS beside it).
- PR https://github.com/g5becks/errorset/pull/3 (body = CHANGELOG section + task IDs + a note that TASK-067 is a type-level breaking change in this planned-additive release; ci-local tables in a comment), merged with a merge commit (gh pr merge --merge): 30b709c64672f87a20746a20dd648c74dc573bea. Tag verified as an ancestor of main, then pushed. Not published.
- Maintainer commands:
  cd /Users/takinprofit/Dev/errorset-release/v0.5.0 && npm publish ./takinprofit-errorset-0.5.0.tgz --access public
  npm view @takinprofit/errorset@0.5.0 version
  gh release create v0.5.0 --verify-tag --title v0.5.0 --notes-file /Users/takinprofit/Dev/errorset-release/v0.5.0/RELEASE_NOTES.md
<!-- SECTION:NOTES:END -->
