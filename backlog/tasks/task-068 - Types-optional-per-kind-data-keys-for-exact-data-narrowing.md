---
id: TASK-068
title: 'Types: optional per-kind data keys for exact data narrowing'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-11T03:26:00Z'
labels:
  - types
milestone: m-2
dependencies:
  - TASK-064
documentation:
  - errorset-audit.md
priority: low
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Kind guards narrow `data` to `Partial<T>` because the guard can't know which template keys a kind uses. That pushes consumers toward non-null assertions. Audit ref: A14.

## Implementation
Add an additive overload: `errorSet(name, { not_found: ["id"], suspended: ["id", "reason"] })`. Kind guards then narrow `data` to exactly those keys. The array form keeps working unchanged. Templates for a declared kind may only use its declared keys (type error otherwise). Type and runtime tests for both forms.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 The object form narrows data exactly in kind guards; undeclared template keys fail to compile (type tests)
- [x] #2 The array form is unchanged (existing tests pass)
- [x] #3 CHANGELOG.md has an entry under ## [Unreleased] describing the change
- [x] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Tests first: tests/kind-keys.test.ts (exact data keys from the entity, no-hole templates still take the entity, [] = no-context, guards/recover/JSON/from, from rejects missing declared keys, validation of reserved names and key lists, array form unchanged) and tests/types/kind-keys.test-d.ts (exact Pick narrowing, holes limited to declared keys, entity must have all declared keys, init<T> requires declared keys, interfaces, reserved names, array form unchanged).
2. errorSet overload for KindKeys specs (NoReservedKeys); ErrorSetBuilder/ErrorSet/KindFunction/KindConstructor/KindGuard get a Declared/Spec parameter defaulting to the array-form behavior; normalizeKinds (null-prototype map so __proto__ is rejected as reserved); createKindFunction takes declared keys (data = declared keys; rehydrate checks and keeps only them).
3. README section, CHANGELOG Added, exports; gate; ci-local.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Outcome: errorSet(name, { kind: [keys] }) overload (KindKeys spec, NoReservedKeys check naming the word). ErrorSetBuilder/ErrorSet carry the spec; KindFunction/KindConstructor/KindGuard take a Declared parameter ({ keys } wrapper, so 'declared with no keys' (never) differs from 'array form' (undefined)). Kind guards narrow data to KindData = Pick<T, declared keys>; the creator requires the entity to have every declared key and data always holds exactly the declared keys (even when the template uses fewer holes), so the narrowing is sound; holes are limited to declared keys; a no-hole template of a kind with keys still returns a creator; a kind declared [] creates no-context errors; init<T>() requires T to have every declared key (TS2344 otherwise); from() rejects data missing a declared key and keeps only declared keys. Runtime normalizeKinds validates the object form (arrays of strings; non-object argument) and uses a null-prototype map so a __proto__ kind is rejected as reserved. Set-level types (Type, set guard, recover handlers) stay Partial<T> (decision: keeps Type identical for both forms).
- Not breaking: the array form and its types are unchanged (existing tests untouched). New exports: KindKeys, KindData, DeclaredKeys, NoReservedKeys. Edge: an undefined-valued declared key is dropped by JSON, so from() rejects that serialized error (documented in README).
- Tests: tests/kind-keys.test.ts (11) and tests/types/kind-keys.test-d.ts (each @ts-expect-error verified to fail for its stated reason: TS2741 missing reason, TS2345 undeclared holes, TS2344 init constraint, TS2769 reserved). 293 tests, 100% coverage; type tests pass on TS 5.9.3/6.0.3/7.0.2.
- Benchmarks: an unrelated golang container was loading the Colima VM (load average ~11), so absolute runs were inflated (template 232-282 ns). Interleaved A/B in a worktree (HEAD 5ac57e5 vs this change, 3 runs each): create_template_2keys 177.2/178.7/178.4 vs 174.7/181.0 (third B run hit a load spike, 278.6); create_callable_no_context ~149-152 both. No measurable change.
- Verified with scripts/ci-local.sh (070d464, PASS); GitHub Actions unavailable (billing lock).
<!-- SECTION:NOTES:END -->
