---
id: TASK-050
title: >-
  Hygiene: single agent-instructions source, archive TASK_PLAN, fold the
  playground tests
status: To Do
assignee: []
created_date: '2026-11-10T17:35:00Z'
labels:
  - hygiene
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
- Agent instructions are duplicated: `AGENTS.md` is byte-identical to `.github/copilot-instructions.md`, and `CLAUDE.md`, `GEMINI.md` and `.claude/CLAUDE.md` overlap heavily.
- `TASK_PLAN.md` is the original build plan, superseded by `backlog/`.
- `tests/playground.test.ts` is a scratch file.

Audit refs: C3, C4, C7.

## Implementation
1. Keep `AGENTS.md` as the single source, updated for the current workflow: Bun, the backlog CLI via `bunx backlog`, the quality gate, `scripts/ci-local.sh`, and "the maintainer publishes". Make `CLAUDE.md`, `GEMINI.md`, `.claude/CLAUDE.md` and `.github/copilot-instructions.md` short pointers to it (StrataDB's `CLAUDE.md` is a good model).
2. Move `TASK_PLAN.md` to `backlog/docs/` with a one-line note that it's historical.
3. Fold the useful cases from `tests/playground.test.ts` into `tests/error-set.test.ts` and delete the playground file. The test count must not drop for real cases; record before/after.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 AGENTS.md is the single source of agent instructions; the other instruction files are short pointers to it
- [ ] #2 TASK_PLAN.md lives under backlog/docs/ marked as historical
- [ ] #3 tests/playground.test.ts is removed and its meaningful cases live in the real suites (before/after counts in notes)
- [ ] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->
