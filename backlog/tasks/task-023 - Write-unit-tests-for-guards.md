---
id: task-023
title: Write unit tests for guards
status: Done
assignee: []
created_date: '2026-01-05 15:41'
updated_date: '2026-01-05 16:32'
labels:
  - testing
  - unit
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create comprehensive tests for both set-level and kind-level guards, including instanceof support.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Tests verify set-level guard returns true for any error from set
- [ ] #2 Tests verify set-level guard returns false for non-errors
- [ ] #3 Tests verify kind-level guard returns true only for matching kind
- [ ] #4 Tests verify instanceof operator works correctly
- [ ] #5 Tests verify type narrowing behavior
- [ ] #6 Tests verify guards reject errors from other sets
- [ ] #7 All tests pass with bun test
- [ ] #8 Coverage for guards reaches 100%
- [ ] #9 bun run typecheck passes with no errors
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Guards tested: set-level guard, kind-level guard, instanceof support, edge cases for null/undefined/primitives
<!-- SECTION:NOTES:END -->
