---
id: TASK-053
title: >-
  Testing: encode audit Appendix A repros as a test.failing regression suite
  (incl. cross-copy harness)
status: Done
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-10T19:55:00Z'
labels:
  - testing
milestone: m-1
dependencies:
  - TASK-052
documentation:
  - errorset-audit.md
priority: high
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
99.9% line coverage missed A1–A11, which need cross-set, cross-copy and serialization scenarios. Encode each Appendix A repro as a failing test *before* any fix, so each fix flips its own cases. Audit refs: Q3, Appendix A.

## Implementation
1. `tests/regression/`, one `test.failing(...)` per repro, named `<auditId> [<fixing area>] <behavior>`:
   - A1: a set guard and a kind guard match another set's error with the same kind;
   - A2: cross-copy (below);
   - A3: reserved kind names throw a cryptic TypeError;
   - A4: callable `structuredClone` throws;
   - A6: capture drops the original error;
   - A8: errors are mutable;
   - A9: `merge` duplicates kinds;
   - A10: runtime throw from `recover` with handlers missing;
   - A11: `format`/`colors` are accepted and do nothing.
2. Cross-copy harness: build `src/index.ts` twice with `bun build` into two temp files, import both, and assert that an error created by copy B passes copy A's `isErr`, set guard and kind guard. Make it a `test.failing` until the brand task.
3. Every case must fail **for the documented reason**; read each failure. Record the list of cases in the notes.
4. Convention for every later v0.4.0 task: change your cases from `test.failing` to `test` and make them pass. At v0.4.0 release, no `test.failing` may remain except those explicitly scheduled for v0.5.0 (A5 rehydration, A9 merge), named with that task in the title.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 tests/regression/ has a test.failing case for A1, A2 (two separately built copies), A3, A4 structuredClone, A6, A8, A9, A10 runtime and A11
- [x] #2 Each case fails for the documented reason (verified by reading the failures; list in notes)
- [x] #3 The suite passes as a whole (test.failing semantics) and the coverage thresholds still hold
- [x] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. tests/regression/audit-appendix-a.test.ts: one test.failing per Appendix A repro asserting the target behavior, named "<id> [<fixing task>] <expected behavior>".
2. Cross-copy harness: tests/regression/fixtures/cross-copy-probe.ts builds src twice with Bun.build and compares copies; spawned in a subprocess so bundles stay out of coverage.
3. A10 is type-level: spawn the project tsc on a temp fixture (typeRoots pointing at the repo).
4. Read every failure by running a copy with test.failing -> test; fix any case failing for the wrong reason.
5. Gate (coverage), ci-local.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Outcome: tests/regression/audit-appendix-a.test.ts with 13 test.failing cases + 1 passing guard, named "<id> [<fixing task>] <expected behavior>"; each asserts the behavior the fix must deliver.
- Cases and the observed failure (read by running a copy with test.failing -> test):
  - A1 [TASK-055] set guard rejects another set's same-kind error: Received true.
  - A1 [TASK-055] kind guard likewise: Received true.
  - A2 [TASK-054] isErr of copy A accepts copy B's error: Received false.
  - A2 [TASK-055] set + kind guards across copies: Received false.
  - A3 [TASK-057] reserved kind "recover" throws a clear error naming it: got "Attempting to change enumerable attribute of unconfigurable property."
  - A4 [TASK-060] structuredClone of a no-context error: DataCloneError.
  - A5 [TASK-065 v0.5.0] XError.from() rehydrates JSON: "from is not a function".
  - A6 [TASK-058] capture attaches the thrown value as cause: Received undefined.
  - A8 [TASK-061] writing message throws / writing data throws: "did not throw" (x2).
  - A9 [TASK-067 v0.5.0] merge lists each kind once: received an extra "invalid_symbol".
  - A10 [TASK-056] recover with {} / partial map does not type-check: tsc exit 0 (Received true).
  - A11 [TASK-059] format/colors no longer exist: still in getConfig() (Received true).
  - A11 [TASK-048] includeTimestamp sets a timestamp: a passing `test` (fixed in v0.3.1).
- Cross-copy harness: tests/regression/fixtures/cross-copy-probe.ts builds src/index.ts twice with Bun.build into separate temp dirs, imports both, and reports distinctCopies/pluginRecognizesOwn (asserted true, so the harness is sound) plus hostIsErr/hostSetGuard/hostKindGuard. Spawned as a subprocess so the bundled copies stay out of coverage.
- A10 is type-level, so the case runs node_modules/.bin/tsc on a temp fixture importing src (extends the root tsconfig; typeRoots point at the repo). The first version failed for the wrong reason (missing bun types: TS2339, then TS2688); fixed, and a sanity run confirmed the harness reports real type errors.
- Bun 1.3.14 and 1.4.4 both implement test.failing (an unexpected pass is reported as a failure).
- Counts: 158 pass (144 + 14), coverage 100% funcs / 99.90% lines (unchanged).
- Verification: strict gate passes. Verified with scripts/ci-local.sh (cb9b21a, PASS); GitHub Actions unavailable (billing lock).
- Breaking change: none (tests only).
<!-- SECTION:NOTES:END -->
