---
id: task-011
title: Add string coercion for kind functions
status: Done
assignee:
  - '@opencode'
created_date: '2026-01-05 15:39'
updated_date: '2026-01-05 16:10'
labels:
  - helpers
  - core
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement toString() and Symbol.toPrimitive on kind functions to support string coercion in template literals and comparisons.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Kind functions have toString() method returning kind string
- [x] #2 Kind functions have Symbol.toPrimitive returning kind string
- [x] #3 String coercion works in template literals
- [x] #4 Loose equality (==) works for kind comparison
- [x] #5 bun run typecheck passes with no errors
- [x] #6 bun run lint:fix passes with no errors
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Modify createKindFunction to add toString method
2. Add Symbol.toPrimitive to return kind string
3. Use Object.defineProperty to attach these non-enumerable
4. Test string coercion in template literals
5. Run typecheck and lint:fix to verify
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added toString() method to kind functions returning kind string
- Added Symbol.toPrimitive to kind functions for coercion
- Both attached via Object.defineProperty (non-enumerable)
- Enables: `Error: ${UserError.not_found}` => "Error: not_found"
- Enables: result.kind == UserError.not_found (loose equality)
<!-- SECTION:NOTES:END -->
