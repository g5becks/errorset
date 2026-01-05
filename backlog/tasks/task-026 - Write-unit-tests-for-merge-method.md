---
id: task-026
title: Write unit tests for merge method
status: Done
assignee: []
created_date: '2026-01-05 15:41'
updated_date: '2026-01-05 16:33'
labels:
  - testing
  - unit
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create comprehensive tests for the merge() method covering error set composition.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Tests verify merged set checks errors from both original sets
- [ ] #2 Tests verify merged set has combined kinds
- [ ] #3 Tests verify original sets remain unchanged
- [ ] #4 Tests verify data becomes untyped in merged set
- [ ] #5 Tests verify multiple merges work correctly
- [ ] #6 All tests pass with bun test
- [ ] #7 Coverage for merge reaches 100%
- [ ] #8 bun run typecheck passes with no errors
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
merge() method fully tested in helpers.test.ts: combining sets, unified guards, kind access
<!-- SECTION:NOTES:END -->
