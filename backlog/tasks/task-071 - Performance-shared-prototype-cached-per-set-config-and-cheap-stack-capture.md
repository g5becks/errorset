---
id: TASK-071
title: 'Performance: shared prototype, cached per-set config and cheap stack capture'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-11T03:46:00Z'
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
- [x] #1 Behavior is unchanged: serialization, inspect, toString and equality tests pass
- [x] #2 Template creation ≤ 60 ns/op (or ≥ 1.9× faster than baseline with profile notes); numbers recorded
- [x] #3 configure() invalidates cached config (test)
- [x] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS
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

- Outcome: shared ERR_PROTO with non-enumerable toJSON, toString (this.set/kind/message) and an [INSPECT] getter returning a function bound to the error (so the existing detached-call tests keep passing and Node's util.inspect output is unchanged); template errors are built by a TemplateErr constructor whose prototype carries ERR_PROTO's descriptors and whose prototype.constructor is reset to Object; no-context errors use a per-kind prototype adding with(); rehydrated errors use the same prototypes. No object spreads on creation (cause/timestamp assigned). config.ts gained a configVersion counter bumped by configure(), its disposer and resetConfig(); each kind caches its set's effective config until the version changes (cachedConfig). applyCreationConfig runs only when includeTimestamp or includeStack is on. Each kind keeps a single-entry cache of its last template creator (same TemplateStringsArray object + same holes = exact hit); template strings are copied to a plain array once per creator (indexing the frozen TemplateStringsArray cost ~10 ns per error on Bun 1.4.4: 68 -> 58 ns).
- Behavior: errors still frozen, same Object.keys order, JSON, String(), inspect output, deep equality, structuredClone and constructor === Object (checked in tests and on Node 22 with dist). One existing assertion changed by design: tests/serialization.test.ts checked toJSON/toString as OWN non-enumerable descriptors; they are now inherited from the prototype (the task's requirement), so it now asserts they are callable, not enumerable, absent from Object.keys/spread, and that nothing on the prototype chain is enumerable (so for...in is unchanged). Not breaking for consumers.
- Tests: tests/config-cache.test.ts (7: configure/disposer/resetConfig invalidate the cache for template, no-context and with(); per-set options win across changes; creator cache hits and misses with dynamic holes). Mutation check: removing the disposer's version bump fails 'picks up the disposer…' (then restored). 319 tests, 100% coverage.
- Benchmarks (Bun 1.4.4, Apple M5; bun run bench --runs 3 medians, /Users/takinprofit/Dev/errorset-release/bench-071.json): create_template_2keys 56.2 ns (runs 57, 55.9, 56.2). vs 0.3.0 baseline 107.4 ns: 1.91x faster, under the 60 ns target. vs pre-071 (TASK-061 176.8 ns; interleaved A/B on this machine 178.7 ns): 3.2x faster. create_callable_no_context 149.7 -> 33.8 ns (0.3.0: 121.6). create_template_only 10.7 -> 5.8 ns. create_include_stack 595.6 -> 460.3 ns. Guards unchanged (2-kind 6.8, 40-kind 43.0, non-error 5.9). Profile path: standalone variant benches (min of 7) showed defineProperties + per-error closures + config spread at ~120 ns of the 178; then freezes ~11-17 ns, creator closure ~9 ns, frozen template-strings indexing ~10 ns.
- Host note: an unrelated golang container intermittently loaded the Colima VM during this work; A/B runs were interleaved and the recorded medians were taken when load was low.
- Verified with scripts/ci-local.sh (cf77684, PASS); GitHub Actions unavailable (billing lock).
<!-- SECTION:NOTES:END -->
