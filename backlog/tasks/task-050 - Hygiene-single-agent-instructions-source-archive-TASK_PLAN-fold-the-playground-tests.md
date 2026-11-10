---
id: TASK-050
title: >-
  Hygiene: single agent-instructions source, archive TASK_PLAN, fold the
  playground tests
status: Done
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-10T19:31:00Z'
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
- [x] #1 AGENTS.md is the single source of agent instructions; the other instruction files are short pointers to it
- [x] #2 TASK_PLAN.md lives under backlog/docs/ marked as historical
- [x] #3 tests/playground.test.ts is removed and its meaningful cases live in the real suites (before/after counts in notes)
- [x] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. AGENTS.md as single source: new project section (toolchain, gate, CI/ci-local, releases, backlog via bunx) + existing Backlog guide (CLI commands rewritten to bunx backlog) + Ultracite standards.
2. CLAUDE.md, GEMINI.md, .claude/CLAUDE.md, .github/copilot-instructions.md -> short pointers (StrataDB model).
3. TASK_PLAN.md -> backlog doc via the CLI (doc create + doc update), marked historical; remove the root file.
4. Fold the 7 playground tests into tests/error-set.test.ts; delete the playground file; record counts.
5. Gate, ci-local.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Outcome: AGENTS.md (712 lines) is the single source: a new project section (layout, Bun toolchain, quality gate, CI and ci-local mirror rule, billing-lock wording, releases/maintainer publishes, backlog via bunx) followed by the existing Backlog.md guide (112 CLI invocations rewritten to `bunx backlog`) and the Ultracite code standards. CLAUDE.md, GEMINI.md, .claude/CLAUDE.md and .github/copilot-instructions.md are 6-line pointers to it (previously 24 KB, 21.5 KB, 5 KB and a 26.5 KB byte-identical copy of AGENTS.md).
- TASK_PLAN.md: moved with the Backlog CLI (no hand edits under backlog/): `bunx backlog doc create "TASK_PLAN (historical)" -p history -t other`, then `doc update doc-001 --content ... --tags history`; the body starts with a "Historical" note, then the original plan verbatim (diff shows only trailing blank lines trimmed). Root file removed.
- Playground: all 7 tests were meaningful (callable no-context errors: direct use, cause, data, isErr/set/kind guards, instanceof) and moved unchanged into tests/error-set.test.ts as describe("errorSet no-context (callable) errors"), now importing ../src/index.ts. Counts: before 144 tests in 8 files; after 144 tests in 7 files; coverage unchanged (100% funcs / 99.90% lines).
- Verification: strict gate passes. Verified with scripts/ci-local.sh (514130c, PASS); GitHub Actions unavailable (billing lock).
- Breaking change: none.
<!-- SECTION:NOTES:END -->
