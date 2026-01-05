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
  captureSync,
  createKindFunction,
  createSetGuard,
  createSetGuardWithKinds,
  ERR,
  type Err,
  type ErrorCreator,
  type ErrorMapper,
  type ErrorOptions,
  type InspectHandler,
  type InspectHandlers,
  inspect,
  isErr,
  type KindConstructor,
  type KindFunction,
  type KindGuard,
  merge,
  type RecoverHandler,
  type RecoverHandlers,
  recover,
  type SetGuard,
  type SetGuardWithKinds,
} from "./types.ts"
