---
id: TASK-054
title: 'Identity: registry-symbol brand with protocol version (cross-copy recognition)'
status: To Do
assignee: []
created_date: '2026-11-10T17:35:00Z'
labels:
  - identity
  - breaking
milestone: m-1
dependencies:
  - TASK-053
documentation:
  - errorset-audit.md
priority: high
type: bug
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
`ERR = Symbol("err")` is per module instance, so two copies of errorset (bundled plugins, duplicate installs) don't recognize each other's errors. agentx plugins bundle their own copy. Audit ref: A2.

## Implementation
1. `ERR = Symbol.for("@takinprofit/errorset/err")`. The brand **value** carries a protocol number (e.g. `{ protocol: 1 }` or the number `1`), so future shape changes can be detected. Guards accept any protocol they understand.
2. Keep `ERR` exported (now the registry symbol).
3. Flip the A2 cross-copy regression case to `test` for `isErr`. The set and kind guards also pass once set identity exists (next task); if they still depend on it, keep those assertions `test.failing`, assigned to that task.
4. Document in the README that brand checks work across copies and versions with the same protocol.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 ERR is Symbol.for('@takinprofit/errorset/err') and the brand value carries a protocol number
- [ ] #2 Cross-copy regression: isErr from copy A accepts errors from copy B (test passes)
- [ ] #3 README documents cross-copy behavior
- [ ] #4 CHANGELOG.md lists the change under ## [Unreleased] > ### Breaking changes with migration steps
- [ ] #5 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->
