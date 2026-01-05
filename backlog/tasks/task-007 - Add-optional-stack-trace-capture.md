---
id: task-007
title: Add optional stack trace capture
status: Done
assignee:
  - '@opencode'
created_date: '2026-01-05 15:39'
updated_date: '2026-01-05 16:03'
labels:
  - debugging
  - core
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement zero-cost stack trace capture for V8 environments when includeStack configuration is enabled.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Stack traces are captured using Error.captureStackTrace when available
- [x] #2 Stack capture only happens when config.includeStack is true
- [x] #3 Stack property is added to error object
- [x] #4 Gracefully handles non-V8 environments by skipping stack capture
- [x] #5 Stack depth respects config.stackDepth setting
- [x] #6 bun run typecheck passes with no errors
- [x] #7 bun run lint:fix passes with no errors
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Import getConfig from config.ts in types.ts
2. Modify createKindConstructor to check config.includeStack
3. Use Error.captureStackTrace if available (V8 engines)
4. Respect config.stackDepth for limiting stack depth
5. Add stack property to error object conditionally
6. Run typecheck and lint:fix to verify
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added captureStack() internal function
- Uses Error.captureStackTrace when available (V8 engines)
- Only captures when config.includeStack is true
- Respects config.stackDepth setting
- Gracefully no-ops in non-V8 environments
- Stack trace excludes internal creator function
<!-- SECTION:NOTES:END -->
