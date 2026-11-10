/**
 * The internal helpers are deprecated in 0.3.1 but must stay exported from the
 * package entry until 0.4.0 (non-breaking). The 0.4.0 removal replaces this file.
 */

import { expectTypeOf } from "expect-type"
import {
  createKindFunction,
  createSetGuard,
  createSetGuardWithKinds,
} from "../../src/index.ts"

expectTypeOf(createKindFunction).toBeFunction()
expectTypeOf(createSetGuard).toBeFunction()
expectTypeOf(createSetGuardWithKinds).toBeFunction()
