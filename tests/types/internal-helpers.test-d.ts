/**
 * The internal helpers, deprecated in 0.3.1, are not exported from the package entry
 * since 0.4.0 (TASK-062).
 */

import { expectTypeOf } from "expect-type"

type PublicApi = typeof import("../../src/index.ts")

expectTypeOf<PublicApi>().not.toHaveProperty("createKindFunction")
expectTypeOf<PublicApi>().not.toHaveProperty("createSetGuard")
expectTypeOf<PublicApi>().not.toHaveProperty("createSetGuardWithKinds")
expectTypeOf<PublicApi>().toHaveProperty("errorSet")
