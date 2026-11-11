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

// Core API, one block per module
export {
  ERR,
  ERR_PROTOCOL,
  type Err,
  type ErrProtocol,
  isErr,
} from "./brand.ts"
// Configuration
export {
  type Config,
  configure,
  getConfig,
  resetConfig,
} from "./config.ts"
export type {
  SetGuard,
  SetGuardWithKinds,
} from "./guards.ts"
export {
  captureAsync,
  captureSync,
  type ErrorMapper,
  type InspectHandler,
  type InspectHandlers,
  inspect,
  type RecoverHandler,
  type RecoverHandlers,
  recover,
  toError,
} from "./helpers.ts"
export {
  type GuardedError,
  type MergedGuard,
  type MergedInspectHandlers,
  type MergedRecoverHandlers,
  type MergeInput,
  merge,
} from "./merge.ts"
export {
  type ErrorSet,
  type ErrorSetBuilder,
  errorSet,
} from "./set.ts"
export {
  type DeclaredKeys,
  type ErrorCreator,
  type ErrorOptions,
  type ErrorSetConfig,
  type HasDuplicates,
  type KindConstructor,
  type KindData,
  type KindFunction,
  type KindGuard,
  type KindKeys,
  type NoContextErr,
  type NoDuplicates,
  type NoReserved,
  type NoReservedKeys,
  RESERVED_KINDS,
  type ReservedKind,
} from "./types.ts"
