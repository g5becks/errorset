---
id: TASK-045
title: 'Dependencies: pin @types/bun 1.4.4 and upgrade Biome, ultracite 8 and lefthook'
status: To Do
assignee: []
created_date: '2026-11-10T17:35:00Z'
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
- [ ] #1 @types/bun is pinned to 1.4.4; ultracite 8.x, matching Biome and lefthook 2.2.x are installed; bun.lock committed
- [ ] #2 bun run lint is clean; any rule changes or disabled rules are recorded with a reason
- [ ] #3 Test count and coverage are unchanged from before the upgrade (numbers in notes)
- [ ] #4 bash scripts/ci-local.sh HEAD prints RESULT: PASS
<!-- AC:END -->
