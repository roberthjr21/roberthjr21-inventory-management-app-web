import assert from "node:assert/strict"
import { scryptSync } from "node:crypto"
import { after, test } from "node:test"
import { NextRequest } from "next/server"
import { POST as signIn, DELETE as signOut } from "../app/api/session/route"
import { GET as getInventory, POST as saveInventory } from "../app/api/inventory/route"
import { GET as getCheckpoint } from "../app/api/inventory/checkpoint/route"
import { database } from "../lib/server/db"

const enabled = process.env.INVENTORY_TEST_DATABASE === "1"
const testOnlyPassword = "contraseña-de-prueba-inventario"
const origin = "https://inventory.example"
const salt = Buffer.alloc(16, 42)
const key = scryptSync(testOnlyPassword, salt, 64, { N: 32768, maxmem: 64 * 1024 * 1024 })

function request(path: string, method = "GET", payload?: object, session?: string, from = origin) {
  return new NextRequest(origin + path, {
    method,
    headers: {
      origin: from,
      "content-type": "application/json",
      ...(session && { cookie: session }),
    },
    body: payload && JSON.stringify(payload),
  })
}

after(async () => {
  if (enabled) await database().end()
})

test("PostgreSQL enforces authentication, revisions and recoverable restores", { skip: !enabled }, async () => {
  process.env.APP_ORIGIN = origin
  process.env.INVENTORY_PASSWORD_HASH = `scrypt:${salt.toString("hex")}:${key.toString("hex")}`
  const db = database()
  await db.query("TRUNCATE inventory_sessions, inventory_login_limit, inventory_state")

  assert.equal((await getInventory(request("/api/inventory"))).status, 401)
  assert.equal((await getCheckpoint(request("/api/inventory/checkpoint"))).status, 401)
  assert.equal((await signIn(request("/api/session", "POST", { password: "incorrecta" }))).status, 401)
  const login = await signIn(request("/api/session", "POST", { password: testOnlyPassword }))
  assert.equal(login.status, 200)
  const cookie = login.headers.get("set-cookie") ?? ""
  assert.match(cookie, /^__Host-inventory_session=/)
  assert.match(cookie, /HttpOnly/i)
  assert.match(cookie, /SameSite=strict/i)
  assert.match(cookie, /Secure/i)
  const session = cookie.split(";")[0]

  const command = {
    revision: 0,
    command: { type: "addProduct", product: { name: "Deditos", quantity: 5, price: 13000, color: "amber" } },
  }
  assert.equal((await saveInventory(request("/api/inventory", "POST", command, session, "https://external.example"))).status, 403)
  const competing = await Promise.all([
    saveInventory(request("/api/inventory", "POST", command, session)),
    saveInventory(request("/api/inventory", "POST", command, session)),
  ])
  assert.deepEqual(competing.map(response => response.status).sort(), [200, 409])
  const revisionOne = await getInventory(request("/api/inventory", "GET", undefined, session))
  assert.equal(revisionOne.headers.get("Cache-Control"), "private, no-store")
  const { data, revision } = await revisionOne.json()
  assert.equal(revision, 1)
  assert.equal(data.products.length, 1)

  const [product] = data.products
  const saleCommand = { revision, command: { type: "addSale", customerName: "", items: [{ productId: product.id, quantity: 5 }] } }
  const sales = await Promise.all([
    saveInventory(request("/api/inventory", "POST", saleCommand, session)),
    saveInventory(request("/api/inventory", "POST", saleCommand, session)),
  ])
  assert.deepEqual(sales.map(response => response.status).sort(), [200, 409])
  const saved = await sales.find(response => response.ok)!.json()
  assert.equal(saved.data.sales.length, 1)
  assert.equal(saved.data.products[0].quantity, 0)

  const invalid = { revision: 2, command: { type: "restore", backup: { exportado: true } } }
  assert.equal((await saveInventory(request("/api/inventory", "POST", invalid, session))).status, 422)
  const reset = { revision: 2, command: { type: "reset" } }
  const result = await saveInventory(request("/api/inventory", "POST", reset, session))
  assert.equal(result.status, 200)
  const empty = await result.json()
  assert.deepEqual(empty.data.products, [])
  assert.equal(empty.hasCheckpoint, true)

  const previous = await getCheckpoint(request("/api/inventory/checkpoint", "GET", undefined, session))
  assert.equal(previous.status, 200)
  const backup = await previous.json()
  assert.equal(backup.data.sales[0].items[0].unitPrice, 13000)
  const restore = { revision: 3, command: { type: "restore", backup } }
  const restored = await saveInventory(request("/api/inventory", "POST", restore, session))
  assert.equal(restored.status, 200)
  assert.deepEqual((await restored.json()).data, backup.data)

  assert.equal((await signOut(request("/api/session", "DELETE", undefined, session))).status, 200)
  assert.equal((await getInventory(request("/api/inventory", "GET", undefined, session))).status, 401)

  await db.query("INSERT INTO inventory_login_limit (id, attempts, expires_at) VALUES (1, 15, now() + interval '1 minute')")
  assert.equal((await signIn(request("/api/session", "POST", { password: testOnlyPassword }))).status, 429)
  await db.query("DELETE FROM inventory_login_limit WHERE id = 1")
})
