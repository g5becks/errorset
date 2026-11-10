---
id: TASK-044
title: >-
  Testing: packed-tarball consumer smoke test (TS 5.9/6.0/7.0, ESM and CJS, Node
  and Bun)
status: To Do
assignee: []
created_date: '2026-11-10T17:35:00Z'
labels:
  - testing
  - packaging
milestone: m-0
dependencies:
  - TASK-043
documentation:
  - errorset-audit.md
priority: high
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Nothing checks the *published* shape of the package. During the audit, a manual check passed on TS 5.9, 6.0 and 7.0 (`bundler` and `nodenext`, `skipLibCheck: false`), and CJS `require` failed. Audit ref: Q5.

## Implementation
Port StrataDB's packed-consumer approach (`/Users/takinprofit/Dev/StrataDb/scripts/smoke-consumer.ts`):
1. Add `scripts/smoke-consumer.ts` and a `test:consumer` script (`bun run build && bun scripts/smoke-consumer.ts`).
2. Run `bun pm pack` into a temp directory, then install the tarball into isolated fixtures with **production dependencies only**.
3. Type-check a consumer file that uses the public API, including one `@ts-expect-error` for a bad template key, on TS 5.9.3, 6.0.3 and 7.0.2. Test both `moduleResolution: bundler` and `nodenext`, with `skipLibCheck: false`.
4. At runtime: ESM `import` and CJS `require` on Bun and on Node (22 and LTS when available). Create an error, guard it, and `recover` it.
5. Add the smoke test to `ci.yml` and `scripts/ci-local.sh`.
6. Mutation check: break `types` in the packed package.json, or remove the `default` export condition, and confirm the smoke test fails.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 bun run test:consumer packs the package and type-checks a consumer on TS 5.9.3, 6.0.3 and 7.0.2 with bundler and nodenext, skipLibCheck false
- [ ] #2 The consumer runs ESM import and CJS require on Bun and Node, creating, guarding and recovering an error
- [ ] #3 The smoke test runs in ci.yml and scripts/ci-local.sh
- [ ] #4 Mutation check recorded: a broken types path or missing default condition makes test:consumer fail
- [ ] #5 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->
