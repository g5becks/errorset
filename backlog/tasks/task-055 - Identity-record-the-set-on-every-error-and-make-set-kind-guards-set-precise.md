---
id: TASK-055
title: 'Identity: record the set on every error and make set/kind guards set-precise'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-10T20:07:00Z'
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
- [x] #1 Every error has an enumerable readonly set field; toJSON includes it
- [x] #2 Set and kind guards return false for another set's error with the same kind (A1 regression cases pass); cross-copy guard assertions pass
- [x] #3 Types: Err carries the set name; type tests prove a same-kind error from another set does not narrow
- [x] #4 The duplicate set-name policy is implemented, tested and documented
- [x] #5 CHANGELOG.md lists the change under ## [Unreleased] > ### Breaking changes with migration steps
- [x] #6 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Runtime: every error (template, callable, called-callable) gets an enumerable readonly `set: <name>` field; toJSON includes set.
2. Guards: kind guard = brand && set === name && kind === k. Set guards are built from (set, kind) members kept on the guard (internal symbol), so merge() combines members and stays set-precise; deprecated createSetGuard/WithKinds keep a kinds-only (any set) mode when no set name is given.
3. Types: Err<Kind, Data, Set extends string = string>; set name N flows errorSet -> ErrorSetBuilder -> ErrorSet -> KindFunction/ErrorCreator/CallableErr/guards; merge yields the union of names.
4. Duplicate set names (decision): module-level registry; same name + same kinds is silent (HMR, re-evaluation, tests); same name + different kinds warns once per name. No throw. Document.
5. Flip A1 cases; keep A2 passing. Type tests: same-kind error from another set does not narrow. Update contract tests (Object.keys/JSON now include set). CHANGELOG breaking entry with migration; README; gate; bench; ci-local.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Outcome: every error (template, callable, called-callable) has an enumerable readonly `set` field (own data property; Object.keys order set, kind, message, data[, cause]); toJSON emits { set, kind, message, data, cause?, timestamp? }.
- Guards: kind guard = brand && kind === k && set === name. Set guards are built from (set, kind) member pairs stored on the guard under Symbol.for("@takinprofit/errorset/members"); single-set guards take a fast path (set === name && kinds.includes(kind)), mixed sets use a Map. merge() combines members, so merged guards stay set-precise and can be merged again; a guard without members (an older copy) contributes "kind from any set". instanceof, recover and inspect go through the same guard. Deprecated createSetGuard/WithKinds gained an optional setName (without it: kinds from any set).
- Types: Err<Kind, Data, Set extends string = string>; the set name N flows errorSet -> ErrorSetBuilder -> ErrorSet -> KindFunction/KindConstructor/KindGuard/ErrorCreator/CallableErr/SetGuard/SetGuardWithKinds/Recover*/Inspect*/ErrorMapper/capture*; merge yields N1 | N2. Type tests: err.set literal types; OrderError(either) narrows OrderErr | PositionErr to OrderErr only; kind guards narrow set + kind; assigning a PositionError error to OrderErrors is @ts-expect-error; merged guard narrows set to the union.
- Decision (duplicate set names): a module-level registry (name -> sorted kinds). Same name + same kinds: silent (HMR, re-evaluated modules, tests). Same name + different kinds: one console.warn per name, never throws (throwing would break hot reload when kinds are edited). Sets with the same name share identity by design (this is what makes cross-copy recognition work). Documented in README "Set Identity" and the CHANGELOG. Tests: silent same-kinds redefinition, one warning across two conflicting redefinitions, no throw, shared identity. The existing suite triggers the warning for 3 reused names (UserError, DbError, OrderError) on stderr only.
- Regression: both A1 cases flipped to test and pass; both A2 cases still pass (probe: hostIsErr/hostSetGuard/hostKindGuard true). 9 test.failing remain.
- Contract tests updated (intended inversions, not weakened): tests/integration.test.ts "Tag Collisions in Merged Sets" asserted the A1 bug (SetA.not_found(errB) === true, "Same kind string matches") and now asserts false for cross-set and true for own-set, with an A1 comment; serialization/timestamp tests expect `set` in JSON and Object.keys; type test GetUserResult now names its set ("UserError").
- New tests/set-identity.test.ts (12 tests): set on every shape; set/kind/instanceof/recover/inspect reject another set's same-kind error; merge accepts both sets, rejects a third same-kind set and a forged cross-kind error, re-merges; deprecated any-set mode alone and merged; legacy guard fallback; duplicate-name policy. Coverage 100% funcs / 100% lines; 170 tests pass.
- Benchmark (median of 3, ns/op): guard_set_2kind 7.2 (5.8 before; baseline 5.6), guard_set_40kind_last 43.4 (41.9), guard_non_error 6.0, create_template_2keys 161.9 (unchanged), create_callable_no_context 198.9 (183.6: one more defineProperty).
- Docs: README "Set Identity" section and updated JSON examples; LLMS.txt Err<..., SetName> shape and guard signatures; CHANGELOG ### Breaking changes entry with migration.
- Breaking change: yes. Guards no longer match other sets' same-kind errors; Err has a Set parameter (hand-written result types need the set name or typeof X.Type); errors/JSON gain `set`.
- Verification: strict gate passes. Verified with scripts/ci-local.sh (561300e, PASS); GitHub Actions unavailable (billing lock).
<!-- SECTION:NOTES:END -->
