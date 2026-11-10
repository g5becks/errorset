---
id: TASK-048
title: >-
  Config: implement includeTimestamp and deprecate the no-op format/colors
  options
status: In Progress
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-10T19:07:00Z'
labels:
  - config
milestone: m-0
dependencies:
  - TASK-042
documentation:
  - errorset-audit.md
priority: high
type: bug
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
`Config.format`, `colors` and `includeTimestamp` are documented in the README and LLMS.txt but referenced nowhere in `src/`, and `Err.timestamp` is never set. Audit ref: A11 (0.3.1 part).

## Implementation
1. Write the regression tests first.
2. Implement `includeTimestamp` (global and per-set): when true, set `timestamp: Date.now()` at creation, on both error shapes. When false, the property is absent (not `undefined`).
3. Mark `format` and `colors` `@deprecated` in the types (JSDoc: "no effect; removed in 0.4.0; format errors in your logger"). Calling `configure()` with them must not throw.
4. Correct the README and LLMS.txt configuration sections so they describe what actually works.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 configure({ includeTimestamp: true }) and init({ includeTimestamp: true }) set a numeric timestamp on both error shapes; when false the property is absent (tests)
- [ ] #2 format and colors carry @deprecated JSDoc stating they have no effect and are removed in 0.4.0
- [ ] #3 README and LLMS.txt configuration docs list only working options and mark the deprecated ones
- [ ] #4 CHANGELOG.md has an entry under ## [Unreleased] describing the change
- [ ] #5 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Tests first (tests/config.test.ts additions or a new file): global and per-set includeTimestamp on template, callable and called-callable errors; absent (not undefined) when off; per-set false overrides global true; toJSON includes timestamp; configure() with format/colors does not throw.
2. Compute the effective config once per creation (shared by stack capture and timestamp); set timestamp: Date.now() when enabled.
3. @deprecated JSDoc on format, colors and the Format type.
4. Fix README and LLMS.txt configuration sections; CHANGELOG.
5. Gate, bench, ci-local.
<!-- SECTION:PLAN:END -->
