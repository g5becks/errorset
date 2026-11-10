// Release preparation: `bun run release:prepare <version> [--dry-run] [--out <dir>]`.
// Ported from StrataDB's scripts/release.ts.
//
// On branch release/v<version> with a clean tree it:
//   1. rolls CHANGELOG [Unreleased] into a dated section and bumps package.json;
//   2. commits `chore(release): prepare v<version>` and creates an annotated tag;
//   3. runs scripts/ci-local.sh on the tag (must print RESULT: PASS);
//   4. in a worktree (default ../errorset-release/v<version>): builds, packs, checks the
//      tarball file list, writes SHA512SUMS, runs an isolated consumer smoke test and
//      writes RELEASE_NOTES.md and CI_LOCAL.log;
//   5. prints the maintainer's publish commands.
// It never pushes and never publishes. --dry-run runs every check and writes nothing.

import { existsSync } from "node:fs"
import { mkdtemp, readFile, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { basename, dirname, join, relative, resolve } from "node:path"
import { CryptoHasher, file, spawn, write } from "bun"

const PACKAGE = "@takinprofit/errorset"
const TARBALL_PREFIX = "takinprofit-errorset"
const STABLE_VERSION = /^(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/u
const SECTION = /^## /mu
const HEADING_LINE = /^#+[^\n]*$/gmu
const UNRELEASED_HEADING = /^## \[Unreleased\][^\n]*\n/mu
const UNRELEASED_LINK =
  /^\[Unreleased\]: (?<base>\S+)\/compare\/(?<previous>v\d+\.\d+\.\d+)\.\.\.HEAD$/mu
const ARCHIVE_ENTRY =
  /^package\/(?:dist\/[^/]+\.(?:js|d\.ts)|README\.md|LICENSE|package\.json)$/u
const REQUIRED_ENTRIES = [
  "package/dist/index.js",
  "package/dist/index.d.ts",
  "package/README.md",
  "package/LICENSE",
  "package/package.json",
]
const CI_PASS = /^RESULT: PASS$/mu

const run = async (
  args: string[],
  cwd: string,
  capture = false
): Promise<string> => {
  const child = spawn(args, {
    cwd,
    stdout: capture ? "pipe" : "inherit",
    stderr: "inherit",
  })
  const output = capture ? await new Response(child.stdout).text() : ""
  const code = await child.exited
  if (code !== 0) {
    throw new Error(
      `${args.join(" ")} exited ${code}${output ? `\n${output}` : ""}`
    )
  }
  return output.trimEnd()
}

const parseVersion = (value: string): number[] => {
  if (!STABLE_VERSION.test(value)) {
    throw new Error(`Invalid stable version: ${value}`)
  }
  return value.split(".").map(Number)
}

const requireNewer = (version: string, current: string): void => {
  const next = parseVersion(version)
  const previous = parseVersion(current)
  for (let i = 0; i < 3; i += 1) {
    if ((next[i] ?? 0) > (previous[i] ?? 0)) {
      return
    }
    if ((next[i] ?? 0) < (previous[i] ?? 0)) {
      break
    }
  }
  throw new Error(`Release version ${version} must be greater than ${current}`)
}

/** Moves the [Unreleased] entries into a dated `## [version]` section and updates the links. */
export const rollChangelog = (
  changelog: string,
  version: string,
  date: string
): { entries: string; text: string } => {
  const match = UNRELEASED_HEADING.exec(changelog)
  if (!match) {
    throw new Error("CHANGELOG.md is missing ## [Unreleased]")
  }
  const start = match.index + match[0].length
  const next = changelog.slice(start).search(SECTION)
  const end = next === -1 ? changelog.length : start + next
  const entries = changelog.slice(start, end).trim()
  if (!entries.replace(HEADING_LINE, "").trim()) {
    throw new Error("CHANGELOG.md [Unreleased] is empty")
  }
  let text = `${changelog.slice(0, start)}\n## [${version}] - ${date}\n\n${entries}\n\n${changelog.slice(end)}`
  const link = UNRELEASED_LINK.exec(text)
  if (link?.groups) {
    const [line] = link
    const { base, previous: previousTag } = link.groups
    text = text.replace(
      line,
      `[Unreleased]: ${base}/compare/v${version}...HEAD\n[${version}]: ${base}/compare/${previousTag}...v${version}`
    )
  }
  return { entries, text }
}

/** Only dist/*.js, dist/*.d.ts, README.md, LICENSE and package.json may ship. */
export const validateArchiveEntries = (entries: string[]): void => {
  const missing = new Set(REQUIRED_ENTRIES)
  for (const entry of entries) {
    if (entry.split("/").includes("..") || !ARCHIVE_ENTRY.test(entry)) {
      throw new Error(`Unexpected tarball entry: ${entry}`)
    }
    missing.delete(entry)
  }
  if (missing.size > 0) {
    throw new Error(`Tarball missing: ${[...missing].join(", ")}`)
  }
}

const CONSUMER_BODY = `const UserError = errorSet("UserError", ["not_found", "suspended"]).init()
const err = UserError.not_found\`User \${"id"} not found\`({ id: "1" })
const check = (ok, what) => { if (!ok) throw new Error("release consumer check failed: " + what) }
check(version === EXPECTED, "version " + version)
check(UserError(err) && UserError.not_found(err) && !UserError.suspended(err), "guards")
check(err.message === "User 1 not found", "message")
check(JSON.parse(JSON.stringify(err)).kind === "not_found", "toJSON")
check(UserError.recover(err, { not_found: () => "ok", suspended: () => "no" }) === "ok", "recover")
console.log(MODE + " consumer passed for ${PACKAGE}@" + version)
`

const consumer = async (tarball: string, version: string): Promise<void> => {
  const directory = await mkdtemp(join(tmpdir(), "errorset-release-consumer-"))
  try {
    await write(
      join(directory, "package.json"),
      `${JSON.stringify({ private: true, type: "module", dependencies: { [PACKAGE]: `file:${tarball}` } }, null, 2)}\n`
    )
    const expected = JSON.stringify(version)
    await write(
      join(directory, "consumer.mjs"),
      `import { errorSet } from "${PACKAGE}"\nimport { createRequire } from "node:module"\nconst { version } = createRequire(import.meta.url)("${PACKAGE}/package.json")\nconst EXPECTED = ${expected}\nconst MODE = "ESM"\n${CONSUMER_BODY}`
    )
    await write(
      join(directory, "consumer.cjs"),
      `const { errorSet } = require("${PACKAGE}")\nconst { version } = require("${PACKAGE}/package.json")\nconst EXPECTED = ${expected}\nconst MODE = "CJS"\n${CONSUMER_BODY}`
    )
    await run(["bun", "install", "--production"], directory)
    for (const runtime of ["bun", "node"]) {
      for (const entry of ["consumer.mjs", "consumer.cjs"]) {
        await run([runtime, entry], directory)
      }
    }
  } finally {
    await rm(directory, { recursive: true, force: true })
  }
}

const shellQuote = (value: string): string =>
  `'${value.replaceAll("'", "'\\''")}'`

const parseOptions = (
  args: string[]
): { version: string; dryRun: boolean; out?: string } => {
  const [version, ...options] = args
  if (!version) {
    throw new Error(
      "Usage: bun run release:prepare <version> [--dry-run] [--out <directory>]"
    )
  }
  parseVersion(version)
  let dryRun = false
  let out: string | undefined
  for (let i = 0; i < options.length; i += 1) {
    const option = options[i]
    const value = options[i + 1]
    if (option === "--dry-run") {
      dryRun = true
    } else if (option === "--out" && value && !value.startsWith("--")) {
      out = value
      i += 1
    } else {
      throw new Error(`Unknown or incomplete option: ${option}`)
    }
  }
  return { version, dryRun, out }
}

const prepare = async (args: string[]): Promise<void> => {
  const { version, dryRun, out: destination } = parseOptions(args)
  const root = await run(
    ["git", "rev-parse", "--show-toplevel"],
    process.cwd(),
    true
  )
  if (
    await run(
      ["git", "status", "--porcelain", "--untracked-files=all"],
      root,
      true
    )
  ) {
    throw new Error("Release preparation requires a clean working tree")
  }
  const metadata = await file(join(root, "package.json")).json()
  requireNewer(version, metadata.version)
  const branch = await run(["git", "branch", "--show-current"], root, true)
  if (branch !== `release/v${version}`) {
    throw new Error(
      `Expected branch release/v${version}, got ${branch || "detached HEAD"}`
    )
  }
  const tag = `v${version}`
  if (await run(["git", "tag", "--list", tag], root, true)) {
    throw new Error(`Tag ${tag} already exists`)
  }
  const out = resolve(
    destination ?? join(dirname(root), "errorset-release", tag)
  )
  if (existsSync(out)) {
    throw new Error(`Output directory already exists: ${out}`)
  }
  const fromRoot = relative(root, out)
  if (fromRoot === "" || !fromRoot.startsWith("..")) {
    throw new Error("Output worktree must be outside the source repository")
  }
  const date = new Date().toISOString().slice(0, 10)
  const changelog = rollChangelog(
    await file(join(root, "CHANGELOG.md")).text(),
    version,
    date
  )

  console.log(
    `Prepare ${metadata.version} -> ${version}: roll CHANGELOG, bump package.json, commit, tag ${tag}, run ci-local, pack and verify in ${out}`
  )
  if (dryRun) {
    console.log(
      "Dry run: every check passed; no files, commits, tags or worktrees written"
    )
    return
  }

  metadata.version = version
  await write(
    join(root, "package.json"),
    `${JSON.stringify(metadata, null, 2)}\n`
  )
  await write(join(root, "CHANGELOG.md"), changelog.text)
  await run(["git", "add", "package.json", "CHANGELOG.md"], root)
  await run(["git", "commit", "-m", `chore(release): prepare ${tag}`], root)
  await run(["git", "tag", "-a", tag, "-m", `errorset ${tag}`], root)

  const ci = await run(["bash", "scripts/ci-local.sh", tag], root, true)
  console.log(ci)
  if (!CI_PASS.test(ci)) {
    throw new Error("ci-local did not report RESULT: PASS")
  }

  await run(["git", "worktree", "add", "--detach", out, tag], root)
  await write(join(out, "CI_LOCAL.log"), `${ci}\n`)
  await run(["bun", "install", "--frozen-lockfile"], out)
  await run(["bun", "run", "build"], out)
  await run(["bun", "pm", "pack"], out)
  const tarball = join(out, `${TARBALL_PREFIX}-${version}.tgz`)
  validateArchiveEntries(
    (await run(["tar", "-tzf", tarball], out, true)).split("\n")
  )
  const digest = new CryptoHasher("sha512")
    .update(await readFile(tarball))
    .digest("hex")
  await write(join(out, "SHA512SUMS"), `${digest}  ${basename(tarball)}\n`)
  await consumer(tarball, version)
  await write(
    join(out, "RELEASE_NOTES.md"),
    `# ${tag}\n\n${changelog.entries}\n`
  )

  console.log(`Verified tarball: ${tarball}\nSHA-512: ${digest}`)
  console.log(
    [
      "Maintainer commands (nothing was pushed or published):",
      `cd ${shellQuote(out)} && npm publish ./${basename(tarball)} --access public`,
      `npm view ${PACKAGE}@${version} version`,
      `gh release create ${tag} --verify-tag --title ${tag} --notes-file ${shellQuote(join(out, "RELEASE_NOTES.md"))}`,
    ].join("\n")
  )
}

if (import.meta.main) {
  try {
    await prepare(process.argv.slice(2))
  } catch (error) {
    console.error(
      `Release preparation failed: ${error instanceof Error ? error.message : String(error)}`
    )
    process.exitCode = 1
  }
}
