---
id: TASK-059
title: 'Config: remove format/colors and scope global configuration'
status: In Progress
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-10T20:54:00Z'
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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. config.ts: remove Format, format and colors (types and defaults); configure() keeps only known options (includeStack, includeTimestamp, stackDepth), so stray format/colors are ignored at runtime, and returns a disposer restoring the previous config; keep resetConfig().
2. index.ts: drop the Format export. Per-set init(config) types lose format/colors too.
3. Tests: flip A11; migrate config tests that exercised format/colors to the new contract (type error via @ts-expect-error + ignored at runtime); disposer tests (restore, nested, idempotent).
4. Docs: configure() is application-only (libraries use init(config)); only working options. CHANGELOG breaking; gate; ci-local.
<!-- SECTION:PLAN:END -->
