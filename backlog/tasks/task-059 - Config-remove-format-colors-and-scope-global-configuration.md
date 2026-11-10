---
id: TASK-059
title: 'Config: remove format/colors and scope global configuration'
status: To Do
assignee: []
created_date: '2026-11-10T17:35:00Z'
labels:
  - config
  - breaking
milestone: m-1
dependencies:
  - TASK-053
documentation:
  - errorset-audit.md
priority: medium
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
`format` and `colors` were deprecated in 0.3.1 as no-ops. The global `configure()` mutates state shared by every error set in the process, including sets from third-party libraries. Audit refs: A11, A12.

## Implementation
1. Remove `format` and `colors` from the types and from runtime handling. Flip the A11 regression case (passing them is now a type error, and is ignored at runtime).
2. Document `configure()` as application-only: library authors use per-set `init(config)`.
3. `configure()` returns a disposer that restores the previous config (useful in tests); keep `resetConfig()`.
4. Docs list only working options.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 format and colors no longer exist in types or runtime; the A11 regression case passes
- [ ] #2 configure() returns a disposer restoring the previous config (tested); docs describe global config as application-only
- [ ] #3 CHANGELOG.md lists the change under ## [Unreleased] > ### Breaking changes with migration steps
- [ ] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->
