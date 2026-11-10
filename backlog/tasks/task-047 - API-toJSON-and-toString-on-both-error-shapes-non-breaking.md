---
id: TASK-047
title: 'API: toJSON and toString on both error shapes (non-breaking)'
status: To Do
assignee: []
created_date: '2026-11-10T17:35:00Z'
labels:
  - api
milestone: m-0
dependencies:
  - TASK-042
documentation:
  - errorset-audit.md
priority: high
type: feature
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
The no-context callable error is a **function**: `JSON.stringify({ error })` → `{}`, so errors vanish from logs and HTTP responses. Errors also have no `name`, and `String(err)` is `[object Object]`. Audit refs: A4 (option a, non-breaking), A7.

## Implementation
1. Write the regression tests first: JSON output of both error shapes (template and callable), `String(err)`, and `JSON.stringify({ error })` nesting.
2. Define a non-enumerable `toJSON()` on both shapes, returning `{ kind, message, data, cause? }` (and `timestamp` when set). `cause` serializes recursively through its own `toJSON` when it's an errorset error; for a native `Error`, serialize `{ name, message }`.
3. Define a non-enumerable `toString()` returning `"<SetName>.<kind>: <message>"`.
4. Don't add enumerable fields, so object keys and existing deep-equality tests stay unchanged.
5. Document both in the README ("Serialization and logging").
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 JSON.stringify(err) and JSON.stringify({ error: err }) produce { kind, message, data, cause? } for template and callable errors
- [ ] #2 String(err) returns '<SetName>.<kind>: <message>' for both shapes
- [ ] #3 Object.keys(err) is unchanged (toJSON and toString are non-enumerable); existing tests still pass unmodified
- [ ] #4 README documents serialization and logging
- [ ] #5 CHANGELOG.md has an entry under ## [Unreleased] describing the change
- [ ] #6 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->
