/**
 * Builds LLMS.txt from README.md so the agent-facing reference can't drift (TASK-063).
 * Pure functions only; scripts/gen-llms.ts writes the file and tests/llms.test.ts checks it.
 * @module scripts/llms
 */

/** Base URL for links that are relative in the README (LLMS.txt is read outside the repo). */
export const REPO_BLOB_URL = "https://github.com/g5becks/errorset/blob/main"

/** Header that replaces the README's logo and title. */
export const LLMS_HEADER = `# errorset - Domain-bound, type-safe error handling for TypeScript

> API documentation for AI agents working with the @takinprofit/errorset library.
> Generated from README.md by \`bun run docs:llms\`; do not edit by hand.
> Upgrading from 0.3: ${REPO_BLOB_URL}/docs/migration-0.4.md
`

/** README sections (level-2 headings) left out of LLMS.txt: prose, not API. */
const DROPPED_SECTIONS = new Set(["Philosophy"])

const FENCE = /^(?:```|~~~)/u
const HEADING_2 = /^## (?<title>.+?)\s*$/u
const RELATIVE_LINK = /\]\((?!https?:|#|mailto:)(?:\.\/)?(?<target>[^)\s]+)\)/gu

/** Removes the logo HTML and the title, which LLMS_HEADER replaces; keeps the intro. */
const dropPreamble = (lines: string[]): string[] =>
  lines.slice(lines.findIndex(line => line.startsWith("# ")) + 1)

/** Drops DROPPED_SECTIONS, ignoring headings inside fenced code blocks. */
const dropSections = (lines: string[]): string[] => {
  const kept: string[] = []
  let inFence = false
  let dropping = false
  for (const line of lines) {
    if (FENCE.test(line)) {
      inFence = !inFence
    }
    const heading = inFence ? null : HEADING_2.exec(line)
    if (heading?.groups) {
      dropping = DROPPED_SECTIONS.has(heading.groups.title as string)
    }
    if (!dropping) {
      kept.push(line)
    }
  }
  return kept
}

/**
 * Generates LLMS.txt content from README.md content.
 * @param readme - README.md text
 * @returns LLMS.txt text (LF line endings, one trailing newline)
 */
export function generateLlms(readme: string): string {
  const lines = readme.replaceAll("\r\n", "\n").split("\n")
  const body = dropSections(dropPreamble(lines))
    .join("\n")
    .replace(
      RELATIVE_LINK,
      (_match, target: string) => `](${REPO_BLOB_URL}/${target})`
    )
    .trim()
  return `${LLMS_HEADER}\n${body}\n`
}
