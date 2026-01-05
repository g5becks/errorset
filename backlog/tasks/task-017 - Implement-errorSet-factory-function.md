---
id: task-017
title: Implement errorSet factory function
status: Done
assignee:
  - '@opencode'
created_date: '2026-01-05 15:40'
updated_date: '2026-01-05 16:22'
labels:
  - core
  - factory
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the main errorSet() factory that ties all components together and returns a complete error set with all methods.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 errorSet() function accepts name and kind strings
- [x] #2 Returns callable error set with set-level guard
- [x] #3 Attaches kind constructors for each kind
- [x] #4 Attaches recover, inspect, merge, capture methods
- [x] #5 Attaches Symbol.hasInstance for instanceof support
- [x] #6 Includes Type helper for type exports
- [x] #7 All TypeScript types are correctly inferred
- [x] #8 bun run typecheck passes with no errors
- [x] #9 bun run lint:fix passes with no errors
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create ErrorSet type that combines:
   - SetGuardWithKinds as callable guard
   - Kind functions for each kind (indexed by kind name)
   - Helper methods: recover, inspect, merge, capture, captureAsync
   - Type helper for type exports
   - Symbol.hasInstance support
2. Create errorSet factory function that:
   - Accepts name and rest ...kinds
   - Creates set guard with kinds
   - Creates kind function for each kind
   - Attaches all helper methods bound to the guard
   - Attaches Type helper
3. Export errorSet and ErrorSet type from index.ts
4. Run typecheck and lint:fix to verify
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented errorSet factory function:
- Created ErrorSet type combining SetGuardWithKinds, kind functions, and helper methods
- errorSet() creates complete error set with:
  - Callable set-level guard with instanceof support
  - Kind constructors for each kind (template literal + guard)
  - recover() for expression-style error handling
  - inspect() for side-effect observation
  - merge() for error set composition
  - capture() and captureAsync() for wrapping throwing code
  - Type helper for type exports (typeof UserError.Type)
- All TypeScript types correctly inferred
- Exported errorSet and ErrorSet from index.ts
<!-- SECTION:NOTES:END -->
