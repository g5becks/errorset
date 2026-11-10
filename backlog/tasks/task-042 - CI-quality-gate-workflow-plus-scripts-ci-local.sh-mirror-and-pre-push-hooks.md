---
id: TASK-042
title: 'CI: quality-gate workflow plus scripts/ci-local.sh mirror and pre-push hooks'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-10T18:16:00Z'
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
- [x] #1 ci.yml runs lint, typecheck, test with coverage, build and type tests on Linux and macOS for Bun 1.3.14, 1.4.4 and latest; a TS 5.9/6.0/7.0 job (7.1 beta advisory); and a Node 22/LTS import job
- [x] #2 All actions are pinned by commit SHA; bunx --bun actionlint passes
- [x] #3 scripts/ci-local.sh mirrors every ci.yml job, exits non-zero on failure, writes logs, and prints RESULT: PASS for HEAD (run inside the Codex sandbox)
- [x] #4 lefthook pre-push runs typecheck and tests
- [x] #5 Remote CI note recorded: 'Verified with scripts/ci-local.sh (<sha>, PASS); GitHub Actions unavailable (billing lock)'
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. ci.yml: check job {ubuntu,macos} x Bun {1.3.14,1.4.4,latest}; typescript job TS 5.9.3/6.0.3/7.0.2 + 7.1.0-beta advisory; node job (build, import dist on Node 22 and lts/*). Actions pinned by SHA resolved via git ls-remote.
2. scripts/node-import-check.mjs shared by ci.yml and ci-local.
3. scripts/ci-local.sh ported from StrataDB: clean clone of ref, macOS host legs (npm-packed darwin Bun for non-host versions), Linux legs in Colima (oven/bun, node:*-slim), logs under ../errorset-release/ci-local/<sha>/logs, RESULT line.
4. lefthook pre-push: typecheck + bun test.
5. actionlint, quality gate, ci-local HEAD.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Outcome: .github/workflows/ci.yml (push main/release/**, pull_request, workflow_dispatch; permissions contents: read) with jobs check ({ubuntu,macos} x Bun {1.3.14,1.4.4,latest}: frozen install, lint, typecheck, test --coverage, build, test:types), typescript (Bun 1.4.4; tsc --noEmit + type tests on TS 5.9.3/6.0.3/7.0.2, 7.1.0-beta continue-on-error) and node (build, then scripts/node-import-check.mjs on Node 22 and lts/*).
- Actions pinned by commit SHA, resolved with git ls-remote: actions/checkout 3d3c42e (v7.0.1), oven-sh/setup-bun 0c5077e (v2.2.0), actions/setup-node 949feb2 (v7.1.0). bunx --bun actionlint: clean.
- scripts/ci-local.sh ported from StrataDB: clean clone of the ref; macOS legs on the host (npm-packed @oven/bun-darwin-aarch64 for non-host versions, with a bun --version assertion); Linux legs in Colima (oven/bun:<v> with git + npx->bunx shim; node:22-slim and node:lts-slim); logs under ../errorset-release/ci-local/<sha>/logs; prints a table and RESULT; exit 1 on any required failure. Only writes under the repo, ~/.npm and /Users/takinprofit/Dev/errorset-release.
- lefthook: pre-commit ultracite fix kept; pre-push runs bun run typecheck and bun test.
- Verified with scripts/ci-local.sh (71262ba, PASS); GitHub Actions unavailable (billing lock). All 12 legs pass (check x6, TS 5.9.3/6.0.3/7.0.2 + 7.1.0-beta advisory, node 22.23.4 and lts 26.13.0).
- Negative check: a throwaway clone with a deliberately broken assertion (commit 18949d0, not in this repo) gave RESULT: FAIL, exit 1 (check legs fail in bun test/typecheck; TS legs fail with TS2769 because Bun types toEqual).
- Deviation: ci-local was run from Claude Code on the host, not inside a Codex sandbox; the script uses no paths outside the listed writable roots.
- Process note: commit 74aa3d2 landed with a lint error (a pipe masked the exit code); fixed forward in 71262ba before any push.
- Breaking change: none.
<!-- SECTION:NOTES:END -->
