// Imports the built ESM bundle under plain Node and exercises one error round trip.
// Used by the `node` job in .github/workflows/ci.yml and by scripts/ci-local.sh.
import assert from "node:assert/strict"

const mod = await import("../dist/index.js")

assert.equal(typeof mod.errorSet, "function", "errorSet export is missing")

const UserError = mod.errorSet("UserError", ["not_found", "suspended"]).init()
const err = UserError.not_found`User ${"id"} not found`({ id: "42" })

assert.equal(UserError(err), true, "set guard rejected its own error")
assert.equal(UserError.not_found(err), true, "kind guard rejected its own error")
assert.equal(err.kind, "not_found")
assert.equal(err.message, "User 42 not found")

process.stdout.write(`node ${process.version}: dist/index.js import OK\n`)
