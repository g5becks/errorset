/**
 * errorset micro-benchmarks (not part of CI; timings are noisy).
 *
 *   bun run bench                          one run, prints ns/op per case
 *   bun run bench --json out.json          also write the result as JSON
 *   bun run bench --runs 3 --json out.json 3 separate processes; records the per-case median
 *
 * The harness reproduces the audit's (errorset-audit.md §4.1, P1/P2): 10k warmup
 * calls, then 1M timed calls through one shared `bench` call site, with fresh
 * per-iteration context, run at module top level. Stack depth matters: the
 * `new Error` and `includeStack` cases capture stack traces, and calling them from
 * nested or async frames made them up to 2.6x slower. Later tasks state their
 * performance budgets against these numbers, so keep the harness and the case
 * bodies stable, and compare new runs with bench/baseline-0.3.0.json.
 */

import { arch, cpus, platform, release, totalmem } from "node:os"
import { version as bunVersion, nanoseconds, spawnSync, write } from "bun"
import { configure, errorSet, resetConfig } from "../src/index.ts"

type Ctx = { id: string; symbol: string }

const ITERATIONS = 1_000_000
const WARMUP = 10_000
const LARGE_SET_SIZE = 40
const MEBI = 1024 ** 3
const HARNESS = `module top level; warmup ${WARMUP}, then ${ITERATIONS} timed calls per case through one shared call site`

const argValue = (flag: string): string | undefined => {
  const index = process.argv.indexOf(flag)
  return index === -1 ? undefined : process.argv[index + 1]
}

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  const upper = sorted[middle] ?? Number.NaN
  if (sorted.length % 2 === 1) {
    return upper
  }
  return (
    Math.round((((sorted[middle - 1] ?? Number.NaN) + upper) / 2) * 10) / 10
  )
}

if (process.argv.includes("--child")) {
  // Child mode: run every case at module top level and print the JSON result.
  const cases: Record<string, number> = {}
  let sink: unknown
  const bench = (name: string, f: (i: number) => unknown): void => {
    for (let i = 0; i < WARMUP; i += 1) {
      sink = f(i)
    }
    const start = nanoseconds()
    for (let i = 0; i < ITERATIONS; i += 1) {
      sink = f(i)
    }
    cases[name] = Math.round(((nanoseconds() - start) / ITERATIONS) * 10) / 10
  }

  const kinds = Array.from({ length: LARGE_SET_SIZE }, (_, i) => `kind_${i}`)
  const Big = errorSet("Big", kinds as ["kind_0"]).init<Ctx>()
  const Small = errorSet("Small", ["a", "b"]).init<Ctx>()
  const lastKind = kinds.at(-1) as "kind_0"
  const smallError = Small.b`x ${"id"}`({ id: "1" })
  const lastKindError = Big[lastKind]`x ${"id"}`({ id: "1" })
  const nonError = { ok: 1 }

  bench("create_template_2keys", i =>
    Small.a`order ${"id"} for ${"symbol"} failed`({
      id: String(i),
      symbol: "X",
    })
  )
  bench("create_template_only", () => Small.a`order ${"id"} failed`)
  bench("create_callable_no_context", () => Small.a`static message`)
  bench("baseline_plain_object", i => ({
    kind: "a",
    message: `order ${i}`,
    data: { id: String(i) },
  }))
  bench("baseline_new_error", i => new Error(`order ${i}`))
  bench("guard_set_2kind", () => Small(smallError))
  bench("guard_set_40kind_last", () => Big(lastKindError))
  bench("guard_non_error", () => Small(nonError))
  configure({ includeStack: true })
  bench("create_include_stack", i => Small.a`order ${"id"}`({ id: String(i) }))
  resetConfig()

  // Keep the last result observable so no case body can be eliminated as dead code.
  if (sink === Symbol.for("never")) {
    process.stderr.write("unreachable\n")
  }
  process.stdout.write(JSON.stringify(cases))
} else {
  const runs = Math.max(1, Number(argValue("--runs") ?? "1"))
  const perRun: Record<string, number>[] = []
  for (let index = 0; index < runs; index += 1) {
    const child = spawnSync([process.execPath, import.meta.path, "--child"], {
      stdout: "pipe",
      stderr: "inherit",
    })
    if (child.exitCode !== 0) {
      throw new Error(`benchmark process exited ${child.exitCode}`)
    }
    perRun.push(JSON.parse(child.stdout.toString()))
  }

  const cases: Record<string, number> = {}
  const samples: Record<string, number[]> = {}
  for (const name of Object.keys(perRun[0] ?? {})) {
    samples[name] = perRun.map(result => result[name] ?? Number.NaN)
    cases[name] = median(samples[name])
  }

  const header = runs > 1 ? "ns/op (median)   per run" : "ns/op"
  process.stdout.write(`${"case".padEnd(30)}${header}\n`)
  for (const [name, value] of Object.entries(cases)) {
    const perRunText = runs > 1 ? `   ${samples[name]?.join(", ")}` : ""
    process.stdout.write(
      `${name.padEnd(30)}${String(value).padStart(6)}${perRunText}\n`
    )
  }

  const jsonPath = argValue("--json")
  if (jsonPath) {
    const report = {
      bun: bunVersion,
      date: new Date().toISOString(),
      harness: HARNESS,
      machine: {
        arch: arch(),
        cpu: cpus()[0]?.model ?? "unknown",
        os: `${platform()} ${release()}`,
        memoryGiB: Math.round(totalmem() / MEBI),
      },
      runs,
      unit: "ns/op",
      cases,
      ...(runs > 1 ? { samples } : {}),
    }
    await write(jsonPath, `${JSON.stringify(report, null, 2)}\n`)
    process.stdout.write(`wrote ${jsonPath}\n`)
  }
}
