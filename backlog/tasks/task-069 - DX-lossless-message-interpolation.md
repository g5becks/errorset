---
id: TASK-069
title: 'DX: lossless message interpolation'
status: To Do
assignee: []
created_date: '2026-11-10T17:35:00Z'
labels:
  - dx
milestone: m-2
dependencies:
  - TASK-064
documentation:
  - errorset-audit.md
priority: low
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Interpolation uses `String(value ?? "")`: objects render as `[object Object]`, and `null`/`undefined` render as empty strings. Audit ref: A15.

## Implementation
Render objects with JSON (cycle-safe, truncated to a sensible length); render `null` and `undefined` literally; render `Date` as an ISO string; render `bigint` with an `n` suffix. Optionally, a per-set `format` hook in `init()` (record the decision). Tests for each type.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Objects, arrays, null, undefined, Date and bigint render as specified (tests); cycles don't throw
- [ ] #2 CHANGELOG.md has an entry under ## [Unreleased] describing the change
- [ ] #3 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->
