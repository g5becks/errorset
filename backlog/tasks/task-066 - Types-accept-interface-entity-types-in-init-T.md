---
id: TASK-066
title: 'Types: accept interface entity types in init<T>()'
status: To Do
assignee: []
created_date: '2026-11-10T17:35:00Z'
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
`init<T extends Record<string, unknown>>()` rejects `interface` types (TS2344), because interfaces lack an implicit index signature. That's a common TypeScript surprise. Audit ref: A13.

## Implementation
Constrain with `T extends object` (or `{ [K in keyof T]: unknown }`) while keeping `keyof T & string` for template keys. Type tests: an interface entity compiles; template-key constraints and bad-key errors are unchanged; the type alias form still works.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 init<SomeInterface>() compiles; bad template keys still fail (type tests on TS 5.9/6.0/7.0)
- [ ] #2 CHANGELOG.md has an entry under ## [Unreleased] describing the change
- [ ] #3 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->
