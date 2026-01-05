/**
 * errorset - Domain-bound, type-safe error handling inspired by Zig
 *
 * This module provides error sets for TypeScript that are:
 * - Bound to domain types (errors know their entity type)
 * - Type-safe (template holes are constrained to keyof T)
 * - Automatic (context is extracted from referenced fields)
 *
 * @module errorset
 */

// Configuration
export {
  type Config,
  configure,
  type Format,
  getConfig,
  resetConfig,
} from "./config.ts"
// Core types and constants
export {
  createKindConstructor,
  ERR,
  type Err,
  type ErrorCreator,
  type ErrorOptions,
  isErr,
  type KindConstructor,
} from "./types.ts"
