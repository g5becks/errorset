---
id: TASK-075
title: 'CI: benchmark tracking workflow'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-11T04:05:00Z'
labels:
  - ci
  - performance
milestone: m-2
dependencies:
  - TASK-073
documentation:
  - errorset-audit.md
priority: low
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Benchmarks exist (v0.3.1) but aren't tracked. Audit ref: ES-33.

## Implementation
`.github/workflows/benchmarks.yml` (workflow_dispatch plus weekly schedule, ubuntu-latest, SHA-pinned actions) runs `bun run bench --json` and uploads the result as an artifact. Validate with actionlint (Actions is locked, so it can't run yet). Record a local run's numbers in the notes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 benchmarks.yml is manual + weekly, uploads JSON artifacts, pins actions; actionlint passes
- [x] #2 Local benchmark numbers recorded
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. .github/workflows/benchmarks.yml: workflow_dispatch (runs input) + weekly schedule, ubuntu-latest, Bun 1.4.4, frozen install, bun run bench --runs N --json bench-<sha>.json, upload-artifact; actions pinned by SHA (checkout v7.0.1, setup-bun v2.2.0, upload-artifact v7.0.2 cf430e0, released 2026-10-07); contents: read only.
2. actionlint; run the same bench command locally on a quiet machine and record the numbers.
3. ci.yml is unchanged, so ci-local needs no mirror (benchmarks are not a CI gate).
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Outcome: .github/workflows/benchmarks.yml: workflow_dispatch (input 'runs', default 3) + weekly schedule (Mondays 06:17 UTC), ubuntu-latest, timeout 20 min, permissions contents: read, concurrency group; Bun 1.4.4; bun install --frozen-lockfile; bun run bench --runs N --json bench-<sha>.json; actions/upload-artifact uploads it (name bench-<sha>-<run_number>, if-no-files-found: error, 90-day retention). Actions pinned by SHA: checkout 3d3c42e5aac5ba805825da76410c181273ba90b1 (v7.0.1), setup-bun 0c5077e51419868618aeaa5fe8019c62421857d6 (v2.2.0), upload-artifact cf430e030ddbb5b0abf93d22962f4752f3646cd9 (v7.0.2, released 2026-10-07; resolved via gh api, lightweight tag). bunx --bun actionlint passes. CONTRIBUTING documents it. Not a CI gate and ci.yml is unchanged, so scripts/ci-local.sh needs no mirror. The workflow has not run on GitHub (Actions billing lock).
- Local run of the workflow's command (bun run bench --runs 3 --json /Users/takinprofit/Dev/errorset-release/bench-075.json; Bun 1.4.4, Apple M5; host load average ~7.7 from an unrelated container, so baselines read ~8-10% high: plain object 24.6 vs ~22, new Error 104.8 vs ~96): create_template_2keys 62.6, create_template_only 7.4, create_callable_no_context 26.4, baseline_plain_object 24.6, baseline_new_error 104.8, guard_set_2kind 5.8, guard_set_40kind_last 5.9, guard_non_error 6.2, create_include_stack 496.3 ns/op (medians). Quiet-host numbers for the same code are in the TASK-071/072/074 notes (template 56-59 ns).
- Verified with scripts/ci-local.sh (1299841, PASS); GitHub Actions unavailable (billing lock).
<!-- SECTION:NOTES:END -->
