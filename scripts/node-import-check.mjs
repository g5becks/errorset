// Imports the built ESM bundle under plain Node and exercises one error round trip.
// Used by the `node` job in .github/workflows/ci.yml and by scripts/ci-local.sh.

const check = (condition, message) => {
  if (!condition) {
    throw new Error(`node import check failed: ${message}`)
  }
}

const mod = await import("../dist/index.js")

check(typeof mod.errorSet === "function", "errorSet export is missing")

const UserError = mod.errorSet("UserError", ["not_found", "suspended"]).init()
const err = UserError.not_found`User ${"id"} not found`({ id: "42" })

check(UserError(err) === true, "set guard rejected its own error")
check(UserError.not_found(err) === true, "kind guard rejected its own error")
check(err.kind === "not_found", `unexpected kind ${String(err.kind)}`)
check(
  err.message === "User 42 not found",
  `unexpected message ${JSON.stringify(err.message)}`
)

process.stdout.write(`node ${process.version}: dist/index.js import OK\n`)
