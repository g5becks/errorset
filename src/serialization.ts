/**
 * Serialization (toJSON, toString, the inspect hook on the shared prototype) and message interpolation.
 * @module serialization
 */

import { INSPECT } from "./brand.ts"

/**
 * JSON shape of an error: `{ set, kind, message, data, cause?, timestamp? }`.
 */
type ErrJSON = {
  set: string
  kind: string
  message: string
  data: unknown
  cause?: unknown
  timestamp?: number
}

type SerializableErr = {
  set: string
  kind: string
  message: string
  data: unknown
  cause?: unknown
  timestamp?: number
}

/**
 * Serializes a cause for JSON. errorset errors serialize through their own
 * `toJSON` when `JSON.stringify` recurses; a native `Error` would otherwise
 * become `{}`, so it is reduced to `{ name, message, code? }` (no stack).
 */
const serializeCause = (cause: unknown): unknown => {
  if (!(cause instanceof Error)) {
    return cause
  }
  const { code } = cause as Error & { code?: unknown }
  return typeof code === "string" || typeof code === "number"
    ? { name: cause.name, message: cause.message, code }
    : { name: cause.name, message: cause.message }
}

/**
 * Shared `toJSON` for every error: `{ set, kind, message, data, cause?, timestamp? }`.
 */
function errToJSON(this: SerializableErr): ErrJSON {
  const json: ErrJSON = {
    set: this.set,
    kind: this.kind,
    message: this.message,
    data: this.data,
  }
  if (this.cause !== undefined) {
    json.cause = serializeCause(this.cause)
  }
  if (this.timestamp !== undefined) {
    json.timestamp = this.timestamp
  }
  return json
}

/**
 * Shared prototype of every error. `toJSON`, `toString` and the Node.js inspect hook
 * live here (non-enumerable), not on each error, so creating an error allocates no
 * closures; `Object.keys`, spreading, deep equality and JSON output are unchanged.
 * The inspect hook is a getter that returns a function bound to the error, so it also
 * works when read off the error and called detached.
 *
 * @internal
 */
export const ERR_PROTO: object = Object.create(Object.prototype, {
  toJSON: { value: errToJSON },
  toString: {
    value(this: { set: string; kind: string; message: string }): string {
      return `${this.set}.${this.kind}: ${this.message}`
    },
  },
  [INSPECT]: {
    get(this: { set: string; kind: string; data: unknown }): () => string {
      const { set, kind, data } = this
      return () => `${set}.${kind} ${JSON.stringify(data)}`
    },
  },
})

/** Longest rendering of an object in a message before it is cut off with "…". @internal */
const MAX_INTERPOLATED_LENGTH = 200

/** JSON with `[Circular]` for cycles (ancestors only) and `<n>n` for bigints. @internal */
const cycleSafeJson = (value: object): string | undefined => {
  const ancestors: unknown[] = []
  try {
    return JSON.stringify(
      value,
      function (this: unknown, _key: string, item: unknown): unknown {
        if (typeof item === "bigint") {
          return `${item}n`
        }
        if (typeof item !== "object" || item === null) {
          return item
        }
        // `this` is the object holding `item`: drop ancestors that are not on its path
        while (ancestors.length > 0 && ancestors.at(-1) !== this) {
          ancestors.pop()
        }
        if (ancestors.includes(item)) {
          return "[Circular]"
        }
        ancestors.push(item)
        return item
      }
    )
  } catch {
    // e.g. a throwing toJSON: the caller falls back to the object tag
  }
}

/** Renders an object for a message: Date as ISO, own toString, else truncated JSON. @internal */
const interpolateObject = (value: object): string => {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? "Invalid Date" : value.toISOString()
  }
  // Errors, errorset errors, URL and classes with their own toString read best that way
  const ownToString = (value as { toString?: unknown }).toString
  if (
    !Array.isArray(value) &&
    typeof ownToString === "function" &&
    ownToString !== Object.prototype.toString
  ) {
    return String(value)
  }
  const json = cycleSafeJson(value)
  if (json === undefined) {
    return Object.prototype.toString.call(value)
  }
  return json.length > MAX_INTERPOLATED_LENGTH
    ? `${json.slice(0, MAX_INTERPOLATED_LENGTH)}…`
    : json
}

/**
 * Renders a template value into an error message without losing information: strings
 * as-is, `null`/`undefined` literally, bigints with an `n` suffix, dates as ISO strings,
 * functions by name, objects through their own `toString` or as cycle-safe JSON
 * (truncated to 200 characters). `data` keeps the original values.
 *
 * @internal
 */
export const interpolate = (value: unknown): string => {
  switch (typeof value) {
    case "bigint":
      return `${value}n`
    case "function":
      return value.name ? `[Function: ${value.name}]` : "[Function]"
    case "object":
      return value === null ? "null" : interpolateObject(value)
    default:
      // string, undefined, number, boolean, symbol
      return String(value)
  }
}
