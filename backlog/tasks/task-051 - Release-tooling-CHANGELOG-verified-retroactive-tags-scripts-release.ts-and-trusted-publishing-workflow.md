---
id: TASK-051
title: >-
  Release tooling: CHANGELOG, verified retroactive tags, scripts/release.ts and
  trusted-publishing workflow
status: In Progress
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-10T19:31:00Z'
labels:
  - release
milestone: m-0
dependencies:
  - TASK-044
documentation:
  - errorset-audit.md
priority: medium
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
There is no CHANGELOG, there are no git tags for the published 0.1.0, 0.2.1 and 0.3.0, and releases are manual. npm now requires interactive 2FA for local publishes; the only non-interactive path is trusted publishing from GitHub Actions. Audit refs: C8, D4 (tags).

## Implementation
1. `CHANGELOG.md` (Keep a Changelog): backfill 0.1.0, 0.2.1 and 0.3.0 from git history and npm publish dates (`npm view @takinprofit/errorset time`), and add an `[Unreleased]` section with this milestone's entries.
2. Retroactive annotated tags `v0.1.0`, `v0.2.1` and `v0.3.0`: find each version's commit, then confirm it by comparing the built files with the published tarball (`npm pack @takinprofit/errorset@<v>`; compare `dist/` and README). Record the evidence. If a version can't be matched to a commit, don't tag it; note why. Tags stay **local** (the release task pushes them).
3. `scripts/release.ts` + `bun run release:prepare <version> [--dry-run]`, ported from `/Users/takinprofit/Dev/StrataDb/scripts/release.ts`. It must:
   - check that the tree is clean and the branch is `release/v<version>`;
   - roll `[Unreleased]` into a dated section and bump the version;
   - commit `chore(release): prepare v<version>` and create an annotated tag;
   - run `scripts/ci-local.sh` on the tag;
   - in a worktree at `/Users/takinprofit/Dev/errorset-release/v<version>`: pack, check the file list (only `dist/`, README, LICENSE, package.json, plus `src/` if source maps ship), compute the SHA-512, run an isolated consumer CRUD-style smoke test, and write `RELEASE_NOTES.md`;
   - print the maintainer's publish commands.

   It never pushes or publishes. Test it against a temporary clone.
4. `.github/workflows/release.yml` on `v*` tags, with SHA-pinned actions:
   - run the full gate;
   - check that the tag matches the package version;
   - skip publishing if `npm view @takinprofit/errorset@<v> version` already exists;
   - otherwise `npm publish --provenance --access public` via trusted publishing (`id-token: write`, no NPM_TOKEN).

   It can't run while Actions is locked; validate it with actionlint.
5. CONTRIBUTING.md: the release procedure (script, maintainer's 2FA publish, trusted-publishing setup, ci-local fallback).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 CHANGELOG.md exists, with backfilled 0.1.0/0.2.1/0.3.0 sections and an [Unreleased] section
- [ ] #2 Local annotated tags exist only for versions whose commit was verified against the published tarball (evidence in notes)
- [ ] #3 bun run release:prepare <v> --dry-run writes nothing; a real run (tested in a temporary clone) produces commit, tag, ci-local PASS, tarball, SHA-512 and RELEASE_NOTES.md, and never pushes or publishes
- [ ] #4 release.yml uses trusted publishing with provenance, skips already-published versions, checks tag/version, pins actions; actionlint passes
- [ ] #5 CONTRIBUTING.md documents the release procedure
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. CHANGELOG: backfill 0.1.0 (2026-01-05), 0.2.1 (2026-01-06), 0.3.0 (2026-01-17) from git history; keep [Unreleased].
2. Annotated local tags v0.1.0=8d09ce5, v0.2.1=301f969, v0.3.0=a627c65 (verified byte-identical vs npm tarballs; evidence in notes).
3. scripts/release.ts + release:prepare (port of StrataDB): clean tree, branch release/v<v>, newer version, roll [Unreleased], bump, commit, annotated tag, ci-local on tag, worktree in ../errorset-release/v<v>, pack, file-list check, SHA-512, isolated consumer smoke (create/guard/recover), RELEASE_NOTES.md, print maintainer commands; --dry-run writes nothing. Test in a temporary clone.
4. .github/workflows/release.yml (v* tags, SHA-pinned, full gate, tag/version check, skip if published, npm publish --provenance via OIDC). actionlint.
5. CONTRIBUTING.md release procedure.
<!-- SECTION:PLAN:END -->
