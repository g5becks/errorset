---
id: TASK-073
title: 'Refactor: split src/types.ts into focused modules'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-11T03:55:00Z'
labels:
  - refactor
milestone: m-2
dependencies:
  - TASK-065
  - TASK-066
  - TASK-067
  - TASK-068
  - TASK-069
  - TASK-070
  - TASK-071
  - TASK-072
documentation:
  - errorset-audit.md
priority: low
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
`src/types.ts` (~1,100 lines) mixes types, runtime and helpers. Audit ref: C2. Do this after the behavior changes, to avoid conflicts.

## Implementation
Split into `brand.ts`, `kind.ts`, `set.ts`, `helpers.ts` (recover/inspect/merge/capture), `serialization.ts` and `types.ts`. Keep `src/index.ts` as the only public entry. No behavior change: identical test results, coverage thresholds held, benchmarks within noise, and an unchanged `dist/index.d.ts` public surface (diff the API report, e.g. with `tsc --declaration` output or api-extractor-style listing).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 No source file exceeds ~400 lines; src/index.ts is the only entry
- [x] #2 Public declaration surface unchanged (diff recorded); tests, coverage and benchmarks unchanged within noise
- [x] #3 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Baseline: API report of every src/index.ts export with its emitted declaration text (typescript@5.9.3 API in the scratchpad), test results, coverage, benchmarks.
2. Split src/types.ts mechanically with a TS-API splitter: statements move verbatim with leading comments into brand, types, serialization, kind, guards, helpers, merge, set (each <= ~400 lines, acyclic); imports computed; internal names used across modules exported (index.ts re-exports only the public names). Update the two tests that import createSetGuardWithKinds from src/types.ts.
3. Verify: API report identical, tests/coverage identical, benchmarks within noise, build/consumer smoke, ci-local.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Outcome: src/types.ts (2,075 lines) split into brand (111), types (261), serialization (163), creation (175), kind (239), guards (197), helpers (371), merge (185), registry (71), set (399) plus config (116) and index (73). Import graph is acyclic (checked by script): brand and registry depend on nothing; set is the only module that depends on most others. src/index.ts is still the only entry and re-exports the same public names; package exports are unchanged (only '.' and './package.json'), so the internal names exported between modules (hasBrand, ERR_PROTO, newErr, TemplateErr, cachedConfig, membersOf, withKinds, normalizeKinds, registerSetName, …) are not reachable by consumers. Two tests that imported createSetGuardWithKinds from src/types.ts now import it from src/guards.ts.
- Method: statements moved verbatim with their leading comments by a TypeScript-5.9-API splitter (copy: /Users/takinprofit/Dev/errorset-release/split-073.ts) that computes imports from AST identifiers (a first regex-based attempt produced bogus imports from words in comments and was discarded); a first grouping left kind.ts at 414 and set.ts at 431 lines and a type-only types<->set cycle, so creation.ts and registry.ts were split out and ErrorSetBuilder moved to set.ts.
- Public surface: API report (every src/index.ts export with its emitted declaration text and value type, typescript@5.9.3 API; tool copy /Users/takinprofit/Dev/errorset-release/api-report-073.ts) is identical: diff of /Users/takinprofit/Dev/errorset-release/api-before-073.txt and api-after-073.txt (62 lines) is empty. dist now has one .d.ts per module plus index.js (single bundle, unchanged runtime).
- Tests 321 pass (same as before), coverage 100% per file. Benchmarks (bun run bench --runs 3 medians) within noise of TASK-072: template 57.2 ns (56.2-57), no-context 34.3, guards 2-kind 5.4 / 40-kind 5.0 / non-error 5.8, include_stack 460.1.
- Not breaking. Verified with scripts/ci-local.sh (7e40f3b, PASS); GitHub Actions unavailable (billing lock).
<!-- SECTION:NOTES:END -->
