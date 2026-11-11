---
id: TASK-075
title: 'CI: benchmark tracking workflow'
status: In Progress
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-11T04:02:00Z'
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
- [ ] #1 benchmarks.yml is manual + weekly, uploads JSON artifacts, pins actions; actionlint passes
- [ ] #2 Local benchmark numbers recorded
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. .github/workflows/benchmarks.yml: workflow_dispatch (runs input) + weekly schedule, ubuntu-latest, Bun 1.4.4, frozen install, bun run bench --runs N --json bench-<sha>.json, upload-artifact; actions pinned by SHA (checkout v7.0.1, setup-bun v2.2.0, upload-artifact v7.0.2 cf430e0, released 2026-10-07); contents: read only.
2. actionlint; run the same bench command locally on a quiet machine and record the numbers.
3. ci.yml is unchanged, so ci-local needs no mirror (benchmarks are not a CI gate).
<!-- SECTION:PLAN:END -->
