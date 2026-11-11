---
id: TASK-057
title: >-
  Safety: reject reserved kind names at compile time and with a clear runtime
  error
status: Done
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-10T20:17:00Z'
labels:
  - types
  - breaking
milestone: m-1
dependencies:
  - TASK-053
documentation:
  - errorset-audit.md
priority: medium
type: bug
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Kind names that collide with set methods or properties (`recover`, `kinds`, `Type`, `merge`, `capture`, `captureAsync`, `inspect`…) compile, then throw `TypeError: Attempting to change enumerable attribute of unconfigurable property` at `init()`. Names like `name`, `length`, `call`, `bind`, `constructor`, `__proto__` and `toString` shadow built-ins. Audit ref: A3.

## Implementation
1. A `ReservedKinds` union and a `NoReserved<Kinds>` constraint next to `NoDuplicates`: a compile-time error naming the reserved word.
2. A runtime check in `errorSet()` that throws a clear `Error` (`'"recover" is a reserved kind name in errorset; rename the kind'`) before any `defineProperty` call.
3. Type and runtime tests for **every** reserved name; flip the A3 regression case.
4. Record whether namespacing the helpers (e.g. `$recover`) was considered; recommended: don't, to avoid more breakage.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Every reserved name fails to compile (type test per name) and throws a clear runtime error naming it (runtime test per name)
- [x] #2 A3 regression case passes; non-reserved kinds are unaffected
- [x] #3 CHANGELOG.md lists the change under ## [Unreleased] > ### Breaking changes with migration steps
- [x] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. RESERVED_KINDS (runtime array) and ReservedKind union: set members (recover, inspect, merge, capture, captureAsync, kinds, Type), the recover catch-all key "_", "from" (XError.from in TASK-065, reserved now to avoid a later breaking change), and everything the set function inherits from Function.prototype/Object.prototype (name, length, call, apply, bind, arguments, caller, constructor, toString, valueOf, toLocaleString, hasOwnProperty, isPrototypeOf, propertyIsEnumerable, __proto__, __defineGetter__, __defineSetter__, __lookupGetter__, __lookupSetter__).
2. NoReserved<Kinds> combined with NoDuplicates in errorSet(): a reserved kind maps the parameter to a tuple whose element is the message naming the word.
3. Runtime check in errorSet() before any defineProperty: throws '"<name>" is a reserved kind name in errorset; rename the kind'.
4. Runtime + type test for every reserved name (type tests generated per name); flip A3; namespacing considered and rejected.
5. CHANGELOG breaking, README; gate; ci-local.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Outcome: RESERVED_KINDS (28 names, exported with type ReservedKind and constraint NoReserved): set members recover, inspect, merge, capture, captureAsync, kinds, Type, plus from (reserved now for XError.from in TASK-065 so 0.5.0 stays additive); "_" (recover catch-all key); every own/inherited function property: name, length, apply, bind, call, arguments, caller, constructor, toString, toLocaleString, valueOf, hasOwnProperty, isPrototypeOf, propertyIsEnumerable, __proto__, __defineGetter__, __defineSetter__, __lookupGetter__, __lookupSetter__.
- Compile time: errorSet(name, kinds: NoReserved<NoDuplicates<Kinds>>); a reserved kind maps the parameter to readonly ['"<name>" is a reserved kind name in errorset; rename the kind'] so the error names the word (e.g. TS2322 Type '"recover"' is not assignable to type '"\"recover\" is a reserved kind name ..."'). Literal kind inference unchanged (existing type tests pass).
- Runtime: errorSet() throws Error('"<name>" is a reserved kind name in errorset; rename the kind') in the validation loop, before init() defines any property.
- Tests: tests/types/reserved-kinds.test-d.ts has one @ts-expect-error per name (generated from the list) plus NoReserved message/pass-through checks and look-alike names (recovered, named, to_string...). tests/reserved-kinds.test.ts: test.each over RESERVED_KINDS (28 runtime tests, message names the word), throws at errorSet() before init, a completeness check (every own property of an initialized set and every Function.prototype/Object.prototype name is in RESERVED_KINDS), look-alikes accepted. A3 regression flipped to test (with @ts-expect-error). 201 tests, 100% coverage; 7 test.failing remain.
- Decision: namespacing the helpers ($recover etc.) considered and rejected: it would break every call site while only shrinking the set-member part of the list; the built-in names would stay reserved anyway.
- Docs: README "Reserved Kind Names"; LLMS.txt signature/throws/reserved list; CHANGELOG ### Breaking changes entry with migration.
- Breaking change: yes; kinds in RESERVED_KINDS are rejected (rename them).
- Verification: strict gate passes. Verified with scripts/ci-local.sh (6be8fa2, PASS); GitHub Actions unavailable (billing lock).
<!-- SECTION:NOTES:END -->
