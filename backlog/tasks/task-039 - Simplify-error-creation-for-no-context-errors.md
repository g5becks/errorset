---
id: task-039
title: Simplify error creation for no-context errors
status: Done
assignee:
  - '@myself'
created_date: '2026-01-17 23:02'
updated_date: '2026-01-17 23:19'
labels: []
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Allow creating errors without calling the creator function when no context is needed, or at least make arguments optional.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Investigate feasibility of Callable Error pattern (Error object that is also a creator function)
- [x] #2 Update KindConstructor type to return Callable Error when no keys are present
- [x] #3 Update createKindFunction to return Callable Error at runtime
- [x] #4 Update isErr to support callable errors (functions)
- [x] #5 Verify with tests
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create 'tests/playground.test.ts' to experiment with TypeScript types for Callable Errors.
2. Verify if 'isErr' needs update to support functions.
3. Modify 'KindConstructor' in 'src/types.ts' to return a conditional type.
4. Modify 'createKindFunction' in 'src/types.ts' to return a callable object (function with properties).
5. Update 'isErr' in 'src/types.ts' to check for 'typeof value === "function"' or object.
6. Verify existing tests pass.
7. Add new tests for the simplified syntax.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Implemented CallableErr feature for simplified error creation syntax.

## Changes
- Added `CallableErr<Kind>` type - a function with error properties
- Updated `isErr()` to handle functions with ERR symbol
- Updated `createKindFunction()` to return CallableErr when no template holes
- Updated set-level and kind-level guards to handle callable errors
- Added comprehensive tests in `tests/playground.test.ts`
- Updated type tests in `test-d/index.test-d.ts`
- Updated README.md and LLMS.txt documentation

## Breaking Change
Template literals without holes now return CallableErr instead of ErrorCreator.
Old pattern: `Error.kind\`msg\`({})` 
New pattern: `Error.kind\`msg\`` (no empty call needed)

Code passing unused data without template holes will need updating.
<!-- SECTION:NOTES:END -->
