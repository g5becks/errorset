---
id: task-012
title: Implement recover helper method
status: Done
assignee:
  - '@opencode'
created_date: '2026-01-05 15:40'
updated_date: '2026-01-05 16:13'
labels:
  - helpers
  - core
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the recover() method that provides expression-style error handling with guaranteed success type by requiring all cases or catch-all.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 recover() method is defined on error set
- [x] #2 Accepts result value and handlers object
- [x] #3 Returns success value unchanged if not an error
- [x] #4 Applies specific handler for matching kind
- [x] #5 Applies catch-all (_) handler if no specific match
- [x] #6 Throws error if no matching handler found
- [x] #7 Return type is T | R where R is handler return type
- [x] #8 bun run typecheck passes with no errors
- [x] #9 bun run lint:fix passes with no errors
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create RecoverHandlers type for handler object
2. Create recover function that takes value, guard, and handlers
3. Return value unchanged if not an error (via guard check)
4. Look up handler by error.kind, fall back to _ handler
5. Throw if no handler found
6. Export recover and types from index.ts
7. Run typecheck and lint:fix to verify
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented recover helper method for expression-style error handling:
- Created RecoverHandler<Kind, T, R> type for individual handlers
- Created RecoverHandlers<Kinds, T, R> type with kind-specific handlers and optional _ catch-all
- recover() function: returns success unchanged, applies matching handler for errors, throws if no handler
- Exported recover, RecoverHandler, RecoverHandlers from index.ts
<!-- SECTION:NOTES:END -->
