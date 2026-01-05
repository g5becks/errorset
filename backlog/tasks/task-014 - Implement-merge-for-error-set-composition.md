---
id: task-014
title: Implement merge for error set composition
status: Done
assignee:
  - '@opencode'
created_date: '2026-01-05 15:40'
updated_date: '2026-01-05 16:17'
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
- [x] #1 merge() method is defined on error set
- [x] #2 Accepts another error set as parameter
- [x] #3 Returns new error set with combined kinds
- [x] #4 New set checks for errors from either original set
- [x] #5 Merged set has untyped data (Record<string, unknown>)
- [x] #6 Original sets remain unchanged
- [x] #7 bun run typecheck passes with no errors
- [x] #8 bun run lint:fix passes with no errors
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create MergedSetGuard type that combines kinds from two sets
2. Implement merge function that takes two SetGuards and combines their kinds
3. Returns a new SetGuard with union of kinds and untyped data
4. Export merge and types from index.ts
5. Run typecheck and lint:fix to verify
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented merge for error set composition:
- Created SetGuardWithKinds type extending SetGuard with kinds array
- createSetGuardWithKinds() attaches readonly kinds array to guard
- merge() combines kinds from two guards into unified guard
- Merged guard uses untyped data (Record<string, unknown>)
- Original sets remain unchanged
- Exported merge, createSetGuardWithKinds, SetGuardWithKinds from index.ts
<!-- SECTION:NOTES:END -->
