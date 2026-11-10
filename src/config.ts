/**
 * Configuration system for the errorset library.
 * @module config
 */

/**
 * Values accepted by the `format` option.
 *
 * @deprecated No effect: errorset never reads this option. It is removed in 0.4.0; format errors in your logger instead (`JSON.stringify(err)`, `String(err)`).
 */
export type Format = "pretty" | "json" | "minimal"

/**
 * Configuration options for the errorset library.
 */
export type Config = {
  /**
   * @deprecated No effect: errorset never reads this option. It is removed in 0.4.0; format errors in your logger instead (`JSON.stringify(err)`, `String(err)`).
   */
  format: Format
  /** Include stack traces in errors (V8 engines only) */
  includeStack: boolean
  /** Set `timestamp` (`Date.now()`) on each error at creation; absent when false */
  includeTimestamp: boolean
  /**
   * @deprecated No effect: errorset never reads this option. It is removed in 0.4.0; format errors in your logger instead (`JSON.stringify(err)`, `String(err)`).
   */
  colors: boolean
  /** Maximum stack trace depth when includeStack is true */
  stackDepth: number
}

/**
 * Default configuration values.
 * Stack traces and timestamps are off by default since error sets
 * are for expected failures, not bugs.
 */
const defaultConfig: Config = {
  format: "pretty",
  includeStack: false,
  includeTimestamp: false,
  colors: true,
  stackDepth: 10,
}

/** Global configuration state */
let currentConfig: Config = { ...defaultConfig }

/**
 * Configure the errorset library behavior.
 *
 * @param options - Partial configuration to merge with current settings
 *
 * @example
 * ```ts
 * // Development: capture stack traces on errors
 * configure({ includeStack: true, stackDepth: 20 })
 *
 * // Production: record when each error was created
 * configure({ includeTimestamp: true })
 * ```
 */
export function configure(options: Partial<Config>): void {
  currentConfig = { ...currentConfig, ...options }
}

/**
 * Get the current configuration.
 * Used internally by error creation functions.
 *
 * @returns The current configuration object
 */
export function getConfig(): Readonly<Config> {
  return currentConfig
}

/**
 * Reset configuration to defaults.
 * Primarily useful for testing.
 */
export function resetConfig(): void {
  currentConfig = { ...defaultConfig }
}
