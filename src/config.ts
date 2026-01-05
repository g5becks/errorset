/**
 * Configuration system for the errorset library.
 * @module config
 */

/**
 * Output format for error messages.
 * - "pretty": Human-readable format with colors (development)
 * - "json": Structured JSON format (production/logging)
 * - "minimal": Compact format for performance-critical code
 */
export type Format = "pretty" | "json" | "minimal"

/**
 * Configuration options for the errorset library.
 */
export type Config = {
  /** Output format for error messages */
  format: Format
  /** Include stack traces in errors (V8 engines only) */
  includeStack: boolean
  /** Include timestamp when error was created */
  includeTimestamp: boolean
  /** Enable ANSI colors in pretty format */
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
 * // Development configuration
 * configure({
 *   format: "pretty",
 *   colors: true,
 *   includeStack: true,
 * })
 *
 * // Production configuration
 * configure({
 *   format: "json",
 *   includeTimestamp: true,
 * })
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
