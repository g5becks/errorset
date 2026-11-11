---
id: TASK-065
title: 'API: XError.from() rehydration after JSON or structuredClone'
status: In Progress
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-11T03:07:00Z'
labels:
  - api
milestone: m-2
dependencies:
  - TASK-064
documentation:
  - errorset-audit.md
priority: medium
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
The brand is a symbol key, so errors that cross JSON, `structuredClone`, workers or HTTP become plain objects that no guard recognizes. Audit ref: A5.

## Implementation
1. `XError.from(value: unknown): XError | undefined`. It validates `{ set, kind, message, data }` (with `set === X.name` and `kind` in the set; `data` an object; optional `cause` and `timestamp`), then re-brands and freezes. It returns `undefined` for anything that doesn't match.
2. A top-level `fromJSON`/`rehydrate` helper is optional; record the decision.
3. Tests: JSON and `structuredClone` round-trips for every shape; wrong set; wrong kind; missing fields; extra fields (ignored or rejected; document which); nested cause. Flip the A5 regression case.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 XError.from returns a branded, frozen error for valid input of that set and undefined otherwise (tests for each listed case)
- [ ] #2 JSON and structuredClone round-trips recover full guard behavior; A5 regression case passes
- [ ] #3 CHANGELOG.md has an entry under ## [Unreleased] describing the change
- [ ] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->
