import { describe, expect, it } from "bun:test"
import { errorSet, isErr } from "../src/types"

describe("Callable Error - New Simplified Syntax", () => {
  type BackupContext = {
    bucket: string
    path: string
    message: string
  }

  const BackupError = errorSet("BackupError", [
    "config_invalid",
    "upload_failed",
    "download_failed",
  ]).init<BackupContext>()

  it("should allow direct use of template literal without calling", () => {
    // New simplified syntax - no ({}) needed
    const err = BackupError.config_invalid`S3 configuration is required`

    expect(err.kind).toBe("config_invalid")
    expect(err.message).toBe("S3 configuration is required")
    expect(err.data).toEqual({})
    expect(isErr(err)).toBe(true)
  })

  it("should allow calling with cause option", () => {
    const causeErr = BackupError.download_failed`Download failed`
    const err = BackupError.config_invalid`S3 configuration is required`({
      cause: causeErr,
    })

    expect(err.kind).toBe("config_invalid")
    expect(err.message).toBe("S3 configuration is required")
    expect(err.cause?.kind).toBe("download_failed")
    expect(isErr(err)).toBe(true)

    // Verify the error created via call has its own inspect function
    const inspectSymbol = Symbol.for("nodejs.util.inspect.custom")
    const inspectFn = (err as unknown as Record<symbol, () => string>)[
      inspectSymbol
    ]
    expect(inspectFn?.()).toBe("BackupError.config_invalid {}")
  })

  it("should still work with template holes and entity data", () => {
    // Traditional syntax with data
    const err = BackupError.upload_failed`Upload to ${"bucket"} failed`({
      bucket: "my-bucket",
    })

    expect(err.kind).toBe("upload_failed")
    expect(err.message).toBe("Upload to my-bucket failed")
    expect(err.data).toEqual({ bucket: "my-bucket" })
    expect(isErr(err)).toBe(true)
  })

  it("isErr should now work on callable errors (functions)", () => {
    const err = BackupError.config_invalid`Test error`
    // The callable error is a function with ERR property
    expect(typeof err).toBe("function")
    expect(isErr(err)).toBe(true)
  })

  it("should support set-level guard on callable errors", () => {
    const err = BackupError.config_invalid`Test`
    expect(BackupError(err)).toBe(true)
  })

  it("should support kind-level guard on callable errors", () => {
    const err = BackupError.config_invalid`Test`
    expect(BackupError.config_invalid(err)).toBe(true)
    expect(BackupError.upload_failed(err)).toBe(false)
  })

  it("should support instanceof on callable errors", () => {
    const err = BackupError.config_invalid`Test`
    expect(err instanceof BackupError).toBe(true)
  })
})
