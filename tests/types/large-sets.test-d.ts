/**
 * Large kind tuples type-check (TASK-074). HasDuplicates is a tail-recursive type over
 * the tuple: measured on TypeScript 7.0.2, 200 kinds check in ~0.3 s, 500 in ~0.5 s and
 * 999 in ~1.1 s; at 1000 kinds TypeScript stops with TS2589 ("Type instantiation is
 * excessively deep"), its tail-recursion limit. Keep sets well below that.
 */

import { expectTypeOf } from "expect-type"
import { errorSet } from "../../src/index.ts"

// 200 kinds compile and keep literal kind types
// biome-ignore format: one kind per line would make this file 200 lines longer
const Large = errorSet("Large", ["k0", "k1", "k2", "k3", "k4", "k5", "k6", "k7", "k8", "k9", "k10", "k11", "k12", "k13", "k14", "k15", "k16", "k17", "k18", "k19", "k20", "k21", "k22", "k23", "k24", "k25", "k26", "k27", "k28", "k29", "k30", "k31", "k32", "k33", "k34", "k35", "k36", "k37", "k38", "k39", "k40", "k41", "k42", "k43", "k44", "k45", "k46", "k47", "k48", "k49", "k50", "k51", "k52", "k53", "k54", "k55", "k56", "k57", "k58", "k59", "k60", "k61", "k62", "k63", "k64", "k65", "k66", "k67", "k68", "k69", "k70", "k71", "k72", "k73", "k74", "k75", "k76", "k77", "k78", "k79", "k80", "k81", "k82", "k83", "k84", "k85", "k86", "k87", "k88", "k89", "k90", "k91", "k92", "k93", "k94", "k95", "k96", "k97", "k98", "k99", "k100", "k101", "k102", "k103", "k104", "k105", "k106", "k107", "k108", "k109", "k110", "k111", "k112", "k113", "k114", "k115", "k116", "k117", "k118", "k119", "k120", "k121", "k122", "k123", "k124", "k125", "k126", "k127", "k128", "k129", "k130", "k131", "k132", "k133", "k134", "k135", "k136", "k137", "k138", "k139", "k140", "k141", "k142", "k143", "k144", "k145", "k146", "k147", "k148", "k149", "k150", "k151", "k152", "k153", "k154", "k155", "k156", "k157", "k158", "k159", "k160", "k161", "k162", "k163", "k164", "k165", "k166", "k167", "k168", "k169", "k170", "k171", "k172", "k173", "k174", "k175", "k176", "k177", "k178", "k179", "k180", "k181", "k182", "k183", "k184", "k185", "k186", "k187", "k188", "k189", "k190", "k191", "k192", "k193", "k194", "k195", "k196", "k197", "k198", "k199"]).init()
type LargeKind = (typeof Large.kinds)[number]
expectTypeOf<"k0" | "k199">().toExtend<LargeKind>()
expectTypeOf<"k200">().not.toExtend<LargeKind>()
expectTypeOf(Large.k199).toBeFunction()

// A duplicate at the end of a 200-kind tuple is still detected
// biome-ignore format: the call must stay on the line after @ts-expect-error
// @ts-expect-error - "k0" appears twice
errorSet("LargeDuplicate", ["k0", "k1", "k2", "k3", "k4", "k5", "k6", "k7", "k8", "k9", "k10", "k11", "k12", "k13", "k14", "k15", "k16", "k17", "k18", "k19", "k20", "k21", "k22", "k23", "k24", "k25", "k26", "k27", "k28", "k29", "k30", "k31", "k32", "k33", "k34", "k35", "k36", "k37", "k38", "k39", "k40", "k41", "k42", "k43", "k44", "k45", "k46", "k47", "k48", "k49", "k50", "k51", "k52", "k53", "k54", "k55", "k56", "k57", "k58", "k59", "k60", "k61", "k62", "k63", "k64", "k65", "k66", "k67", "k68", "k69", "k70", "k71", "k72", "k73", "k74", "k75", "k76", "k77", "k78", "k79", "k80", "k81", "k82", "k83", "k84", "k85", "k86", "k87", "k88", "k89", "k90", "k91", "k92", "k93", "k94", "k95", "k96", "k97", "k98", "k99", "k100", "k101", "k102", "k103", "k104", "k105", "k106", "k107", "k108", "k109", "k110", "k111", "k112", "k113", "k114", "k115", "k116", "k117", "k118", "k119", "k120", "k121", "k122", "k123", "k124", "k125", "k126", "k127", "k128", "k129", "k130", "k131", "k132", "k133", "k134", "k135", "k136", "k137", "k138", "k139", "k140", "k141", "k142", "k143", "k144", "k145", "k146", "k147", "k148", "k149", "k150", "k151", "k152", "k153", "k154", "k155", "k156", "k157", "k158", "k159", "k160", "k161", "k162", "k163", "k164", "k165", "k166", "k167", "k168", "k169", "k170", "k171", "k172", "k173", "k174", "k175", "k176", "k177", "k178", "k179", "k180", "k181", "k182", "k183", "k184", "k185", "k186", "k187", "k188", "k189", "k190", "k191", "k192", "k193", "k194", "k195", "k196", "k197", "k198", "k0"])
