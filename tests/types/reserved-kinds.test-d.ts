/**
 * Every reserved kind name is rejected at compile time (TASK-057, audit A3).
 * One @ts-expect-error per name, so removing a name from the list fails test:types.
 */

import { expectTypeOf } from "expect-type"
import {
  errorSet,
  type NoReserved,
  type ReservedKind,
} from "../../src/index.ts"

// @ts-expect-error - "recover" is a reserved kind name
errorSet("Reserved", ["ok", "recover"])
// @ts-expect-error - "inspect" is a reserved kind name
errorSet("Reserved", ["ok", "inspect"])
// @ts-expect-error - "merge" is a reserved kind name
errorSet("Reserved", ["ok", "merge"])
// @ts-expect-error - "capture" is a reserved kind name
errorSet("Reserved", ["ok", "capture"])
// @ts-expect-error - "captureAsync" is a reserved kind name
errorSet("Reserved", ["ok", "captureAsync"])
// @ts-expect-error - "kinds" is a reserved kind name
errorSet("Reserved", ["ok", "kinds"])
// @ts-expect-error - "Type" is a reserved kind name
errorSet("Reserved", ["ok", "Type"])
// @ts-expect-error - "from" is a reserved kind name
errorSet("Reserved", ["ok", "from"])
// @ts-expect-error - "_" is a reserved kind name
errorSet("Reserved", ["ok", "_"])
// @ts-expect-error - "name" is a reserved kind name
errorSet("Reserved", ["ok", "name"])
// @ts-expect-error - "length" is a reserved kind name
errorSet("Reserved", ["ok", "length"])
// @ts-expect-error - "apply" is a reserved kind name
errorSet("Reserved", ["ok", "apply"])
// @ts-expect-error - "bind" is a reserved kind name
errorSet("Reserved", ["ok", "bind"])
// @ts-expect-error - "call" is a reserved kind name
errorSet("Reserved", ["ok", "call"])
// @ts-expect-error - "arguments" is a reserved kind name
errorSet("Reserved", ["ok", "arguments"])
// @ts-expect-error - "caller" is a reserved kind name
errorSet("Reserved", ["ok", "caller"])
// @ts-expect-error - "constructor" is a reserved kind name
errorSet("Reserved", ["ok", "constructor"])
// @ts-expect-error - "toString" is a reserved kind name
errorSet("Reserved", ["ok", "toString"])
// @ts-expect-error - "toLocaleString" is a reserved kind name
errorSet("Reserved", ["ok", "toLocaleString"])
// @ts-expect-error - "valueOf" is a reserved kind name
errorSet("Reserved", ["ok", "valueOf"])
// @ts-expect-error - "hasOwnProperty" is a reserved kind name
errorSet("Reserved", ["ok", "hasOwnProperty"])
// @ts-expect-error - "isPrototypeOf" is a reserved kind name
errorSet("Reserved", ["ok", "isPrototypeOf"])
// @ts-expect-error - "propertyIsEnumerable" is a reserved kind name
errorSet("Reserved", ["ok", "propertyIsEnumerable"])
// @ts-expect-error - "__proto__" is a reserved kind name
errorSet("Reserved", ["ok", "__proto__"])
// @ts-expect-error - "__defineGetter__" is a reserved kind name
errorSet("Reserved", ["ok", "__defineGetter__"])
// @ts-expect-error - "__defineSetter__" is a reserved kind name
errorSet("Reserved", ["ok", "__defineSetter__"])
// @ts-expect-error - "__lookupGetter__" is a reserved kind name
errorSet("Reserved", ["ok", "__lookupGetter__"])
// @ts-expect-error - "__lookupSetter__" is a reserved kind name
errorSet("Reserved", ["ok", "__lookupSetter__"])

// The compile error names the reserved word
expectTypeOf<NoReserved<["ok", "recover"]>>().toEqualTypeOf<
  readonly ['"recover" is a reserved kind name in errorset; rename the kind']
>()
expectTypeOf<NoReserved<["ok", "fine"]>>().toEqualTypeOf<["ok", "fine"]>()
expectTypeOf<"__proto__">().toExtend<ReservedKind>()

// Names that merely resemble reserved words are fine and keep literal kinds
const Allowed = errorSet("Allowed", [
  "recovered",
  "named",
  "to_string",
  "types",
  "calls",
]).init()
expectTypeOf(Allowed.kinds).toEqualTypeOf<
  readonly ("recovered" | "named" | "to_string" | "types" | "calls")[]
>()
