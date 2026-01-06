---
id: task-032
title: Write edge case tests for symbols and coercion
status: Done
assignee: []
created_date: '2026-01-05 15:42'
updated_date: '2026-01-06 19:32'
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
- [x] #1 Tests verify Symbol.for('nodejs.util.inspect.custom') works
- [x] #2 Tests verify toString() on kind functions
- [x] #3 Tests verify Symbol.toPrimitive on kind functions
- [x] #4 Tests verify Symbol.iterator on error sets
- [x] #5 Tests verify string coercion in various contexts
- [x] #6 All tests pass with bun test
- [x] #7 Coverage for symbol behavior reaches 100%
- [x] #8 bun run typecheck passes with no errors
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added symbol and coercion edge case tests covering: nodejs.util.inspect.custom symbol, toString() on kind functions, Symbol.toPrimitive for template literals and coercion, Symbol.iterator for iteration/spread/destructuring, and Symbol.hasInstance for instanceof support.
<!-- SECTION:NOTES:END -->
