---
id: TASK-072
title: 'Performance: Set-based kind membership for large sets'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-11T03:50:00Z'
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
- [x] #1 40-kind last-kind guard ≤ 10 ns/op; 2-kind guard not slower than baseline (numbers in notes)
- [x] #2 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Micro-benchmark includes vs Set.has at 2/8/16/40 kinds (done: Set.has flat ~6 ns, includes linear to ~38-45 ns at 40).
2. Single-named-set fast path uses a Set always if the real harness shows no 2-kind regression; otherwise a threshold at the measured crossover.
3. Tests: guards unchanged (existing suites) plus a 40-kind set accepting each kind and rejecting others.
4. bun run bench --runs 3; ci-local.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Outcome: a single named set's guard (every errorSet guard) is now singleSetGuard: brand, set and kind checks inlined, kinds in a Set (constant-time). Multi-set membership (merged guards, legacy any-set members) keeps the per-set Map<string, Set> path (multiSetGuard). Decision: Set always, no threshold: the micro-benchmark (min of 7, 1M calls) showed Set#has flat at ~6 ns from 8 to 40 kinds while Array#includes grew linearly (10.9 ns at 8, 16.1 at 16, 37.7 at 40); at 2 kinds both were dominated by the surrounding checks, and the inlined Set guard measured equal to the 0.3.0 baseline in the real harness, so a threshold would only add a branch.
- Benchmarks (Bun 1.4.4, bun run bench --runs 5 medians, /Users/takinprofit/Dev/errorset-release/bench-072.json for the intermediate step): guard_set_40kind_last 43.0 -> 5.1 ns (target <= 10; 0.3.0: 42.0); guard_set_2kind 6.8 -> 5.6 ns (runs 6.7, 5.6, 5.6, 5.6, 5.4; 0.3.0 baseline 5.6, so not slower); guard_non_error 5.7 ns. An intermediate step (Set membership without inlining) measured 2-kind 5.8 ns, so the guard was inlined to remove the remaining 0.2 ns.
- Tests: large-set cases in tests/set-identity.test.ts (40 kinds accepted, the same 40 kinds of a twin set rejected, non-member and inherited names rejected). 321 tests, 100% coverage. Not breaking.
- Verified with scripts/ci-local.sh (801a63f, PASS); GitHub Actions unavailable (billing lock).
<!-- SECTION:NOTES:END -->
