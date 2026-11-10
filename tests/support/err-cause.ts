/**
 * Test helper: since 0.4.0 `cause` is `unknown` (ES2022 semantics), so a test that
 * expects an errorset error as the cause narrows it explicitly, as callers do.
 */
import { type Err, isErr } from "../../src/index.ts"

export const errCause = (value: unknown): Err => {
  if (!isErr(value)) {
    throw new Error(`expected an errorset error as cause, got ${String(value)}`)
  }
  return value
}
