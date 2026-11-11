#!/usr/bin/env bash
# Local stand-in for .github/workflows/ci.yml while GitHub Actions is unavailable.
# Any change to ci.yml must be mirrored here in the same commit.
#
# Runs the same jobs against a clean clone of a git ref (default: HEAD):
#   check:      {linux (Docker oven/bun), macOS (host)} x {Bun 1.3.14, 1.4.4, latest}
#               frozen install, lint, LLMS.txt freshness (docs:llms + git diff),
#               typecheck, test --coverage, build, test:types,
#               test:consumer (SMOKE_NODE=skip)
#   typescript: linux, Bun 1.4.4, tsc on source + type tests for TS 5.9.3, 6.0.3, 7.0.2
#               (7.1.0-beta is advisory and never fails the run)
#   node:       linux, build + packed consumer with Bun 1.4.4, then on Node 22 and LTS:
#               import dist/index.js and run the packed consumer (ESM import + CJS require).
#               ci.yml runs the same consumer files via SMOKE_NODE=require.
#
# Usage:   bash scripts/ci-local.sh [git-ref]
# Env:     CI_LOCAL_DIR  work dir; must be inside $HOME so Colima can mount it
#                        (default: ../errorset-release/ci-local next to the repo)
#          DOCKER_HOST   auto-detected for Colima when unset or unreachable
# Exit:    0 if every required job passed, 1 otherwise. Logs: $CI_LOCAL_DIR/<sha>/logs/
set -euo pipefail

REPO="$(git rev-parse --show-toplevel)"
REF="${1:-HEAD}"
SHA="$(git -C "$REPO" rev-parse --verify "$REF^{commit}")"
SHORT="${SHA:0:7}"
BASE="${CI_LOCAL_DIR:-$(cd "$REPO/.." && pwd)/errorset-release/ci-local}"
WORK="$BASE/$SHORT"
LOGS="$WORK/logs"
BUN_PINNED="1.4.4"
BUN_FIXED=("1.3.14" "1.4.4")
TS_REQUIRED=("5.9.3" "6.0.3" "7.0.2")
TS_ADVISORY=("7.1.0-beta")
NODE_IMAGES=("22" "lts")

rm -rf "$WORK"
mkdir -p "$LOGS"

# Docker (Colima) for the Linux jobs
if ! docker info >/dev/null 2>&1; then
  for sock in "$HOME/.config/colima/default/docker.sock" "$HOME/.colima/default/docker.sock"; do
    if [[ -S "$sock" ]]; then export DOCKER_HOST="unix://$sock"; break; fi
  done
fi
docker info >/dev/null 2>&1 || { echo "Docker is not reachable (start it with: colima start)"; exit 1; }

BUN_LATEST="$(npm view bun dist-tags.latest 2>/dev/null || true)"
[[ -n "$BUN_LATEST" ]] || { echo "Could not resolve the latest Bun version from npm"; exit 1; }
# Matrix entries, as in ci.yml; "latest" may resolve to a fixed version and is still run.
BUN_LEGS=("${BUN_FIXED[@]}" "latest")

RESULTS=()
FAILED=0

clone() { # fresh checkout of $SHA, like actions/checkout
  local dir="$1"
  git clone --quiet --no-hardlinks "$REPO" "$dir"
  git -C "$dir" checkout --quiet --detach "$SHA"
}

record() { # name status required
  RESULTS+=("$(printf '%-34s %s' "$1" "${2:-FAIL}")")
  if [[ "${2:-FAIL}" != "pass" && "$3" == "required" ]]; then FAILED=1; fi
}

resolve_bun() { # matrix entry -> concrete version
  if [[ "$1" == "latest" ]]; then echo "$BUN_LATEST"; else echo "$1"; fi
}

# GitHub ubuntu runners ship Node/npx; oven/bun images do not, and ultracite shells out to npx.
LINUX_PREP='apt-get update -qq >/dev/null && apt-get install -y -qq git >/dev/null
git config --global --add safe.directory /w
printf "#!/bin/sh\nexec bunx \"\$@\"\n" > /usr/local/bin/npx && chmod +x /usr/local/bin/npx'

CHECK_STEPS='set -e
bun install --frozen-lockfile
bun run lint
bun run docs:llms && git diff --exit-code LLMS.txt
bun run typecheck
bun test --coverage
bun run build
bun run test:types
SMOKE_NODE=skip bun run test:consumer'

mac_bun_dir() { # echo a directory containing a darwin bun binary of the given version
  local v="$1"
  if [[ "$(bun --version)" == "$v" ]]; then dirname "$(command -v bun)"; return; fi
  local d="$BASE/bun-darwin-$v"
  if [[ ! -x "$d/package/bin/bun" ]]; then
    mkdir -p "$d"
    (cd "$d" && npm pack --silent "@oven/bun-darwin-$(uname -m | sed 's/arm64/aarch64/')@$v" >/dev/null && tar -xzf ./*.tgz)
  fi
  echo "$d/package/bin"
}

# check
for leg in "${BUN_LEGS[@]}"; do
  v="$(resolve_bun "$leg")"
  label="$leg"; [[ "$leg" == "latest" ]] && label="latest=$v"

  name="check (macos, bun $label)"
  dir="$WORK/macos-$leg"; clone "$dir"
  echo "▶ $name"
  if bindir="$(mac_bun_dir "$v")" \
     && (cd "$dir" && PATH="$bindir:$PATH" CI=true bash -c "set -e; test \"\$(bun --version)\" = $v; $CHECK_STEPS") \
       >"$LOGS/macos-$leg.log" 2>&1; then
    record "$name" pass required
  else
    record "$name" FAIL required
  fi

  name="check (linux, bun $label)"
  dir="$WORK/linux-$leg"; clone "$dir"
  echo "▶ $name"
  if docker run --rm -e CI=true -v "$dir:/w" -w /w "oven/bun:$v" bash -c "set -e; $LINUX_PREP; $CHECK_STEPS" \
       >"$LOGS/linux-$leg.log" 2>&1; then
    record "$name" pass required
  else
    record "$name" FAIL required
  fi
done

# typescript (Linux, pinned Bun)
dir="$WORK/linux-typescript"; clone "$dir"
echo "▶ typescript matrix"
TS_SCRIPT="set -e
$LINUX_PREP
bun install --frozen-lockfile >/dev/null"'
for ts in "$@"; do
  if bunx -p "typescript@$ts" tsc --noEmit > "/logs/ts-$ts.log" 2>&1 \
     && bunx -p "typescript@$ts" tsc --noEmit -p tests/types/tsconfig.json >> "/logs/ts-$ts.log" 2>&1; then
    echo "$ts pass"; else echo "$ts FAIL"; fi
done'
if ts_out="$(docker run --rm -e CI=true -v "$dir:/w" -v "$LOGS:/logs" -w /w "oven/bun:$BUN_PINNED" \
      bash -c "$TS_SCRIPT" _ "${TS_REQUIRED[@]}" "${TS_ADVISORY[@]}" 2>"$LOGS/typescript-setup.log")"; then
  for ts in "${TS_REQUIRED[@]}"; do
    record "typescript ($ts)" "$(awk -v t="$ts" '$1==t{print $2}' <<<"$ts_out")" required
  done
  for ts in "${TS_ADVISORY[@]}"; do
    record "typescript ($ts, advisory)" "$(awk -v t="$ts" '$1==t{print $2}' <<<"$ts_out")" advisory
  done
else
  record "typescript (setup)" FAIL required
fi

# node (Linux): build with the pinned Bun, then import the bundle on each Node image
dir="$WORK/linux-node"; clone "$dir"
echo "▶ node import"
if docker run --rm -e CI=true -v "$dir:/w" -w /w "oven/bun:$BUN_PINNED" \
     bash -c "set -e; $LINUX_PREP; bun install --frozen-lockfile; SMOKE_NODE=skip SMOKE_KEEP=/w/.consumer bun run test:consumer" \
     >"$LOGS/node-build.log" 2>&1; then
  for n in "${NODE_IMAGES[@]}"; do
    label="$n"; [[ "$n" == "lts" ]] && label="lts/*"
    if docker run --rm -v "$dir:/w" -w /w "node:$n-slim" \
         sh -c "node scripts/node-import-check.mjs && cd .consumer && node consumer.mjs && node consumer.cjs" \
         >"$LOGS/node-$n.log" 2>&1; then
      record "node ($label, $(head -1 "$LOGS/node-$n.log" | cut -d: -f1 | cut -d' ' -f2))" pass required
    else
      record "node ($label)" FAIL required
    fi
  done
else
  record "node (build)" FAIL required
fi

echo
echo "ci-local results for $SHORT ($(git -C "$REPO" log -1 --format=%s "$SHA"))"
echo "bun pinned=$BUN_PINNED latest=$BUN_LATEST; logs: $LOGS"
printf '  %s\n' "${RESULTS[@]}"
if [[ "$FAILED" -eq 0 ]]; then
  echo "RESULT: PASS"
  rm -rf "$WORK"/macos-* "$WORK"/linux-*   # keep logs, drop clones
else
  echo "RESULT: FAIL"
fi
exit "$FAILED"
