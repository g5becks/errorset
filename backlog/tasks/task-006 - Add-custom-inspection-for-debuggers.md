---
id: task-006
title: Add custom inspection for debuggers
status: Done
assignee:
  - '@opencode'
created_date: '2026-01-05 15:39'
updated_date: '2026-01-05 16:01'
labels:
  - debugging
  - core
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implement custom inspection method for Node.js debuggers to provide clean console output when errors are logged.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Errors have Symbol.for('nodejs.util.inspect.custom') method
- [x] #2 Custom inspect returns formatted string with error set name, kind, and data
- [x] #3 Format is: ErrorSetName.kind { data }
- [x] #4 Works correctly with console.log()
- [x] #5 bun run typecheck passes with no errors
- [x] #6 bun run lint:fix passes with no errors
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add nodejs inspect symbol constant
2. Modify createKindConstructor to include custom inspect method
3. Format output as: ErrorSetName.kind { data }
4. Run typecheck and lint:fix to verify
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added INSPECT symbol constant for nodejs.util.inspect.custom
- Modified createKindConstructor to add custom inspect method
- Inspect returns: ErrorSetName.kind { data }
- Works with console.log() for clean debugger output
<!-- SECTION:NOTES:END -->
