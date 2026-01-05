---
id: task-016
title: Implement capture for async functions
status: Done
assignee:
  - '@opencode'
created_date: '2026-01-05 15:40'
updated_date: '2026-01-05 16:20'
labels:
  - capture
  - core
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Extend the capture() method to handle async functions and return promises with error set values.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 capture() detects when function returns Promise
- [x] #2 Returns Promise<T | ErrorType> for async functions
- [x] #3 Catches rejected promises and passes to mapper
- [x] #4 Mapper receives Error object from rejection
- [x] #5 Converts non-Error rejections to Error objects
- [x] #6 Works with async/await syntax
- [x] #7 bun run typecheck passes with no errors
- [x] #8 bun run lint:fix passes with no errors
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create captureAsync function that:
   - Awaits the async function
   - Returns result on success
   - Catches rejected promise, converts to Error, calls mapper
2. Return type is Promise<T | Err<Kinds, Partial<Data>>>
3. Export captureAsync from index.ts
4. Run typecheck and lint:fix to verify
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented captureAsync for wrapping async throwing code:
- captureAsync() awaits async function in try-catch
- Returns result on success, calls mapper on rejection
- Converts non-Error rejections to Error objects
- Return type is Promise<T | Err<Kinds, Partial<Data>>>
- Works with async/await syntax
- Exported captureAsync from index.ts
<!-- SECTION:NOTES:END -->
