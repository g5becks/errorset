/**
 * Writes LLMS.txt from README.md (`bun run docs:llms`). CI regenerates it and fails on a diff.
 * @module scripts/gen-llms
 */

import { file, write } from "bun"
import { generateLlms } from "./llms.ts"

const root = new URL("../", import.meta.url)
const readme = await file(new URL("README.md", root)).text()
await write(new URL("LLMS.txt", root), generateLlms(readme))
console.log("LLMS.txt generated from README.md")
