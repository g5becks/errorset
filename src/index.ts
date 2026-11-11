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
  getConfig,
  resetConfig,
} from "./config.ts"
// Core types and constants
export {
  captureAsync,
  captureSync,
  type DeclaredKeys,
  ERR,
  ERR_PROTOCOL,
  type Err,
  type ErrorCreator,
  type ErrorMapper,
  type ErrorOptions,
  type ErrorSet,
  type ErrorSetBuilder,
  type ErrorSetConfig,
  type ErrProtocol,
  errorSet,
  type GuardedError,
  type HasDuplicates,
  type InspectHandler,
  type InspectHandlers,
  inspect,
  isErr,
  type KindConstructor,
  type KindData,
  type KindFunction,
  type KindGuard,
  type KindKeys,
  type MergedGuard,
  type MergedInspectHandlers,
  type MergedRecoverHandlers,
  type MergeInput,
  merge,
  type NoContextErr,
  type NoDuplicates,
  type NoReserved,
  type NoReservedKeys,
  RESERVED_KINDS,
  type RecoverHandler,
  type RecoverHandlers,
  type ReservedKind,
  recover,
  type SetGuard,
  type SetGuardWithKinds,
  toError,
} from "./types.ts"
