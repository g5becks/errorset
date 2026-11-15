---
id: TASK-078
title: Guards narrow their own no-context errors out of the false branch
status: Done
assignee:
  - '@claude'
created_date: '2026-11-14T23:42:00Z'
updated_date: '2026-11-14T23:43:00Z'
labels:
  - types
  - bug
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Reported by agentx (TASK-309 notes): for T | NoContextErr<K, Set>, if (!Set(value)) keeps the no-context error in the false branch (TS2322), though the guard returns true at runtime. Cause: TypeScript removes a union member from a false branch only if it is a subtype of the predicate; NoContextErr (data Record<string, never>) is not a subtype of Err<Kinds, Partial<T>, N>. Same for kind guards, merged guards and recover's result type.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Type tests (tests/types/no-context-narrowing.test-d.ts) fail on main and pass after the fix
- [x] #2 Set, kind (undeclared keys) and merged guards (merge and .merge) remove the set's no-context errors from the false branch; other sets' errors stay
- [x] #3 recover result type excludes no-context errors
- [x] #4 Unions of guards stay callable (no generic predicates)
- [x] #5 Gate passes, plus TS 5.9.3 and 6.0.3 for code and type tests
- [x] #6 agentx consumer check (temp clone): mise run typecheck 0 errors, core and infra tests pass
- [x] #7 CHANGELOG Fixed entry with the type change; README and LLMS.txt updated
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Fix: SetGuard predicate is the new SetErr<Kinds, T, N> = Err<Kinds, Partial<T>, N> | NoContextErr<Kinds, N>; KindGuard adds NoContextErr<Kind, N> for kinds without declared keys (declared kinds can't be no-context, and widening them would make data.id possibly undefined under noUncheckedIndexedAccess); the set's .merge() return and the recover/inspect value parameters use SetErr; helpers cast no-context errors to the handler type (asHandlerError). Symbol.hasInstance is unchanged (instanceof narrowing behaves differently and a union predicate made it worse in a probe).

Rejected alternative: a generic predicate (<V>(v: V) => v is Extract<V, own errors>) kept every existing type exact, but agentx calls a union of kind guards (infra/src/__tests__/keygen-client.test.ts:61) and TypeScript can't call a union of generic signatures; that broke agentx's typecheck (2 errors).

Type change (CHANGELOG): after a guard on unknown, data is Partial<T> | Record<string, never>; GuardedError of merged guards and recover handler params include the no-context forms. Expectations updated in merge.test-d.ts, interface-entity.test-d.ts:40, kind-keys.test-d.ts:87 (intended, exact types only).

Verification: new type tests 12 errors on main, 0 after. Gate (typecheck, lint, bun test 333 pass 100% coverage, build, test:types, test:consumer, TS 5.9.3 and 6.0.3 for code and type tests): PASS (errorset-release/v0.5.1-work/gate-2.log). agentx temp clone with the packed build: mise run --force typecheck exit 0 (0 errors); core 977 pass, infra 753 pass. README example compiled.
<!-- SECTION:NOTES:END -->
