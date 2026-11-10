// Packed-tarball consumer smoke test (`bun run test:consumer`; build first).
//
// 1. `bun pm pack` the package and install the tarball into isolated fixtures
//    with production dependencies only.
// 2. Type-check a consumer on TypeScript 5.9.3, 6.0.3 and 7.0.2 with
//    moduleResolution bundler and nodenext (ESM .ts and CJS .cts), skipLibCheck false.
// 3. Run ESM import and CJS require consumers on Bun, and on Node when `node` is on PATH.
//
// Env: SMOKE_NODE=require|skip  Node runtime checks: required, skipped, or (unset) run
//                            when `node` is on PATH. CI check legs use skip; the node job
//                            uses require.
//      SMOKE_KEEP=<dir>      copy the installed runtime fixture to <dir> (used by
//                            scripts/ci-local.sh to run it in Node containers)

import { cp, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { file, spawn, which, write } from "bun"

const TS_VERSIONS = ["5.9.3", "6.0.3", "7.0.2"] as const
const PACKAGE = "@takinprofit/errorset"
const root = new URL("../", import.meta.url).pathname
const temporary = await mkdtemp(join(tmpdir(), "errorset-consumer-"))

const run = async (command: string[], cwd: string): Promise<void> => {
  const child = spawn(command, { cwd, stdout: "inherit", stderr: "inherit" })
  const code = await child.exited
  if (code !== 0) {
    throw new Error(`${command.join(" ")} exited ${code} (in ${cwd})`)
  }
}

const TS_CONSUMER = `import { errorSet } from "${PACKAGE}"
import metadata from "${PACKAGE}/package.json" with { type: "json" }

type User = { id: string; name: string }
const UserError = errorSet("UserError", ["not_found", "suspended"]).init<User>()

const err = UserError.not_found\`User \${"id"} not found\`({ id: "1" })
const kind: "not_found" = err.kind
// @ts-expect-error - published types must reject a template key that is not keyof User
UserError.not_found\`User \${"nope"} not found\`

const lookup = (id: string): User | typeof err =>
  id === "1" ? { id, name: "Ada" } : err
const recovered: User = UserError.recover(lookup("2"), {
  not_found: () => ({ id: "guest", name: "Guest" }),
  suspended: () => ({ id: "guest", name: "Guest" }),
})
export const summary: string = \`\${metadata.version} \${kind} \${recovered.name}\`
`

const CTS_CONSUMER = `import errorset = require("${PACKAGE}")

const SetError = errorset.errorSet("SetError", ["a"]).init<{ id: string }>()
const err = SetError.a\`id \${"id"}\`({ id: "1" })
export const isSet: boolean = SetError(err)
// @ts-expect-error - published types must reject a template key that is not keyof the entity
SetError.a\`id \${"nope"}\`
`

const runtimeBody = (load: string): string => `${load}
const UserError = errorSet("UserError", ["not_found", "suspended"]).init()
const err = UserError.not_found\`User \${"id"} not found\`({ id: "1" })
const check = (ok, what) => { if (!ok) throw new Error("consumer check failed: " + what) }
check(UserError(err), "set guard")
check(UserError.not_found(err) && !UserError.suspended(err), "kind guards")
check(err.message === "User 1 not found", "message " + err.message)
const value = UserError.recover(err, { not_found: () => "recovered", suspended: () => "no" })
check(value === "recovered", "recover")
const runtime = typeof Bun === "undefined" ? "node " + process.version : "bun " + Bun.version
console.log(MODE + " consumer OK on " + runtime + " (" + PACKAGE_VERSION + ")")
`

const ESM_CONSUMER = runtimeBody(`import { errorSet } from "${PACKAGE}"
import { createRequire } from "node:module"
const PACKAGE_VERSION = createRequire(import.meta.url)("${PACKAGE}/package.json").version
const MODE = "ESM import"`)

const CJS_CONSUMER = runtimeBody(`const { errorSet } = require("${PACKAGE}")
const PACKAGE_VERSION = require("${PACKAGE}/package.json").version
const MODE = "CJS require"`)

const writeJson = (path: string, value: unknown): Promise<number> =>
  write(path, `${JSON.stringify(value, null, 2)}\n`)

const fixture = async (
  name: string,
  type: "module" | "commonjs",
  tarball: string,
  files: Record<string, string>,
  compilerOptions?: Record<string, unknown>
): Promise<string> => {
  const dir = join(temporary, name)
  await writeJson(join(dir, "package.json"), {
    name: `consumer-${name}`,
    private: true,
    type,
    dependencies: { [PACKAGE]: `file:${tarball}` },
  })
  for (const [file, contents] of Object.entries(files)) {
    await write(join(dir, file), contents)
  }
  if (compilerOptions) {
    await writeJson(join(dir, "tsconfig.json"), {
      compilerOptions: {
        strict: true,
        skipLibCheck: false,
        noEmit: true,
        types: [],
        resolveJsonModule: true,
        ...compilerOptions,
      },
      include: Object.keys(files),
    })
  }
  await run(["bun", "install", "--production", "--no-save"], dir)
  return dir
}

const findNode = (): string | null => which("node")

const exportTargets = (value: unknown): string[] => {
  if (typeof value === "string") {
    return [value]
  }
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(exportTargets)
  }
  return []
}

// TypeScript silently falls back to the .d.ts next to the "import" target, so a
// broken "types" path would still type-check. Check every published path exists.
const assertPublishedPaths = async (dir: string): Promise<void> => {
  const installed = join(dir, "node_modules", PACKAGE)
  const manifest = await file(join(installed, "package.json")).json()
  const paths = [
    manifest.main,
    manifest.module,
    manifest.types,
    ...exportTargets(manifest.exports),
  ].filter((path): path is string => typeof path === "string")
  const missing: string[] = []
  for (const path of new Set(paths)) {
    if (!(await file(join(installed, path)).exists())) {
      missing.push(path)
    }
  }
  if (missing.length > 0) {
    throw new Error(
      `packed package.json references missing files: ${missing.join(", ")}`
    )
  }
  console.log(`published paths OK: ${[...new Set(paths)].join(", ")}`)
}

try {
  const metadata = await file(join(root, "package.json")).json()
  await run(["bun", "pm", "pack", "--destination", temporary, "--quiet"], root)
  const tarball = join(
    temporary,
    `${metadata.name.replace("@", "").replace("/", "-")}-${metadata.version}.tgz`
  )

  const bundler = await fixture(
    "bundler",
    "module",
    tarball,
    { "consumer.ts": TS_CONSUMER },
    { target: "ESNext", module: "Preserve", moduleResolution: "bundler" }
  )
  await assertPublishedPaths(bundler)
  const nodenext = await fixture(
    "nodenext",
    "module",
    tarball,
    { "consumer.ts": TS_CONSUMER, "consumer.cts": CTS_CONSUMER },
    { target: "ESNext", module: "NodeNext", moduleResolution: "NodeNext" }
  )
  for (const version of TS_VERSIONS) {
    for (const dir of [bundler, nodenext]) {
      await run(
        ["bunx", "-p", `typescript@${version}`, "tsc", "-p", "tsconfig.json"],
        dir
      )
    }
    console.log(
      `consumer types OK on TypeScript ${version} (bundler, nodenext ESM+CJS)`
    )
  }

  const runtime = await fixture("runtime", "module", tarball, {
    "consumer.mjs": ESM_CONSUMER,
    "consumer.cjs": CJS_CONSUMER,
  })
  await run(["bun", "consumer.mjs"], runtime)
  await run(["bun", "consumer.cjs"], runtime)

  const nodeMode = process.env.SMOKE_NODE
  const node = nodeMode === "skip" ? null : findNode()
  if (node) {
    await run([node, "consumer.mjs"], runtime)
    await run([node, "consumer.cjs"], runtime)
  } else if (nodeMode === "require") {
    throw new Error("SMOKE_NODE=require but node is not on PATH")
  } else {
    console.log(
      `Node runtime checks skipped (${nodeMode === "skip" ? "SMOKE_NODE=skip" : "node not on PATH"})`
    )
  }

  const keep = process.env.SMOKE_KEEP
  if (keep) {
    await rm(keep, { recursive: true, force: true })
    await cp(runtime, keep, { recursive: true })
    console.log(`runtime fixture kept at ${keep}`)
  }
} finally {
  await rm(temporary, { recursive: true, force: true })
}
