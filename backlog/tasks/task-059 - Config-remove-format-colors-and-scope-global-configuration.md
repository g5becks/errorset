---
id: TASK-059
title: 'Config: remove format/colors and scope global configuration'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-10T21:00:00Z'
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
- [x] #1 format and colors no longer exist in types or runtime; the A11 regression case passes
- [x] #2 configure() returns a disposer restoring the previous config (tested); docs describe global config as application-only
- [x] #3 CHANGELOG.md lists the change under ## [Unreleased] > ### Breaking changes with migration steps
- [x] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. config.ts: remove Format, format and colors (types and defaults); configure() keeps only known options (includeStack, includeTimestamp, stackDepth), so stray format/colors are ignored at runtime, and returns a disposer restoring the previous config; keep resetConfig().
2. index.ts: drop the Format export. Per-set init(config) types lose format/colors too.
3. Tests: flip A11; migrate config tests that exercised format/colors to the new contract (type error via @ts-expect-error + ignored at runtime); disposer tests (restore, nested, idempotent).
4. Docs: configure() is application-only (libraries use init(config)); only working options. CHANGELOG breaking; gate; ci-local.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Outcome: Config is { includeStack, includeTimestamp, stackDepth }; Format type, format and colors removed from types, defaults and the index exports. configure() copies only known options (stray format/colors or other unknown keys are ignored at runtime, as are explicitly undefined values) and returns a disposer that restores the configuration in effect before the call; resetConfig() kept.
- Docs: README Configuration section documents configure() as application-only (libraries use init(config)), shows the disposer pattern and notes the removal; LLMS.txt Config/ErrorSetConfig blocks and configure signature updated. CHANGELOG ### Breaking changes entry with migration.
- Tests: A11 [TASK-059] flipped to test. tests/config.test.ts rewritten for the new contract (removed-option tests now assert @ts-expect-error + absent at runtime, in configure() and in per-set init(); getConfig equals exactly the 3 options; disposer restores the previous config, unwinds nested scopes, is idempotent; undefined values ignored). timestamp.test.ts dropped its 0.3.1 "deprecated format/colors still accepted" case (superseded by the removal tests). Type tests: configure returns () => void; format/colors are type errors in configure and init. 214 tests, 100% coverage; 5 test.failing remain (A4, A5, A8 x2, A9).
- Breaking change: yes; format/colors/Format removed; configure() returns a disposer.
- Verification: strict gate passes. Verified with scripts/ci-local.sh (b2ce3c4, PASS); GitHub Actions unavailable (billing lock).
<!-- SECTION:NOTES:END -->
