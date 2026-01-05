---
id: task-032
title: Write edge case tests for symbols and coercion
status: To Do
assignee: []
created_date: '2026-01-05 15:42'
labels:
  - testing
  - edge-cases
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create tests for edge cases involving symbol behavior, string coercion, and custom inspection.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Tests verify Symbol.for('nodejs.util.inspect.custom') works
- [ ] #2 Tests verify toString() on kind functions
- [ ] #3 Tests verify Symbol.toPrimitive on kind functions
- [ ] #4 Tests verify Symbol.iterator on error sets
- [ ] #5 Tests verify string coercion in various contexts
- [ ] #6 All tests pass with bun test
- [ ] #7 Coverage for symbol behavior reaches 100%
- [ ] #8 bun run typecheck passes with no errors
<!-- AC:END -->
