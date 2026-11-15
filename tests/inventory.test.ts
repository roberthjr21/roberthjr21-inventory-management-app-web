import assert from "node:assert/strict"
import { test } from "node:test"
import { createDefaultData } from "../lib/app-data"
import { saleTotal } from "../lib/format"
import { applyInventoryCommand } from "../lib/inventory-operations"
import { inventoryRequest, parseBackup } from "../lib/inventory-schema"

function stockedInventory() {
  return applyInventoryCommand(createDefaultData(), {
    type: "addProduct",
    product: { name: "Bandejas de Deditos", quantity: 5, price: 13000, color: "amber" },
  })
}

test("the sale keeps its price and currency after edits, then voiding restores archived stock once", () => {
  const data = stockedInventory()
  const [product] = data.products
  const sold = applyInventoryCommand(data, {
    type: "addSale",
    customerName: "Cliente",
    items: [{ productId: product.id, quantity: 2 }],
  })
  assert.equal(sold.products[0].quantity, 3)
  assert.equal(sold.movements[0].saleId, sold.sales[0].id)

  const repriced = applyInventoryCommand(sold, {
    type: "updateProduct",
    id: product.id,
    product: { name: product.name, quantity: 3, price: 15000, color: "amber" },
  })
  const newCurrency = applyInventoryCommand(repriced, { type: "updateSettings", settings: { currency: "COP " } })
  const archived = applyInventoryCommand(newCurrency, { type: "archiveProduct", id: product.id, archived: true })
  assert.equal(saleTotal(archived.sales[0]), 26000)
  assert.equal(archived.sales[0].currency, "$")

  const command = { type: "voidSale" as const, id: sold.sales[0].id }
  const voided = applyInventoryCommand(archived, command)
  assert.equal(voided.products[0].quantity, 5)
  assert.equal(voided.products[0].archived, true)
  assert.ok(voided.sales[0].voidedAt)
  assert.equal(voided.movements[0].reason, "Anulación")
  assert.throws(() => applyInventoryCommand(voided, command), /ya fue anulada/)
})

test("overstock and ambiguous sale requests are rejected without mutating data", () => {
  const initial = stockedInventory()
  const item = { productId: initial.products[0].id, quantity: 6 }
  const sale = { type: "addSale" as const, customerName: "", items: [item] }
  assert.throws(() => applyInventoryCommand(initial, sale), /Stock insuficiente/)
  assert.equal(initial.products[0].quantity, 5)
  assert.equal(initial.sales.length, 0)
  assert.equal(inventoryRequest.safeParse({ revision: 0, command: { ...sale, items: [item, item] } }).success, false)
  assert.equal(inventoryRequest.safeParse({ revision: 0, command: { ...sale, items: [{ ...item, unitPrice: 1 }] } }).success, false)
})

test("backups preserve empty collections and accept legacy sales with an unknown price", () => {
  const empty = createDefaultData()
  assert.deepEqual(parseBackup({ version: 2, data: empty }), empty)
  assert.deepEqual(parseBackup(empty), empty)
  assert.throws(() => parseBackup({ exportado: true }), /respaldo válido/)
  assert.throws(() => parseBackup({ ...empty, sales: [null] }), /respaldo válido/)
  const legacy = {
    ...empty,
    sales: [{
      id: "old-sale", customerName: "", timestamp: 1,
      items: [{ productId: "old-product", productName: "Bandeja", quantity: 1 }],
    }],
  }
  assert.equal(saleTotal(parseBackup(legacy).sales[0]), undefined)
})

test("clearing movements preserves sales and quantity changes log the amount applied", () => {
  const initial = stockedInventory()
  const id = initial.products[0].id
  const reduced = applyInventoryCommand(initial, { type: "adjustQuantity", id, delta: -1 })
  assert.equal(reduced.movements[0].delta, -1)
  assert.equal(reduced.movements[0].reason, "Ajuste")
  const sold = applyInventoryCommand(reduced, { type: "addSale", customerName: "", items: [{ productId: id, quantity: 4 }] })
  assert.throws(() => applyInventoryCommand(sold, { type: "adjustQuantity", id, delta: -1 }), /cantidad/)
  const cleared = applyInventoryCommand(sold, { type: "clearMovements" })
  assert.equal(cleared.movements.length, 0)
  assert.deepEqual(cleared.sales, sold.sales)
})
