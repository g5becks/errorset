---
id: TASK-046
title: 'Performance: benchmark suite and recorded 0.3.0 baseline'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-10T18:57:00Z'
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
- [x] #1 bun run bench covers creation (template, callable, includeStack), set guards (2-kind, 40-kind last kind, non-error), plain object and new Error baselines
- [x] #2 bench/baseline-0.3.0.json is committed, with medians of 3 runs and machine info; numbers are within ±30% of the audit table or the difference is explained
- [x] #3 Quality gate passes: bun run typecheck, bun run lint, bun test (bunfig.toml coverage thresholds), bun run build, and every other check script that exists at the time (test:types, test:consumer)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. bench/errorset.bench.ts reproducing the audit harness (Bun.nanoseconds; 10k warmup + 1M timed calls through one shared call site; fresh per-iteration context; module top level) for every audit case plus template-only.
2. bench script; --runs N spawns N child processes and records per-case medians; --json writes machine info, harness, cases and per-run samples.
3. Record bench/baseline-0.3.0.json (3 runs, Bun 1.4.4) and compare with the audit table.
4. Quality gate and ci-local.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Outcome: bench/errorset.bench.ts + `bun run bench` (`--runs N`, `--json <file>`); bench/baseline-0.3.0.json committed. Not part of CI or bun test (coverage unchanged: 129 pass, 100% funcs / 99.89% lines).
- Decision: no mitata. A first mitata version reported sub-ns guards and flagged guard_non_error as dead-code eliminated (constant inputs hoisted). The audit numbers and later budgets (ES-16 <10% freeze, ES-30 <=60 ns create, ES-31 large-set guard) come from the audit harness, so the suite reproduces it exactly; no new dependency.
- Harness detail: calling the cases from nested/async frames made the stack-capturing cases much slower (new Error 124.6 vs 90.0 ns; includeStack 1363.6 vs 520 ns). Re-running the audit's original bench.ts today gave 87.4/517 ns, so the difference was the harness, not the code. Cases now run at module top level in a child process, matching the audit stack shape.
- Baseline (Bun 1.4.4, Apple M5, darwin 27.2.0, 24 GiB; median of 3 processes, ns/op): create_template_2keys 107.4 (audit 116.7, -8%); create_template_only 10.1 (10.4); create_callable_no_context 121.6 (120.8); baseline_plain_object 21.7 (19.2, +13%); baseline_new_error 90.5 (90.0); guard_set_2kind 5.6 (5.9); guard_set_40kind_last 42.0 (42.1); guard_non_error 5.5 (5.0, +10%); create_include_stack 484.2 (520.0, -7%). All within +/-30%.
- Case bodies match the audit except that contexts carry only the keys each template uses (typecheck rejects excess keys), which affects only the 1-key cases.
- Verification: strict gate passes. Verified with scripts/ci-local.sh (eadfb2b, PASS); GitHub Actions unavailable (billing lock).
- Breaking change: none.
<!-- SECTION:NOTES:END -->
