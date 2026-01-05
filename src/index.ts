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

// Core types and constants
export { ERR, type Err } from "./types.ts"
