---
id: TASK-049
title: 'API: deprecate the publicly exported internal helpers'
status: In Progress
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-10T19:14:00Z'
labels:
  - api
milestone: m-0
dependencies:
  - TASK-042
documentation:
  - errorset-audit.md
priority: low
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
`createKindFunction`, `createSetGuard` and `createSetGuardWithKinds` are marked `@internal` but exported from the package entry. Audit refs: C1, P3.

## Implementation
1. Add `@deprecated` JSDoc to the three exports ("internal; will be removed from the public entry in 0.4.0").
2. Remove any mention of them from README and LLMS.txt.
3. Add a type test asserting they are still exported in 0.3.1 (non-breaking); the 0.4.0 milestone removes them.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 createKindFunction, createSetGuard and createSetGuardWithKinds carry @deprecated JSDoc and are still exported
- [ ] #2 README and LLMS.txt no longer mention them
- [ ] #3 CHANGELOG.md has an entry under ## [Unreleased] describing the change
- [ ] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. @deprecated JSDoc on createKindFunction, createSetGuard and createSetGuardWithKinds (source declarations, so it reaches dist/*.d.ts).
2. Remove mentions from README and LLMS.txt.
3. Type test asserting the three are still exported from the entry (0.3.1 stays non-breaking).
4. CHANGELOG Deprecated entry; gate; check dist d.ts carries @deprecated; ci-local.
<!-- SECTION:PLAN:END -->
