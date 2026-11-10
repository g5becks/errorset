/**
 * No-context errors are plain objects (TASK-060, audit A4 option b): they survive
 * structuredClone and JSON, and `.with(options)` returns a new error with a cause.
 * @module tests/no-context
 */

import { afterEach, describe, expect, it } from "bun:test"
import { configure, ERR, errorSet, isErr, resetConfig } from "../src/index.ts"

type Ctx = { id: string }

const JobError = errorSet("NoContext.JobError", [
  "timeout",
  "failed",
]).init<Ctx>()

afterEach(() => {
  resetConfig()
})

describe("no-context errors are plain objects", () => {
  it("is an object with the error fields and no call signature", () => {
    const err = JobError.timeout`Job timed out`
    expect(typeof err).toBe("object")
    expect(Object.keys(err)).toEqual(["set", "kind", "message", "data"])
    expect(err.data).toEqual({})
    expect(JobError.timeout(err)).toBe(true)
  })

  it("each template evaluation creates a new error", () => {
    const create = () => JobError.timeout`Job timed out`
    expect(create()).not.toBe(create())
  })
})

describe("with(options)", () => {
  it("returns a new error with the cause; the original is unchanged", () => {
    const root = new Error("socket hang up")
    const base = JobError.failed`Job failed`
    const withCause = base.with({ cause: root })
    expect(withCause).not.toBe(base)
    expect(withCause.cause).toBe(root)
    expect("cause" in base).toBe(false)
    expect(withCause.message).toBe("Job failed")
    expect(JobError.failed(withCause)).toBe(true)
    expect(Object.keys(withCause)).toEqual([
      "set",
      "kind",
      "message",
      "data",
      "cause",
    ])
  })

  it("is non-enumerable, chains, and applies creation options (timestamp)", () => {
    configure({ includeTimestamp: true })
    const err = JobError.failed`Job failed`.with({}).with({ cause: "x" })
    expect(Object.keys(err)).not.toContain("with")
    expect(typeof err.timestamp).toBe("number")
    expect(err.cause).toBe("x")
  })
})

describe("structuredClone", () => {
  it("clones both error shapes with their data; the brand symbol is not cloned", () => {
    const noContext = JobError.timeout`Job timed out`.with({
      cause: new Error("root"),
    })
    const template = JobError.failed`Job ${"id"} failed`({ id: "42" })

    const clonedNoContext = structuredClone(noContext)
    const clonedTemplate = structuredClone(template)

    expect(clonedNoContext).toMatchObject({
      set: "NoContext.JobError",
      kind: "timeout",
      message: "Job timed out",
      data: {},
    })
    expect((clonedNoContext.cause as Error).message).toBe("root")
    expect(clonedTemplate).toMatchObject({
      set: "NoContext.JobError",
      kind: "failed",
      message: "Job 42 failed",
      data: { id: "42" },
    })
    // Structured clone drops symbol keys and non-enumerable methods: the clone is
    // plain data until XError.from() (0.5.0) rehydrates it.
    expect(ERR in clonedTemplate).toBe(false)
    expect(isErr(clonedTemplate)).toBe(false)
    expect(isErr(clonedNoContext)).toBe(false)
  })

  it("serializes both shapes to JSON", () => {
    expect(
      JSON.parse(JSON.stringify({ e: JobError.timeout`Job timed out` }))
    ).toEqual({
      e: {
        set: "NoContext.JobError",
        kind: "timeout",
        message: "Job timed out",
        data: {},
      },
    })
  })
})
