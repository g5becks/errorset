---
id: task-004
title: Implement isErr helper function
status: Done
assignee:
  - '@opencode'
created_date: '2026-01-05 15:38'
updated_date: '2026-01-05 15:59'
labels:
  - helpers
  - core
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the isErr() helper that checks if any value is an error from any error set, using the ERR symbol.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 isErr() function is defined and exported
- [x] #2 Returns true for any value with ERR symbol set to true
- [x] #3 Returns false for null, undefined, and plain objects
- [x] #4 Type guard narrows to Err<string, Record<string, unknown>>
- [x] #5 bun run typecheck passes with no errors
- [x] #6 bun run lint:fix passes with no errors
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add isErr() function to src/types.ts (near ERR symbol)
2. Implement type guard that checks for ERR symbol
3. Handle null, undefined, and non-objects safely
4. Export isErr from src/index.ts
5. Run typecheck and lint:fix to verify
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added isErr() type guard function to src/types.ts
- Checks for ERR symbol presence and value === true
- Safely handles null, undefined, and non-objects
- Type narrows to Err<string, Record<string, unknown>>
- Exported from src/index.ts
<!-- SECTION:NOTES:END -->
