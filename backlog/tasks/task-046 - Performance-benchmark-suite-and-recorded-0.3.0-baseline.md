---
id: TASK-046
title: 'Performance: benchmark suite and recorded 0.3.0 baseline'
status: In Progress
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-10T18:46:00Z'
labels:
  - performance
  - testing
milestone: m-0
dependencies:
  - TASK-040
documentation:
  - errorset-audit.md
priority: medium
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Later tasks have performance budgets (freezing errors must cost < 10%; prototype and config caching target ≤ 60 ns/op; large-set guards ≤ 10 ns/op), so a reproducible baseline is needed before any behavior changes. Audit refs: P1, P2 (and ES-33, moved earlier).

Audit baseline (Bun 1.4.4, this machine, 1M iterations):
- create with 2 template keys: 116.7 ns
- callable no-context create: 120.8 ns
- plain object: 19.2 ns
- `new Error`: 90.0 ns
- 2-kind set guard: 5.9 ns
- 40-kind guard (last kind): 42.1 ns
- non-error guard: 5.0 ns
- create with `includeStack: true`: 520 ns

## Implementation
1. Add `bench/errorset.bench.ts`, using `mitata` (pinned devDependency, as in StrataDB) or `Bun.nanoseconds` loops, covering every case above.
2. Add a `bench` script that prints a table and can write JSON (`--json <file>`).
3. Record a baseline in the notes: three runs on Bun 1.4.4, with the median per case and the machine/OS. Commit `bench/baseline-0.3.0.json`.
4. Not part of CI (timing is noisy); a manual workflow comes later.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 bun run bench covers creation (template, callable, includeStack), set guards (2-kind, 40-kind last kind, non-error), plain object and new Error baselines
- [ ] #2 bench/baseline-0.3.0.json is committed, with medians of 3 runs and machine info; numbers are within ±30% of the audit table or the difference is explained
- [ ] #3 Quality gate passes: bun run typecheck, bun run lint, bun test (bunfig.toml coverage thresholds), bun run build, and every other check script that exists at the time (test:types, test:consumer)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Add mitata (pinned) and bench/errorset.bench.ts importing src: template create (2 keys), callable no-context create, includeStack create, 2-kind set guard, 40-kind guard (last kind), non-error guard, plain object, new Error.
2. bench script prints a table; --json <file> writes per-case ns/op (avg, p50) plus machine info.
3. Run 3 times on Bun 1.4.4; write bench/baseline-0.3.0.json with medians, machine and OS; compare with the audit table (±30%).
4. Exclude bench from coverage/tests; quality gate.
<!-- SECTION:PLAN:END -->
