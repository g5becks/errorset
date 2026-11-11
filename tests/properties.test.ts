/**
 * Property-based tests (fast-check, fixed seed) for guard precision, rehydration and
 * immutability (TASK-074, audit Q6).
 * @module tests/properties
 */

import { describe, expect, it } from "bun:test"
import fc from "fast-check"
import { errorSet, merge, RESERVED_KINDS } from "../src/index.ts"

/** Fixed seed so CI runs are reproducible; failures print the seed and path. */
const RUN = { seed: 20_261_110, numRuns: 150 } as const

const reserved = new Set<string>(RESERVED_KINDS)
/** Kind and key names: identifier-like, short, never reserved. */
const nameArb = fc
  .stringMatching(/^[a-z][a-z0-9_]{0,7}$/u)
  .filter(name => !reserved.has(name))

type AnySet = ((value: unknown) => boolean) & {
  readonly kinds: readonly string[]
  from(value: unknown): unknown
} & Record<string, unknown>
type Tag = (strings: TemplateStringsArray, ...keys: string[]) => unknown

/** Unique set names per property run, so the duplicate-name registry stays quiet. */
let setCounter = 0
const defineSet = (kinds: readonly string[]): AnySet => {
  setCounter += 1
  return errorSet(
    `Prop.Set${setCounter}`,
    kinds as unknown as readonly ["k"]
  ).init() as unknown as AnySet
}

/** A frozen strings array with a frozen raw: what a tagged template passes. */
const templateStrings = (parts: readonly string[]): TemplateStringsArray =>
  Object.freeze(
    Object.assign([...parts], { raw: Object.freeze([...parts]) })
  ) as unknown as TemplateStringsArray

const noContextError = (set: AnySet, kind: string): unknown =>
  (set[kind] as Tag)(templateStrings([`${kind} failed`]))

describe("guard precision", () => {
  // 2-4 sets drawing kinds from a small pool, so sets often share kind names
  const setsArb = fc.array(
    fc.uniqueArray(fc.constantFrom("a", "b", "c", "d", "e", "f"), {
      minLength: 1,
      maxLength: 4,
    }),
    { minLength: 2, maxLength: 4 }
  )

  it("set and kind guards accept exactly their own (set, kind) errors", () => {
    fc.assert(
      fc.property(setsArb, kindLists => {
        const sets = kindLists.map(defineSet)
        const errors = sets.flatMap((set, setIndex) =>
          set.kinds.map(kind => ({
            setIndex,
            kind,
            err: noContextError(set, kind),
          }))
        )
        for (const [guardIndex, guard] of sets.entries()) {
          for (const { setIndex, kind, err } of errors) {
            expect(guard(err)).toBe(guardIndex === setIndex)
            for (const guardKind of guard.kinds) {
              const kindGuard = guard[guardKind] as (value: unknown) => boolean
              expect(kindGuard(err)).toBe(
                guardIndex === setIndex && guardKind === kind
              )
            }
          }
        }
      }),
      RUN
    )
  })

  it("a merged guard accepts exactly the errors of the merged sets", () => {
    fc.assert(
      fc.property(
        setsArb,
        fc.array(fc.boolean(), { minLength: 4, maxLength: 4 }),
        (kindLists, pick) => {
          const sets = kindLists.map(defineSet)
          const chosen = sets.filter((_, index) => pick[index])
          fc.pre(chosen.length > 0)
          const merged = merge(
            ...(chosen as unknown as Parameters<typeof merge>)
          ) as unknown as (value: unknown) => boolean
          for (const set of sets) {
            for (const kind of set.kinds) {
              expect(merged(noContextError(set, kind))).toBe(
                chosen.includes(set)
              )
            }
          }
        }
      ),
      RUN
    )
  })
})

describe("rehydration", () => {
  const valueArb = fc.oneof(
    fc.string({ maxLength: 12 }),
    fc.integer(),
    fc.boolean(),
    fc.constant(null)
  )
  const entityArb = fc
    .uniqueArray(nameArb, { minLength: 1, maxLength: 5 })
    .chain(keys =>
      fc.tuple(
        fc.constant(keys),
        fc.tuple(...keys.map(() => valueArb)),
        fc.array(fc.string({ maxLength: 6 }), {
          minLength: keys.length + 1,
          maxLength: keys.length + 1,
        })
      )
    )

  it("from(JSON.parse(JSON.stringify(err))) restores an equivalent error", () => {
    const set = defineSet(["k"])
    fc.assert(
      fc.property(entityArb, ([keys, values, parts]) => {
        const entity = Object.fromEntries(
          keys.map((key, i) => [key, values[i]])
        )
        const create = (set.k as Tag)(templateStrings(parts), ...keys) as (
          entity: object
        ) => unknown
        const err = create(entity)
        const restored = set.from(JSON.parse(JSON.stringify(err)))
        expect(set(restored)).toBe(true)
        expect(JSON.stringify(restored)).toBe(JSON.stringify(err))
        expect(String(restored)).toBe(String(err))
        expect(Object.keys(restored as object)).toEqual(
          Object.keys(err as object)
        )
        expect(Object.isFrozen(restored)).toBe(true)
      }),
      RUN
    )
  })

  it("from(structuredClone(err)) restores the same guard behavior", () => {
    const set = defineSet(["k", "other"])
    fc.assert(
      fc.property(entityArb, ([keys, values, parts]) => {
        const entity = Object.fromEntries(
          keys.map((key, i) => [key, values[i]])
        )
        const create = (set.k as Tag)(templateStrings(parts), ...keys) as (
          entity: object
        ) => unknown
        const restored = set.from(structuredClone(create(entity)))
        expect((set.k as (value: unknown) => boolean)(restored)).toBe(true)
        expect((set.other as (value: unknown) => boolean)(restored)).toBe(false)
      }),
      RUN
    )
  })
})

describe("immutability", () => {
  it("writes, additions and deletions on errors and their data fail", () => {
    const set = defineSet(["k"])
    const create = (set.k as Tag)(templateStrings(["id ", ""]), "id") as (
      entity: object
    ) => Record<string, unknown> & { data: Record<string, unknown> }
    fc.assert(
      fc.property(
        fc.string({ maxLength: 8 }),
        fc.constantFrom("set", "kind", "message", "data"),
        nameArb,
        fc.anything(),
        (id, field, newKey, value) => {
          const err = create({ id })
          expect(() => {
            ;(err as Record<string, unknown>)[field] = value
          }).toThrow(TypeError)
          expect(() => {
            err.data.id = value
          }).toThrow(TypeError)
          expect(() => {
            err[`new_${newKey}`] = value
          }).toThrow(TypeError)
          expect(() => {
            err.data[`new_${newKey}`] = value
          }).toThrow(TypeError)
          expect(Reflect.deleteProperty(err, field)).toBe(false)
          expect(Reflect.deleteProperty(err.data, "id")).toBe(false)
          expect(err.data.id).toBe(id)
        }
      ),
      RUN
    )
  })
})
