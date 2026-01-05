---
id: task-037
title: Setup package.json for npm publishing
status: Done
assignee:
  - '@agent'
created_date: '2026-01-05 15:42'
updated_date: '2026-01-05 17:06'
labels:
  - publishing
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Configure package.json with proper metadata, exports, and build configuration for npm publishing.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 package.json has correct name, version, and description
- [x] #2 package.json has proper exports field for ESM/CJS
- [x] #3 package.json has correct main, module, and types fields
- [x] #4 package.json has keywords for discoverability
- [x] #5 package.json has repository, bugs, and homepage URLs
- [x] #6 package.json has correct license
- [x] #7 Files field excludes unnecessary files from package
- [x] #8 bun run typecheck passes with no errors
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Update package.json with proper metadata (name, version, description, author, license)
2. Add proper exports field for ESM with types
3. Add main, module, types fields for compatibility
4. Add keywords for npm discoverability
5. Add repository, bugs, homepage URLs
6. Add files field to include only necessary files
7. Update build script for proper output
8. Run typecheck to verify
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Package.json configured for npm publishing:

- Name: errorset v0.1.0
- ESM-only with proper exports field
- TypeScript declarations generated via tsconfig.build.json
- Keywords: error, error-handling, errorset, typescript, type-safe, zig, result, either, domain-driven
- Repository: github.com/g5becks/errorset
- MIT License added
- Files field includes only dist/, README.md, LICENSE
- Build produces 6.39KB bundle + type declarations
- All checks passing (typecheck, test, lint)
<!-- SECTION:NOTES:END -->
