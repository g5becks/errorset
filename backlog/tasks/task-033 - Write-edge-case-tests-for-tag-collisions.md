---
id: task-033
title: Write edge case tests for tag collisions
status: Done
assignee: []
created_date: '2026-01-05 15:42'
updated_date: '2026-01-06 19:32'
labels:
  - testing
  - edge-cases
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create tests for handling scenarios where merged error sets have colliding tag names.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Tests verify merged sets with same tag names
- [x] #2 Tests verify kind-level guards distinguish colliding tags
- [x] #3 Tests verify type safety with collisions
- [x] #4 Tests verify data access with colliding tags
- [x] #5 All tests pass with bun test
- [x] #6 Coverage for collision scenarios reaches 100%
- [x] #7 bun run typecheck passes with no errors
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added tag collision tests for merged error sets covering: duplicate kinds in merged sets, matching errors with colliding tags, kind-level guards distinguishing colliding tags, set-level guard behavior, data preservation with colliding tags, recover with colliding kinds, and unique tag distinction.
<!-- SECTION:NOTES:END -->
