---
id: TASK-042
title: 'CI: quality-gate workflow plus scripts/ci-local.sh mirror and pre-push hooks'
status: To Do
assignee: []
created_date: '2026-11-10T17:35:00Z'
labels:
  - ci
milestone: m-0
dependencies:
  - TASK-041
documentation:
  - errorset-audit.md
priority: high
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
There is no CI (`.github/` has only `copilot-instructions.md`), and lefthook only runs `ultracite fix` on pre-commit. Audit ref: Q2.

GitHub Actions is currently unavailable for this account (billing lock), so the workflow **and** a local runner that mirrors it are both required. Port the approach proven in StrataDB (`/Users/takinprofit/Dev/StrataDb/scripts/ci-local.sh`): a clean clone of a ref; macOS jobs on the host; Linux jobs in Docker via Colima using `oven/bun:<version>` (with git installed and an `npx` -> `bunx` shim if any tool needs npx); a results table; `RESULT: PASS|FAIL`; logs under `/Users/takinprofit/Dev/errorset-release/ci-local/<sha>/logs/`.

## Implementation
1. `.github/workflows/ci.yml`, triggered on push to main and `release/**`, on pull_request and workflow_dispatch, with `permissions: contents: read`:
   - **check** job, matrix {ubuntu-latest, macos-latest} × Bun {1.3.14, 1.4.4, latest}: `bun install --frozen-lockfile`, `bun run lint`, `bun run typecheck`, `bun test --coverage`, `bun run build`, `bun run test:types`.
   - **typescript** job (ubuntu, Bun 1.4.4): `tsc --noEmit` and the type tests on TS 5.9.3, 6.0.3 and 7.0.2 (blocking), plus 7.1 beta (advisory, continue-on-error).
   - **node** job: after a build, import `dist/index.js` on Node 22 and the current LTS (`node -e 'import("./dist/index.js").then(m => …)'`).
   - Pin every action by commit SHA, with a version comment.
2. `scripts/ci-local.sh [ref]`: runs the same matrix locally. For Node legs in Linux, use `node:<version>-slim` images. Bun 1.3.14 on macOS: download the `@oven/bun-darwin-aarch64@<v>` binary as StrataDB's script does. Must work inside the Codex sandbox (writable roots include the repo, `.git`, `~/.bun`, `~/.cache/.bun`, `~/.npm` and `/Users/takinprofit/Dev/errorset-release`).
3. lefthook: keep pre-commit `ultracite fix`; add pre-push `bun run typecheck` and `bun test`.
4. Validate the workflow with `bunx --bun actionlint`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 ci.yml runs lint, typecheck, test with coverage, build and type tests on Linux and macOS for Bun 1.3.14, 1.4.4 and latest; a TS 5.9/6.0/7.0 job (7.1 beta advisory); and a Node 22/LTS import job
- [ ] #2 All actions are pinned by commit SHA; bunx --bun actionlint passes
- [ ] #3 scripts/ci-local.sh mirrors every ci.yml job, exits non-zero on failure, writes logs, and prints RESULT: PASS for HEAD (run inside the Codex sandbox)
- [ ] #4 lefthook pre-push runs typecheck and tests
- [ ] #5 Remote CI note recorded: 'Verified with scripts/ci-local.sh (<sha>, PASS); GitHub Actions unavailable (billing lock)'
<!-- AC:END -->
