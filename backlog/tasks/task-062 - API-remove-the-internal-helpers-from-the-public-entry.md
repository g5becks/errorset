---
id: TASK-062
title: 'API: remove the internal helpers from the public entry'
status: To Do
assignee: []
created_date: '2026-11-10T17:35:00Z'
labels:
  - api
  - breaking
milestone: m-1
dependencies:
  - TASK-053
documentation:
  - errorset-audit.md
priority: low
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
The internal helpers were deprecated in 0.3.1. Audit refs: C1, P3.

## Implementation
Remove `createKindFunction`, `createSetGuard` and `createSetGuardWithKinds` from `src/index.ts`. (If anything legitimately needs them, expose them under an `./internal` subpath export marked unstable; record the decision.) Update the type test from 0.3.1, which asserted they're exported, so it asserts they're absent.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 The three helpers are not exported from the package root (type test); any ./internal subpath decision is recorded
- [ ] #2 CHANGELOG.md lists the change under ## [Unreleased] > ### Breaking changes with migration steps
- [ ] #3 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->
