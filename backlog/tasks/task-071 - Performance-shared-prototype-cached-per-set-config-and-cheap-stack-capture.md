---
id: TASK-071
title: 'Performance: shared prototype, cached per-set config and cheap stack capture'
status: In Progress
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-11T03:37:00Z'
labels:
  - performance
milestone: m-2
dependencies:
  - TASK-064
documentation:
  - errorset-audit.md
priority: medium
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
Each error allocates a fresh `[INSPECT]` closure, and `captureStack` spreads `{...globalConfig, ...instanceConfig}` on every creation, even with stacks off. Audit ref: P1.

## Implementation
1. Move `[INSPECT]`, `toJSON` and `toString` onto a shared prototype (`Object.create(errProto)`). Errors must still deep-equal and serialize exactly as before (tests).
2. Cache the effective config per set at `init()`, invalidated by a version counter that `configure()` and its disposer bump.
3. Short-circuit `captureStack` before any object spread when stacks are off.
4. Benchmark against `bench/baseline-0.3.0.json` on the same machine: template creation (now frozen and with `set`) **≤ 60 ns/op** (audit target, from 116.7). If 60 ns isn't reachable, record the best result and the profile, and get at least a 1.9× improvement over the baseline.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Behavior is unchanged: serialization, inspect, toString and equality tests pass
- [ ] #2 Template creation ≤ 60 ns/op (or ≥ 1.9× faster than baseline with profile notes); numbers recorded
- [ ] #3 configure() invalidates cached config (test)
- [ ] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Measure first: standalone variant micro-benchmarks (shared prototype vs literal vs class, inspect closure, freezes, cached creator) to find what can reach the budget; min-of-N runs because the host is under external load.
2. Implement: shared prototype for toJSON/toString (per-kind proto for no-context with()), keep the own [INSPECT] closure if detached calls must keep working, no cause/timestamp spreads, per-set effective config cached by a config version counter bumped by configure()/disposer/resetConfig, captureStack short-circuit before any spread, cached creator per template call site if it measures well.
3. Tests: behavior unchanged (serialization, inspect, toString, equality, key order), configure() invalidates the cache (incl. disposer and resetConfig).
4. Benchmark vs bench/baseline-0.3.0.json and the pre-071 number (176.8 ns); if 60 ns / 1.9x is not reachable, record best result and profile and mark blocked per the run rules.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Track overall template-error creation against the 0.3.0 baseline: 107.4 ns → 176.8 ns at TASK-061. Report the after-071 number vs both 0.3.0 and the pre-071 number.
<!-- SECTION:NOTES:END -->
