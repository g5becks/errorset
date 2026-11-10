---
id: TASK-054
title: 'Identity: registry-symbol brand with protocol version (cross-copy recognition)'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-10T19:59:00Z'
labels:
  - identity
  - breaking
milestone: m-1
dependencies:
  - TASK-053
documentation:
  - errorset-audit.md
priority: high
type: bug
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
`ERR = Symbol("err")` is per module instance, so two copies of errorset (bundled plugins, duplicate installs) don't recognize each other's errors. agentx plugins bundle their own copy. Audit ref: A2.

## Implementation
1. `ERR = Symbol.for("@takinprofit/errorset/err")`. The brand **value** carries a protocol number (e.g. `{ protocol: 1 }` or the number `1`), so future shape changes can be detected. Guards accept any protocol they understand.
2. Keep `ERR` exported (now the registry symbol).
3. Flip the A2 cross-copy regression case to `test` for `isErr`. The set and kind guards also pass once set identity exists (next task); if they still depend on it, keep those assertions `test.failing`, assigned to that task.
4. Document in the README that brand checks work across copies and versions with the same protocol.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 ERR is Symbol.for('@takinprofit/errorset/err') and the brand value carries a protocol number
- [x] #2 Cross-copy regression: isErr from copy A accepts errors from copy B (test passes)
- [x] #3 README documents cross-copy behavior
- [x] #4 CHANGELOG.md lists the change under ## [Unreleased] > ### Breaking changes with migration steps
- [x] #5 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. ERR = Symbol.for("@takinprofit/errorset/err"); brand value = protocol number (ERR_PROTOCOL = 1) instead of true.
2. One internal hasBrand(value) used by isErr, kind guards and set guards: accepts objects/functions whose [ERR] is a protocol this copy understands (1).
3. Types: Err[ERR] is the protocol literal; keep ERR exported.
4. Flip A2 [TASK-054] isErr case to test; A2 set/kind guards: check; keep test.failing if they still need set identity (TASK-055).
5. README cross-copy section; CHANGELOG Breaking changes (brand value no longer true; ERR is a registry symbol) with migration; gate; ci-local.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Outcome: ERR = Symbol.for("@takinprofit/errorset/err"); the brand value is the protocol number ERR_PROTOCOL = 1 (exported with type ErrProtocol; Err[ERR] is typed ErrProtocol). One internal hasBrand() (brand === a protocol this copy understands, currently 1) replaces the 4 inline `[ERR] === true` checks in isErr, kind guards and set guards; template and callable errors set [ERR]: ERR_PROTOCOL.
- Regression: A2 [TASK-054] isErr case flipped to test and passes. The A2 set+kind guard case also passes now (current guards check only brand + kind), so it was flipped and re-attributed to TASK-054 with a comment that TASK-055's set identity must keep it passing. Probe output: hostIsErr/hostSetGuard/hostKindGuard all true. 11 test.failing remain.
- Contract tests updated (intended change, not weakened): tests/types.test.ts now asserts ERR.description is "@takinprofit/errorset/err" and ERR === Symbol.for(...) (was description "err"), and err[ERR] === ERR_PROTOCOL (was true). Added a test that a brand of true or an unknown protocol is rejected.
- Docs: README "Across Copies and Versions" (registry symbol, protocol, no instanceof/serialization identity); LLMS.txt Err shape and ERR/ERR_PROTOCOL export. CHANGELOG ### Breaking changes entry with migration.
- Benchmark (median of 3): guards unchanged (2-kind 5.8, 40-kind 41.9, non-error 5.5 ns).
- Breaking change: yes; err[ERR] is 1 instead of true and ERR is a registry symbol. Migration: use isErr()/set guards, or compare with ERR_PROTOCOL; hand-built errors use [ERR]: ERR_PROTOCOL.
- Verification: strict gate passes (159 tests). Verified with scripts/ci-local.sh (f17f4f4, PASS); GitHub Actions unavailable (billing lock).
<!-- SECTION:NOTES:END -->
