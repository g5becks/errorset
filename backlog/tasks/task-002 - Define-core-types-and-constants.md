---
id: task-002
title: Define core types and constants
status: Done
assignee:
  - '@opencode'
created_date: '2026-01-05 15:34'
updated_date: '2026-01-05 15:52'
labels:
  - types
  - foundation
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the foundational type definitions and constants that will be used throughout the library, including the ERR symbol and core error type.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 ERR symbol is defined and exported
- [x] #2 Err<Kind, Data> type is defined with all required properties
- [x] #3 Type includes readonly modifiers for immutability
- [x] #4 Type supports optional cause, timestamp, and stack properties
- [x] #5 bun run typecheck passes with no errors
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create src/types.ts with core type definitions
2. Define ERR unique symbol constant
3. Define Err<Kind, Data> type with all required properties:
   - [ERR]: true (brand)
   - kind: Kind (string literal)
   - message: string
   - data: Data
   - Optional: cause, timestamp, stack
4. Add readonly modifiers for immutability
5. Export all types and constants from src/index.ts
6. Run typecheck and lint:fix to verify
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Created src/types.ts with core type definitions
- Defined ERR unique symbol for branding error objects
- Defined Err<Kind, Data> type with:
  - readonly [ERR]: true (brand)
  - readonly kind, message, data (required)
  - readonly cause?, timestamp?, stack? (optional)
- Updated biome.jsonc to allow type aliases (needed for computed symbol keys)
- Exported ERR and Err from src/index.ts
- All checks pass: typecheck and lint:fix
<!-- SECTION:NOTES:END -->
