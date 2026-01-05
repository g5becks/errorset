---
id: task-014
title: Implement merge for error set composition
status: To Do
assignee: []
created_date: '2026-01-05 15:40'
labels:
  - composition
  - core
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the merge() method that combines kinds from multiple error sets into a new unified set.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 merge() method is defined on error set
- [ ] #2 Accepts another error set as parameter
- [ ] #3 Returns new error set with combined kinds
- [ ] #4 New set checks for errors from either original set
- [ ] #5 Merged set has untyped data (Record<string, unknown>)
- [ ] #6 Original sets remain unchanged
- [ ] #7 bun run typecheck passes with no errors
- [ ] #8 bun run lint:fix passes with no errors
<!-- AC:END -->
