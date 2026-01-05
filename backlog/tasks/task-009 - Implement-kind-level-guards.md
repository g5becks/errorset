---
id: task-009
title: Implement kind-level guards
status: Done
assignee:
  - '@opencode'
created_date: '2026-01-05 15:39'
updated_date: '2026-01-05 16:07'
labels:
  - guards
  - core
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create kind-specific guard functions that check if a value is a specific error kind and narrow the type accordingly.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Each kind function acts as both creator and guard
- [x] #2 When called with a value (not template), acts as type guard
- [x] #3 Returns true only for errors with exact matching kind
- [x] #4 Type guard narrows to Err<Kind, Partial<T>>
- [x] #5 Distinguishes between template literal call and guard call
- [x] #6 bun run typecheck passes with no errors
- [x] #7 bun run lint:fix passes with no errors
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Modify createKindConstructor to return dual-purpose function
2. Detect if called with TemplateStringsArray (creator) or value (guard)
3. When guard: check ERR symbol and exact kind match
4. Add KindFunction type that combines creator and guard signatures
5. Type narrow to Err<Kind, Partial<T>> when used as guard
6. Run typecheck and lint:fix to verify
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Replaced createKindConstructor with createKindFunction
- KindFunction type combines KindConstructor and KindGuard
- Detects template literal call via Array.isArray + raw property check
- When called with value, acts as type guard for exact kind match
- Type narrows to Err<Kind, Partial<T>>
- Added KindGuard type for kind-specific guards
<!-- SECTION:NOTES:END -->
