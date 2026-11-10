---
id: TASK-045
title: 'Dependencies: pin @types/bun 1.4.4 and upgrade Biome, ultracite 8 and lefthook'
status: Done
assignee:
  - '@claude'
created_date: '2026-11-10T17:35:00Z'
updated_date: '2026-11-10T18:46:00Z'
labels:
  - dependencies
milestone: m-0
dependencies:
  - TASK-042
documentation:
  - errorset-audit.md
priority: medium
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
`@types/bun` is `latest` (locked at 1.3.5, which isn't reproducible). Biome 2.3.11 → 2.6.x, ultracite 7.0.8 → 8.x (major), and lefthook 2.0.13 → 2.2.x are behind. Audit ref: D5.

## Implementation
1. Pin `@types/bun` to `1.4.4` exactly.
2. Upgrade ultracite to 8.x and Biome to the version it expects; migrate `biome.jsonc` (`bunx @biomejs/biome migrate --write` if needed); run `bun run lint:fix`; review the rule changes and record any rules disabled, with the reason. Keep the existing intentional overrides (`useConsistentTypeDefinitions`, `noBarrelFile`) unless the upgrade makes them obsolete.
3. Upgrade lefthook to 2.2.x and confirm `bunx lefthook install` still installs the hooks.
4. No source behavior changes: the test count and coverage are unchanged.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 @types/bun is pinned to 1.4.4; ultracite 8.x, matching Biome and lefthook 2.2.x are installed; bun.lock committed
- [x] #2 bun run lint is clean; any rule changes or disabled rules are recorded with a reason
- [x] #3 Test count and coverage are unchanged from before the upgrade (numbers in notes)
- [x] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Record baseline test count and coverage.
2. Pin @types/bun 1.4.4; upgrade ultracite to 8.x, Biome to the version ultracite 8 expects, lefthook to 2.2.x.
3. Migrate biome config if needed; lint:fix; review and record rule changes and disabled rules.
4. Confirm lefthook install; strict gate; compare test count and coverage; ci-local HEAD.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
- Outcome: devDependencies pinned exactly: @types/bun 1.4.4 (was latest), ultracite 8.1.1, @biomejs/biome 2.6.6 (ultracite 8 peer ^2.6.2; ultracite doctor: 5 passed), lefthook 2.2.2 (bunx lefthook install syncs pre-commit and pre-push). bun.lock committed.
- Script change: lint/lint:fix drop --type-aware. Ultracite 8 forwards unknown flags to Biome, which rejects it; it is an oxlint-only option and never had an effect with the Biome provider.
- biome.jsonc decisions: (1) files.includes ["!backlog"]: Biome 2.6 now formats YAML/Markdown and backlog/ must only be written by the Backlog CLI. (2) assist useSortedKeys off: key order is observable (enumeration/JSON/inspect order of errors and config), and this task forbids behavior changes. (3) style/useConsistentMethodSignatures off: property-style signatures would change method bivariance in the published .d.ts. (4) performance/noAwaitInLoops off for scripts/** only: subprocesses run sequentially on purpose. Kept useConsistentTypeDefinitions and noBarrelFile overrides (still needed).
- Code fixes for new rules (no behavior change): destructuring of kind (3 sites) and i += 1 in src/types.ts; u flag on a test regex; noShadow rename in smoke-consumer; Biome formatting of ci.yml, lefthook.yml and package.json key order. The bad-template-key type test now reads expectTypeOf(...).toBeFunction() (noVoid/noUnusedExpressions); mutation re-check: changing "nope" to "id" makes test:types fail.
- Numbers: before 129 pass / 226 expect() / 100% funcs / 99.89% lines; after identical.
- Verification: strict gate passes. Verified with scripts/ci-local.sh (2322c5c, PASS); GitHub Actions unavailable (billing lock). The first ci-local run on 2322c5c failed only at typescript (setup): apt could not reach deb.debian.org (transient network); the rerun passed with no changes.
- Breaking change: none.
<!-- SECTION:NOTES:END -->
