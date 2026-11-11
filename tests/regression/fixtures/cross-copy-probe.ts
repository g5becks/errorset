/**
 * Cross-copy probe (audit A2), run in a subprocess by tests/regression/audit-appendix-a.test.ts
 * so the two bundled copies stay out of the coverage report.
 *
 * Builds src/index.ts twice into separate files (two copies of the package, as when an
 * app and a plugin each bundle errorset), creates an error with copy B and prints, as
 * JSON, whether copy A recognizes it.
 */

import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { build } from "bun"

type Api = typeof import("../../../src/index.ts")

const entry = new URL("../../../src/index.ts", import.meta.url).pathname
const directory = await mkdtemp(join(tmpdir(), "errorset-cross-copy-"))

const bundleCopy = async (name: string): Promise<Api> => {
  const result = await build({
    entrypoints: [entry],
    outdir: join(directory, name),
    target: "node",
  })
  const [output] = result.outputs
  if (!(result.success && output)) {
    throw new Error(`building copy ${name} failed`)
  }
  return (await import(output.path)) as Api
}

try {
  const host = await bundleCopy("host")
  const plugin = await bundleCopy("plugin")

  type Ctx = { id: string }
  const HostError = host
    .errorSet("SharedError", ["not_found", "invalid"])
    .init<Ctx>()
  const PluginError = plugin
    .errorSet("SharedError", ["not_found", "invalid"])
    .init<Ctx>()
  const fromPlugin = PluginError.not_found`Item ${"id"} not found`({ id: "1" })

  const result = {
    distinctCopies: host.errorSet !== plugin.errorSet,
    pluginRecognizesOwn: plugin.isErr(fromPlugin) && PluginError(fromPlugin),
    hostIsErr: host.isErr(fromPlugin),
    hostSetGuard: HostError(fromPlugin),
    hostKindGuard: HostError.not_found(fromPlugin),
  }
  process.stdout.write(JSON.stringify(result))
} finally {
  await rm(directory, { recursive: true, force: true })
}
