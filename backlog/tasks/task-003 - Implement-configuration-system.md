---
id: task-003
title: Implement configuration system
status: Done
assignee:
  - '@opencode'
created_date: '2026-01-05 15:38'
updated_date: '2026-01-05 15:55'
labels:
  - config
  - core
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create the global configuration system that allows users to customize error formatting, stack traces, and other behavior.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 configure() function accepts all documented options
- [x] #2 Configuration is stored in a global state accessible to error creation
- [x] #3 Default configuration values are set correctly
- [x] #4 Configuration options include format, includeStack, includeTimestamp, colors, stackDepth
- [x] #5 bun run typecheck passes with no errors
- [x] #6 bun run lint:fix passes with no errors
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Create src/config.ts with configuration types and state
2. Define Config type with all options (format, includeStack, includeTimestamp, colors, stackDepth)
3. Create default configuration values
4. Implement configure() function to merge user options with defaults
5. Implement getConfig() function to access current configuration
6. Export configure and getConfig from src/index.ts
7. Run typecheck and lint:fix to verify
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Created src/config.ts with complete configuration system
- Defined Config type with all options: format, includeStack, includeTimestamp, colors, stackDepth
- Defined Format type: "pretty" | "json" | "minimal"
- Set sensible defaults (stack/timestamp off for expected failures)
- Implemented configure(), getConfig(), resetConfig() functions
- Exported all from src/index.ts
<!-- SECTION:NOTES:END -->
