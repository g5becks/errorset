/**
 * Configuration system for the errorset library.
 * @module config
 */

/**
 * Configuration options for the errorset library.
 */
export type Config = {
  /** Include stack traces in errors (V8 engines only) */
  includeStack: boolean
  /** Set `timestamp` (`Date.now()`) on each error at creation; absent when false */
  includeTimestamp: boolean
  /** Maximum stack trace depth when includeStack is true */
  stackDepth: number
}

/**
 * Default configuration values.
 * Stack traces and timestamps are off by default since error sets
 * are for expected failures, not bugs.
 */
const defaultConfig: Readonly<Config> = {
  includeStack: false,
  includeTimestamp: false,
  stackDepth: 10,
}

/** The option names errorset reads; anything else passed to configure() is ignored. */
const CONFIG_KEYS = Object.keys(defaultConfig) as (keyof Config)[]

/** Global configuration state */
let currentConfig: Config = { ...defaultConfig }

/**
 * Bumped on every configuration change (configure, its disposer, resetConfig), so error
 * sets can cache their effective configuration and recompute it only when it changed.
 */
let configVersion = 0

/** Copies only the known options, so stray keys (e.g. the removed format/colors) are ignored. */
const pickKnownOptions = (options: Partial<Config>): Partial<Config> => {
  const known: Partial<Config> = {}
  for (const key of CONFIG_KEYS) {
    if (options[key] !== undefined) {
      Object.assign(known, { [key]: options[key] })
    }
  }
  return known
}

/**
 * Configure errorset globally for the whole process.
 *
 * Global configuration is for **applications** only: it affects every error set in
 * the process, including sets defined by libraries. Library authors should pass
 * options to their own sets with `errorSet(name, kinds).init<T>(config)` instead.
 *
 * Unknown options are ignored. Returns a disposer that restores the configuration
 * that was in effect before this call (useful in tests).
 *
 * @param options - Partial configuration to merge with current settings
 * @returns A function that restores the previous configuration
 *
 * @example
 * ```ts
 * // Development: capture stack traces on errors
 * configure({ includeStack: true, stackDepth: 20 })
 *
 * // Production: record when each error was created
 * configure({ includeTimestamp: true })
 *
 * // Tests: scope a change and undo it
 * const restore = configure({ includeTimestamp: true })
 * // ...
 * restore()
 * ```
 */
export function configure(options: Partial<Config>): () => void {
  const previous = currentConfig
  currentConfig = { ...currentConfig, ...pickKnownOptions(options) }
  configVersion += 1
  return () => {
    currentConfig = previous
    configVersion += 1
  }
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
  configVersion += 1
}

/**
 * The configuration version: changes whenever the global configuration changes.
 * Used internally to invalidate per-set cached configuration.
 *
 * @internal
 */
export function getConfigVersion(): number {
  return configVersion
}
