---
id: TASK-069
title: 'DX: lossless message interpolation'
status: In Progress
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-11T03:26:00Z'
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

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Tests first (tests/interpolation.test.ts): strings as-is; null/undefined literal; numbers/booleans/symbols via String; bigint with n (also nested in JSON); Date ISO / Invalid Date; plain objects and arrays as JSON; cycles as [Circular] by ancestor (repeated non-cyclic references render normally); JSON truncated to 200 chars + ellipsis; Error and classes with their own toString (URL, errorset errors) via toString; functions by name; throwing toJSON falls back to the object tag; data keeps originals.
2. interpolate() replaces String(value ?? '') in the creator.
3. Decision: no per-set format hook (0.4 removed format; formatting belongs to loggers). CHANGELOG Changed (message text changes for null/undefined/objects); README note; gate; ci-local.
<!-- SECTION:PLAN:END -->
