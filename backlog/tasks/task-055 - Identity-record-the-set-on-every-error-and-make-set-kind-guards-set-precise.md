---
id: TASK-055
title: 'Identity: record the set on every error and make set/kind guards set-precise'
status: To Do
assignee: []
created_date: '2026-11-10T17:35:00Z'
labels:
  - identity
  - breaking
milestone: m-1
dependencies:
  - TASK-054
documentation:
  - errorset-audit.md
priority: high
type: bug
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Errors record nothing about their set. Set guards check `kinds.includes(kind)` and kind guards check `value.kind === kind`, so `OrderError(positionError)` is `true` whenever kind names overlap. In agentx, 20 kind names are shared across sets (`not_found` in 6, `invalid_symbol` in 4…), and TypeScript narrows as if the check were precise. Audit ref: A1 (**Critical**).

## Implementation
1. Every error gets an enumerable, readonly `set: "<SetName>"` field. It survives JSON, logs and `toJSON` (update the toJSON output to include `set`).
2. Set guards check `set === name && kinds.has(kind)`; kind guards check `set === name && kind === k`. Update `recover`/`inspect` dispatch to match.
3. Types: `Err<Kind, Data, Set extends string>`. Guards narrow on `set` as well as `kind`. Update the type tests: an error from another set with the same kind must **not** narrow.
4. Duplicate set names: a module-level registry of names. Decide between warn and throw on a duplicate `errorSet` name (default: throw in dev unless `init({ allowDuplicateName: true })`, or warn). Document the policy and record the decision; it must not break hot-reload or tests that redefine sets (consider `resetRegistry()` for tests).
5. Flip the A1 regression cases (and the A2 guard assertions) to passing.
6. CHANGELOG breaking entry, with migration: "guards no longer match errors from other sets with the same kind name; audit code that relied on cross-set matching".
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Every error has an enumerable readonly set field; toJSON includes it
- [ ] #2 Set and kind guards return false for another set's error with the same kind (A1 regression cases pass); cross-copy guard assertions pass
- [ ] #3 Types: Err carries the set name; type tests prove a same-kind error from another set does not narrow
- [ ] #4 The duplicate set-name policy is implemented, tested and documented
- [ ] #5 CHANGELOG.md lists the change under ## [Unreleased] > ### Breaking changes with migration steps
- [ ] #6 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->
