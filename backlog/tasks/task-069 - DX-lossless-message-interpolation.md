---
id: TASK-069
title: 'DX: lossless message interpolation'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-11T03:30:00Z'
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
- [x] #1 Objects, arrays, null, undefined, Date and bigint render as specified (tests); cycles don't throw
- [x] #2 CHANGELOG.md has an entry under ## [Unreleased] describing the change
- [x] #3 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Tests first (tests/interpolation.test.ts): strings as-is; null/undefined literal; numbers/booleans/symbols via String; bigint with n (also nested in JSON); Date ISO / Invalid Date; plain objects and arrays as JSON; cycles as [Circular] by ancestor (repeated non-cyclic references render normally); JSON truncated to 200 chars + ellipsis; Error and classes with their own toString (URL, errorset errors) via toString; functions by name; throwing toJSON falls back to the object tag; data keeps originals.
2. interpolate() replaces String(value ?? '') in the creator.
3. Decision: no per-set format hook (0.4 removed format; formatting belongs to loggers). CHANGELOG Changed (message text changes for null/undefined/objects); README note; gate; ci-local.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Outcome: interpolate() replaces String(value ?? '') in the template creator: strings as-is; null/undefined literal; numbers/booleans/symbols via String; bigint as 10n (nested in JSON as "10n"); Date as ISO ('Invalid Date' when invalid); Error, errorset errors, URL and classes with their own toString through it; functions as [Function: name] / [Function]; other objects and arrays as JSON with [Circular] for true cycles (ancestor tracking, so repeated non-cyclic references render normally) and truncation to 200 characters + '…'; a throwing toJSON falls back to the object tag. data keeps the original values. Strings are never truncated.
- Decisions: no per-set format hook (0.4.0 removed the no-op format option; formatting belongs to loggers, and a hook would reintroduce that surface). capture's renderThrown (0.4.0) is unchanged so 0.4 capture messages stay stable. Behavior change (message text for null/undefined/objects/bigint/dates): CHANGELOG [Unreleased] > Changed with a note for code that matches exact messages; not marked breaking (no API/type change).
- Tests: tests/interpolation.test.ts (13); 306 tests, 100% coverage; no existing test depended on the old rendering.
- Benchmarks: interleaved A/B in a worktree (HEAD 9d7ce72 vs change, 3 pairs, host under external load): create_template_2keys A 195.5/228.9/209.0 vs B 195.2/209.3/195.7 ns: no regression (string values take the first switch case).
- Verified with scripts/ci-local.sh (ad85d4b, PASS); GitHub Actions unavailable (billing lock).
<!-- SECTION:NOTES:END -->
