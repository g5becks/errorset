---
id: TASK-040
title: 'Toolchain: TypeScript 7 dev compiler, pinned tsc, types:[bun] and rootDir'
status: To Do
assignee: []
created_date: '2026-11-10T17:35:00Z'
labels:
  - toolchain
milestone: m-0
dependencies: []
documentation:
  - errorset-audit.md
priority: high
type: chore
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Why
The declaration build uses an unpinned `bunx tsc` (TypeScript isn't a devDependency). On TS 7.0.2 it fails with TS5011 and emits declarations to `dist/src/*.d.ts`, which breaks `types`. `typecheck` runs `bunx tsgo` from a January `@typescript/native-preview` dev build. TS 6/7 report 12 errors because `types` now defaults to `[]`. Audit refs: D2, D3, D5 (native-preview), D6/C6 (stale tsconfig options).

## Implementation
1. Add `typescript@~7.0.2` as a devDependency and remove `@typescript/native-preview`.
2. Scripts call `tsc` directly: `typecheck` = `tsc --noEmit`, `build:types` = `tsc -p tsconfig.build.json`. No `bunx tsc` or `bunx tsgo` anywhere.
3. `tsconfig.json`: add `"types": ["bun"]`; remove `"jsx": "react-jsx"` and `"allowJs": true`.
4. `tsconfig.build.json`: add `"rootDir": "./src"` (and `"types": []` if `bun` types aren't needed for emit).
5. Verify the emitted layout is exactly `dist/index.d.ts`, `dist/types.d.ts` and `dist/config.d.ts` (no `dist/src/`). Diff the declarations against a TS 5.9.3 build (`bunx -p typescript@5.9.3 tsc -p tsconfig.build.json --outDir <tmp>`); they should be identical apart from formatting.
6. Known gap: typecheck still depends on `dist/` because `test-d` imports `../dist`. The next task fixes that, so run `bun run build` before `typecheck` here and say so in the notes.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 typescript ~7.0.2 is a devDependency; @typescript/native-preview is removed; no script uses bunx tsc or bunx tsgo
- [ ] #2 tsconfig.json sets types:["bun"] and no longer has jsx or allowJs; tsconfig.build.json sets rootDir ./src
- [ ] #3 bun run build emits dist/index.d.ts, dist/types.d.ts and dist/config.d.ts (no dist/src/); declarations match a TS 5.9.3 build
- [ ] #4 After a build, tsc --noEmit reports 0 errors on TS 7.0.2, and bunx -p typescript@6.0.3 and @5.9.3 tsc --noEmit also report 0
- [ ] #5 CHANGELOG.md has an entry under ## [Unreleased] describing the change
<!-- AC:END -->
