---
id: TASK-071
title: 'Performance: shared prototype, cached per-set config and cheap stack capture'
status: To Do
assignee: []
created_date: '2026-11-10T17:35:00Z'
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
