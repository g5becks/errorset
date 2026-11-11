/**
 * LLMS.txt is generated from README.md (TASK-063, audit C5) and must not drift.
 * Regenerate with `bun run docs:llms`.
 * @module tests/llms
 */

import { describe, expect, it } from "bun:test"
import { file } from "bun"
import { generateLlms, LLMS_HEADER, REPO_BLOB_URL } from "../scripts/llms.ts"

const root = new URL("../", import.meta.url)
const readRepoFile = (path: string): Promise<string> =>
  file(new URL(path, root)).text()

describe("LLMS.txt", () => {
  it("is up to date with README.md (run bun run docs:llms)", async () => {
    const [readme, llms] = await Promise.all([
      readRepoFile("README.md"),
      readRepoFile("LLMS.txt"),
    ])
    expect(llms).toBe(generateLlms(readme))
  })
})

describe("generateLlms", () => {
  const readme = [
    '<p align="center">',
    '  <img src="./logo.png" alt="logo" />',
    "</p>",
    "",
    "# errorset",
    "",
    "Intro with [migration](docs/migration-0.4.md), [log](./CHANGELOG.md),",
    "[web](https://example.com) and [anchor](#usage).",
    "",
    "## Usage",
    "",
    "```typescript",
    "// ## Philosophy inside code is kept",
    "```",
    "",
    "## Philosophy",
    "",
    "Opinions.",
    "",
    "## License",
    "",
    "MIT",
    "",
    "",
  ].join("\n")

  const output = generateLlms(readme)

  it("starts with the generated-file header instead of the logo and title", () => {
    expect(output.startsWith(LLMS_HEADER)).toBe(true)
    expect(output).not.toContain("<p align")
    expect(output).not.toContain("logo.png")
    expect(output.match(/^# /gmu)).toHaveLength(1)
  })

  it("drops the Philosophy section and keeps the rest", () => {
    expect(output).not.toContain("Opinions.")
    expect(output).toContain("## Usage")
    expect(output).toContain("// ## Philosophy inside code is kept")
    expect(output).toContain("## License\n\nMIT")
  })

  it("makes relative links absolute and leaves URLs and anchors alone", () => {
    expect(output).toContain(
      `[migration](${REPO_BLOB_URL}/docs/migration-0.4.md)`
    )
    expect(output).toContain(`[log](${REPO_BLOB_URL}/CHANGELOG.md)`)
    expect(output).toContain("[web](https://example.com)")
    expect(output).toContain("[anchor](#usage)")
  })

  it("ends with exactly one newline and is deterministic", () => {
    expect(output.endsWith("MIT\n")).toBe(true)
    expect(generateLlms(readme)).toBe(output)
    expect(generateLlms(readme.replaceAll("\n", "\r\n"))).toBe(output)
  })
})
