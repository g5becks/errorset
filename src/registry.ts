/**
 * Set definition checks: the duplicate set-name registry and validation of errorSet()'s kinds argument.
 * @module registry
 */

/**
 * Kinds of every set name defined in this copy of errorset, for the duplicate-name check.
 *
 * Errors are matched by set name, so two different sets with the same name accept each
 * other's errors for the kinds they share. Policy: redefining a name with the same kinds
 * (hot reload, re-evaluated modules, tests) is silent; redefining it with different kinds
 * warns once per name. It never throws, so hot reload keeps working.
 *
 * @internal
 */
const definedSets = new Map<string, string>()
const warnedSetNames = new Set<string>()

export const registerSetName = (
  name: string,
  kinds: readonly string[]
): void => {
  const signature = [...kinds].sort().join("\u0000")
  const previous = definedSets.get(name)
  definedSets.set(name, signature)
  if (
    previous === undefined ||
    previous === signature ||
    warnedSetNames.has(name)
  ) {
    return
  }
  warnedSetNames.add(name)
  console.warn(
    `errorset: error set "${name}" is defined more than once with different kinds. ` +
      "Errors are matched by set name, so these sets accept each other's errors for " +
      "shared kinds. Give each error set a unique name."
  )
}

/**
 * Splits `errorSet()`'s second argument into kind names and, for the object form, the
 * declared data keys per kind. Validates the shape for untyped callers.
 *
 * @internal
 */
export const normalizeKinds = (
  name: string,
  kindsOrSpec: unknown
): {
  kinds: readonly string[]
  declared: Readonly<Record<string, readonly string[]>> | undefined
} => {
  if (Array.isArray(kindsOrSpec)) {
    return { kinds: kindsOrSpec as readonly string[], declared: undefined }
  }
  if (typeof kindsOrSpec !== "object" || kindsOrSpec === null) {
    throw new Error(
      `errorSet("${name}", kinds): kinds must be an array of kind names or an object of kind names to data keys`
    )
  }
  // Null prototype, so a "__proto__" kind is a key here (and then rejected as reserved)
  const declared: Record<string, readonly string[]> = Object.create(null)
  for (const [kind, keys] of Object.entries(kindsOrSpec)) {
    if (!(Array.isArray(keys) && keys.every(key => typeof key === "string"))) {
      throw new Error(
        `Kind "${kind}" in error set "${name}" must list its data keys as an array of strings`
      )
    }
    declared[kind] = [...new Set(keys as string[])]
  }
  return { kinds: Object.keys(declared), declared }
}
