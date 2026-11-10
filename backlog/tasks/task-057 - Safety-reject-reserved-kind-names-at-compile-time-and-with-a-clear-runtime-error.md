---
id: TASK-057
title: >-
  Safety: reject reserved kind names at compile time and with a clear runtime
  error
status: In Progress
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-10T20:13:00Z'
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
- [ ] #1 Every reserved name fails to compile (type test per name) and throws a clear runtime error naming it (runtime test per name)
- [ ] #2 A3 regression case passes; non-reserved kinds are unaffected
- [ ] #3 CHANGELOG.md lists the change under ## [Unreleased] > ### Breaking changes with migration steps
- [ ] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. RESERVED_KINDS (runtime array) and ReservedKind union: set members (recover, inspect, merge, capture, captureAsync, kinds, Type), the recover catch-all key "_", "from" (XError.from in TASK-065, reserved now to avoid a later breaking change), and everything the set function inherits from Function.prototype/Object.prototype (name, length, call, apply, bind, arguments, caller, constructor, toString, valueOf, toLocaleString, hasOwnProperty, isPrototypeOf, propertyIsEnumerable, __proto__, __defineGetter__, __defineSetter__, __lookupGetter__, __lookupSetter__).
2. NoReserved<Kinds> combined with NoDuplicates in errorSet(): a reserved kind maps the parameter to a tuple whose element is the message naming the word.
3. Runtime check in errorSet() before any defineProperty: throws '"<name>" is a reserved kind name in errorset; rename the kind'.
4. Runtime + type test for every reserved name (type tests generated per name); flip A3; namespacing considered and rejected.
5. CHANGELOG breaking, README; gate; ci-local.
<!-- SECTION:PLAN:END -->
