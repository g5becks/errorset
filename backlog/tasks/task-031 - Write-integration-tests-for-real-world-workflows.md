---
id: task-031
title: Write integration tests for real-world workflows
status: Done
assignee: []
created_date: '2026-01-05 15:42'
updated_date: '2026-01-06 19:32'
labels:
  - testing
  - integration
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Create integration tests that simulate complete repository-service-handler workflows with error propagation.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Tests verify repository layer error creation
- [x] #2 Tests verify service layer error merging and propagation
- [x] #3 Tests verify handler layer error handling
- [x] #4 Tests verify type safety across all layers
- [x] #5 Tests cover success and error paths
- [x] #6 All tests pass with bun test
- [x] #7 Coverage for workflow scenarios reaches 100%
- [x] #8 bun run typecheck passes with no errors
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Added real-world workflow integration tests covering: repository layer error creation, service layer error propagation and transformation, handler layer error handling with recover, merged error set handling, inspect for logging/metrics, and capture for external API calls.
<!-- SECTION:NOTES:END -->
