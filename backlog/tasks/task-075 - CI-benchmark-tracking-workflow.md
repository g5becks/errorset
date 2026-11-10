---
id: TASK-075
title: 'CI: benchmark tracking workflow'
status: To Do
assignee: []
created_date: '2026-11-10T17:35:00Z'
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
