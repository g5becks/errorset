---
id: TASK-063
title: 'Docs: README, generated LLMS.txt, design doc and 0.3→0.4 migration guide'
status: In Progress
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-11T02:35:00Z'
labels:
  - docs
milestone: m-1
dependencies:
  - TASK-055
  - TASK-056
  - TASK-057
  - TASK-058
  - TASK-059
  - TASK-060
  - TASK-061
  - TASK-062
documentation:
  - errorset-audit.md
priority: high
type: docs
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
0.4.0 changes guard behavior and error shape. Consumers, agentx first, need a precise migration guide. The docs (README, LLMS.txt, ERROR_HANDLING_DESIGN.md) still describe 0.3 behavior. Audit refs: C5, and the agentx follow-ups in §5.

## Implementation
1. README: update every changed API (set field, guards, brand, recover, reserved kinds, cause, config, the no-context shape, immutability).
2. `docs/migration-0.4.md`, covering every breaking entry: what changed, why, and how to migrate. Include a "consumers with shared kind names" section with steps to audit `if (XError(r))` sites, plus notes on bundled copies and cause preservation.
3. Generate `LLMS.txt` from the README with a script (`scripts/gen-llms.ts`, run by `bun run docs:llms`), so they can't drift. CI checks that the generated output is up to date (`git diff --exit-code`).
4. Update `ERROR_HANDLING_DESIGN.md`, or archive it to `backlog/docs/` with a pointer if keeping it current isn't worthwhile (record the decision).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 README describes 0.4 behavior accurately (every Breaking changes entry is reflected)
- [ ] #2 docs/migration-0.4.md covers every breaking change with concrete before/after code
- [ ] #3 LLMS.txt is generated from README by bun run docs:llms and CI fails when it is stale
- [ ] #4 The ERROR_HANDLING_DESIGN.md decision is implemented and recorded
- [ ] #5 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. README: fix the stale 0.3 bits (no-context cause example, 'no-context form is a function', native cause JSON with code), add an Immutability section, an Upgrading-from-0.3 pointer, requirements (Bun >=1.3.14 / Node >=22, TS 5.9-7.x), and the new exports (ERR_PROTOCOL, NoContextErr, RESERVED_KINDS) in the API table.
2. docs/migration-0.4.md: one section per Breaking changes entry with before/after code, plus 'consumers with shared kind names' audit steps, bundled copies and cause preservation; add docs/ to package files? (no: link to GitHub; keep tarball lean).
3. scripts/gen-llms.ts + bun run docs:llms: LLMS.txt = fixed agent header + README with the logo/HTML and the Philosophy section removed; deterministic. Test: tests/llms.test.ts checks LLMS.txt equals the generator output (fails when stale, runs in every bun test leg). CI: ci.yml check job runs docs:llms then git diff --exit-code LLMS.txt; mirrored in ci-local.sh.
4. ERROR_HANDLING_DESIGN.md (1,784 lines of pre-0.1 design, describes removed APIs): archive to backlog/docs via the backlog doc CLI as a historical doc with a header, replace the root file with nothing and point from README/CONTRIBUTING if referenced. Decision recorded in notes.
5. Gate, commit, ci-local.
<!-- SECTION:PLAN:END -->
