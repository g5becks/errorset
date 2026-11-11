# Contributing to errorset

Agent and contributor workflow (toolchain, quality gate, Backlog.md tasks) is in
[AGENTS.md](AGENTS.md). This file covers the parts a maintainer needs for releases.

## Quality gate

```bash
bun install --frozen-lockfile
bun run typecheck && bun run lint && bun test && bun run build && bun run test:types && bun run test:consumer
```

`bash scripts/ci-local.sh [ref]` runs the full CI matrix from `.github/workflows/ci.yml`
locally (macOS on the host, Linux in Docker via Colima) and must print `RESULT: PASS`. Use it
whenever GitHub Actions is unavailable; never record a GitHub run that did not happen.

`LLMS.txt` is generated from `README.md` by `bun run docs:llms`; after editing the README,
regenerate it and commit both (CI fails when it is stale).

## Benchmarks

`bun run bench` prints ns/op per case (`--runs 3` records per-case medians over separate
processes, `--json out.json` writes the result). `bench/baseline-0.3.0.json` is the reference
for performance budgets. `.github/workflows/benchmarks.yml` runs the same command on demand
(`workflow_dispatch`, with a `runs` input) and weekly, and uploads the JSON as an artifact; it
is not a CI gate, so it has no `scripts/ci-local.sh` mirror. Shared runners are noisy: compare
artifacts with each other, not against fixed thresholds.

## Release procedure

Releases are prepared by a script and published by the maintainer.

1. Make sure every change is listed under `## [Unreleased]` in `CHANGELOG.md`.
2. Create the release branch from `main` and prepare:

   ```bash
   git switch -c release/vX.Y.Z main
   bun run release:prepare X.Y.Z --dry-run   # runs every check, writes nothing
   bun run release:prepare X.Y.Z
   ```

   The script requires a clean tree on `release/vX.Y.Z` and a version newer than
   `package.json`. It rolls `[Unreleased]` into `## [X.Y.Z] - <date>`, bumps the version,
   commits `chore(release): prepare vX.Y.Z`, creates the annotated tag `vX.Y.Z`, runs
   `scripts/ci-local.sh` on the tag, and then, in a worktree at
   `../errorset-release/vX.Y.Z`, builds and packs the tarball, checks its file list
   (`dist/*.js`, `dist/*.d.ts`, `README.md`, `LICENSE`, `package.json` only), writes
   `SHA512SUMS`, `RELEASE_NOTES.md` and `CI_LOCAL.log`, and runs ESM and CJS consumer smoke
   tests on Bun and Node. It never pushes or publishes; it prints the commands below.
3. Push the branch, open a PR to `main`, and merge it with a merge commit (no squash or
   rebase) so the tag stays on `main`'s history. Then push the tag: `git push origin vX.Y.Z`.

### Publishing (maintainer)

Local publishes need npm's interactive 2FA, so only the maintainer runs them:

```bash
cd ../errorset-release/vX.Y.Z && npm publish ./takinprofit-errorset-X.Y.Z.tgz --access public
npm view @takinprofit/errorset@X.Y.Z version
gh release create vX.Y.Z --verify-tag --title vX.Y.Z --notes-file ../errorset-release/vX.Y.Z/RELEASE_NOTES.md
```

Check the tarball against `SHA512SUMS` before publishing if it has left the release worktree.

### Trusted publishing (GitHub Actions)

`.github/workflows/release.yml` publishes on every pushed `v*` tag without a token:

- it runs the full gate, fails if the tag doesn't match `package.json`'s version, and skips
  publication when that version already exists on npm (so pushing the tag after a manual
  publish is safe);
- it publishes with `npm publish --provenance --access public` using GitHub's OIDC token
  (`id-token: write`).

One-time setup on npmjs.com: package settings → Trusted publisher → GitHub Actions, with
repository `g5becks/errorset` and workflow `release.yml`. Until that is configured and
Actions is available, publish manually as above.

### Retroactive tags

`v0.1.0`, `v0.2.1` and `v0.3.0` were tagged after the fact on the commits whose builds are
byte-identical to the published tarballs (README, LICENSE, `package.json`, `dist/*.d.ts` with
TypeScript 5.9.3, `dist/index.js` with Bun 1.3.5). 0.2.0 was never published.
