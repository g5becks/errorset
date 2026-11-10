---
id: TASK-053
title: >-
  Testing: encode audit Appendix A repros as a test.failing regression suite
  (incl. cross-copy harness)
status: To Do
assignee: []
created_date: '2026-11-10T17:35:00Z'
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
- [ ] #1 tests/regression/ has a test.failing case for A1, A2 (two separately built copies), A3, A4 structuredClone, A6, A8, A9, A10 runtime and A11
- [ ] #2 Each case fails for the documented reason (verified by reading the failures; list in notes)
- [ ] #3 The suite passes as a whole (test.failing semantics) and the coverage thresholds still hold
- [ ] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->
