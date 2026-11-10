---
id: TASK-057
title: >-
  Safety: reject reserved kind names at compile time and with a clear runtime
  error
status: To Do
assignee: []
created_date: '2026-11-10T17:35:00Z'
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
