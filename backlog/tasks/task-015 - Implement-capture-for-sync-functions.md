---
id: task-015
title: Implement capture for sync functions
status: Done
assignee:
  - '@opencode'
created_date: '2026-01-05 15:40'
updated_date: '2026-01-05 16:18'
labels:
  - capture
  - core
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the capture() method that wraps synchronous throwing code and converts exceptions to error set values.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 capture() method is defined on error set
- [x] #2 Accepts a function and error mapper
- [x] #3 Returns function result if no error thrown
- [x] #4 Catches thrown errors and passes to mapper
- [x] #5 Returns mapped error from error set
- [x] #6 Converts non-Error throws to Error objects
- [x] #7 Return type is T | ErrorType for sync functions
- [x] #8 bun run typecheck passes with no errors
- [x] #9 bun run lint:fix passes with no errors
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create ErrorMapper type (receives Error, returns Err)
2. Create captureSync function that:
   - Wraps function call in try-catch
   - Returns result on success
   - Catches error, converts non-Error to Error, calls mapper
3. Export captureSync and ErrorMapper from index.ts
4. Run typecheck and lint:fix to verify
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented captureSync for wrapping synchronous throwing code:
- Created ErrorMapper<Kinds, T> type (receives Error, returns Err)
- captureSync() wraps function in try-catch
- Returns result on success, calls mapper on error
- Converts non-Error throws to Error objects
- Return type is T | Err<Kinds, Partial<Data>>
- Exported captureSync and ErrorMapper from index.ts
<!-- SECTION:NOTES:END -->
