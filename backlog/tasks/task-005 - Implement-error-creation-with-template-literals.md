---
id: task-005
title: Implement error creation with template literals
status: Done
assignee:
  - '@opencode'
created_date: '2026-01-05 15:38'
updated_date: '2026-01-05 16:00'
labels:
  - core
  - creation
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the core mechanism for creating errors using tagged template literals that extract fields from entities.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Kind constructor accepts TemplateStringsArray and keys
- [x] #2 Returns a function that accepts entity and optional cause
- [x] #3 Extracts only referenced fields from entity into data
- [x] #4 Formats message by interpolating values into template
- [x] #5 Created error has ERR symbol, kind, message, and data properties
- [x] #6 bun run typecheck passes with no errors
- [x] #7 bun run lint:fix passes with no errors
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create createKindConstructor function that:
   - Takes kind string and set name
   - Returns a tagged template function
2. Template function:
   - Receives TemplateStringsArray and keys (field names)
   - Returns entity acceptor function
3. Entity acceptor:
   - Extracts only referenced fields into data
   - Builds message by interpolating values
   - Returns error object with ERR, kind, message, data
   - Supports optional cause option
4. Add to types.ts or create new file
5. Export and verify with typecheck/lint
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Added createKindConstructor() internal function
- Returns tagged template function that accepts TemplateStringsArray and keys
- Template function returns ErrorCreator that accepts entity and options
- Extracts only referenced fields into data object
- Builds message by interpolating entity values into template
- Created error has ERR symbol, kind, message, data properties
- Supports optional cause via ErrorOptions
- Added KindConstructor, ErrorCreator, ErrorOptions types
<!-- SECTION:NOTES:END -->
