---
id: TASK-067
title: 'API: variadic, set-aware merge() with recover and inspect'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-11T03:22:00Z'
labels:
  - api
milestone: m-2
dependencies:
  - TASK-064
documentation:
  - errorset-audit.md
priority: medium
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
`merge()` takes only two sets, duplicates kinds, and the merged guard lacks kind functions, `recover` and `inspect`. Its data type degrades to `Record<string, unknown>`. Audit ref: A9.

## Implementation
1. A variadic `merge(...sets)`.
2. Membership by `(set, kind)` pairs, with no duplicates.
3. The merged guard has `recover` (exhaustive over `(set, kind)`, or with `_`) and `inspect`.
4. Data typed as a discriminated union over `set`.
5. Tests, including sets that share kind names (the merged guard accepts both, and narrows by `set`). Flip the A9 regression case.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 merge(a, b, c) works; kinds has no duplicate (set, kind) pairs; A9 regression case passes
- [x] #2 The merged guard has recover and inspect; data narrows by set (type tests)
- [x] #3 CHANGELOG.md has an entry under ## [Unreleased] describing the change
- [x] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Tests first: tests/merge.test.ts (variadic, dedup, chained/method equivalence, recover by (set, kind) with shared kind names, _, inherited handler keys, untyped throw, inspect) and tests/types/merge.test-d.ts (union over set, data narrowing, exhaustive recover, bad keys).
2. merge(...guards): MergeInput (sets or merged guards), members de-duplicated by (set, kind), kinds = unique names; MergedGuard<E> with recover/inspect (handlers nested by set name then kind, own-property lookup) and merge; ErrorSet.merge variadic.
3. Flip A9; update the integration test that asserted duplicate kinds (intended behavior change); CHANGELOG Added/Changed; README merge section; LLMS regen.
4. Gate, commit, ci-local.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Outcome: merge(...guards) (sets or merged guards, at least one) and variadic X.merge(...others). Members are de-duplicated by (set, kind) (any-set legacy members keyed separately); kinds lists each name once in first-seen order. Returns MergedGuard<E> where E is the union of the inputs' guarded error types (discriminated by set, so data narrows on err.set). MergedGuard has instanceof, kinds, recover (handlers nested by set name then kind; exhaustive over every (set, kind) pair, or partial + required _; own-property lookup so inherited handler-map keys never match; defensive throw for untyped callers), inspect (nested partial) and merge. New exported types MergedGuard, MergedRecoverHandlers, MergedInspectHandlers, MergeInput, GuardedError.
- Decisions: handlers nested by set name rather than flat 'Set.kind' keys (set names may contain dots, e.g. 'billing/Payment' or 'Rehydrate.UserError'); no kind functions on merged guards (kind names can be shared across sets, so X.kind would be ambiguous; use the original set's kind guards). Type tests compare GuardedError<typeof merged> with toEqualTypeOf plus mutual assignability with MergedGuard<E>, because expect-type's strict identity check fails for structurally identical generic-method types built from different expressions.
- Breaking (feat(api)!, BREAKING CHANGE footer, CHANGELOG [Unreleased] > Breaking changes): merged data was Record<string, unknown> and is now the per-set union, so reading set-specific data keys needs narrowing; merged.kinds no longer repeats shared names. tests/integration.test.ts 'should contain both instances of colliding tags' asserted the duplicate list; it was updated to the A9-required behavior (each name once) and now also asserts both sets' colliding-kind errors still match (intended behavior change, not a weakening). This milestone was planned as additive; the break is type-level plus the kinds list, flagged for the maintainer.
- Tests: tests/merge.test.ts (14), tests/types/merge.test-d.ts (each @ts-expect-error verified to fail for its stated reason); A9 flipped to test: no test.failing cases remain in tests/regression. 282 tests, 100% coverage; type tests pass on TS 5.9.3/6.0.3/7.0.2.
- Benchmarks (bun run bench, same machine): guard_set_2kind 6.8 ns, guard_set_40kind_last 43.1 ns, create_template_2keys 178.9 ns: unchanged (merge is not on those paths).
- Verified with scripts/ci-local.sh (be2218d, PASS); GitHub Actions unavailable (billing lock).
<!-- SECTION:NOTES:END -->
