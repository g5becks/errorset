---
id: TASK-072
title: 'Performance: Set-based kind membership for large sets'
status: To Do
assignee: []
created_date: '2026-11-10T17:35:00Z'
labels:
  - performance
milestone: m-2
dependencies:
  - TASK-071
documentation:
  - errorset-audit.md
priority: low
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Set guards use `Array.includes`: 42 ns at 40 kinds vs 6 ns at 2. agentx has sets with 21 and 34 kinds. Audit ref: P2.

## Implementation
Use a `Set<string>` for membership. Use it always, or above a measured threshold (record the crossover). Benchmark: a 40-kind guard on the last kind **≤ 10 ns/op**, and no regression for 2-kind sets.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 40-kind last-kind guard ≤ 10 ns/op; 2-kind guard not slower than baseline (numbers in notes)
- [ ] #2 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->
