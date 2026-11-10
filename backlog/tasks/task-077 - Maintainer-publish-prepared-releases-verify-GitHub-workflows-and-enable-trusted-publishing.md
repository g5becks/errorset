---
id: TASK-077
title: >-
  Maintainer: publish prepared releases, verify GitHub workflows and enable
  trusted publishing
status: To Do
assignee:
  - '@takinprofit'
created_date: '2026-11-10T17:35:00Z'
labels:
  - maintainer
  - blocked-external
dependencies: []
documentation:
  - errorset-audit.md
priority: medium
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
GitHub Actions is unavailable (account billing lock). These steps need the maintainer.

## Steps (maintainer)
1. Once Actions is restored, run `ci.yml` once with workflow_dispatch on main and confirm every matrix leg passes on GitHub.
2. Configure npm trusted publishing for `@takinprofit/errorset` (see CONTRIBUTING.md), then confirm `release.yml` behaves correctly on the next tag (publishes, or skips an already-published version).
3. Check the first scheduled `benchmarks.yml` run.
4. Publish each prepared release in order (0.3.1 → 0.4.0 → 0.5.0) using the commands in the release-prep task notes, then create the GitHub releases.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Each prepared version is published in order and has a GitHub release
- [ ] #2 ci.yml passes on GitHub for all legs
- [ ] #3 Trusted publishing configured and release.yml verified on a tag
<!-- AC:END -->
