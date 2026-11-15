import { randomUUID } from "node:crypto"
import { createDefaultData } from "./app-data"
import { parseBackup, type InventoryCommand } from "./inventory-schema"
import type { AppData, Movement, Product, Sale } from "./types"

export class InventoryError extends Error {}

function movement(product: Product, delta: number, timestamp: number, options: Pick<Movement, "reason" | "note" | "saleId">): Movement {
  return { id: randomUUID(), productId: product.id, productName: product.name, delta, timestamp, ...options }
}

function findActiveProduct(data: AppData, id: string): Product {
  const product = data.products.find(product => product.id === id && !product.archived)
  if (!product) throw new InventoryError("El producto ya no está disponible.")
  return product
}

function changeProduct(data: AppData, previous: Product, product: Product, timestamp: number, reason: string, note?: string): AppData {
  const delta = product.quantity - previous.quantity
  if (product.quantity < 0 || product.quantity > 1_000_000) {
    throw new InventoryError("La cantidad debe estar entre 0 y 1.000.000.")
  }
  return {
    ...data,
    products: data.products.map(item => item.id === product.id ? product : item),
    movements: delta ? [movement(product, delta, timestamp, { reason, note }), ...data.movements] : data.movements,
  }
}

function registerSale(data: AppData, command: Extract<InventoryCommand, { type: "addSale" }>, timestamp: number): AppData {
  const products = new Map(data.products.map(product => [product.id, product]))
  const deductions = new Map<string, number>()
  const items = command.items.map(item => {
    const product = products.get(item.productId)
    if (!product || product.archived) throw new InventoryError("Uno de los productos ya no está disponible.")
    if (item.quantity > product.quantity) throw new InventoryError(`Stock insuficiente de «${product.name}».`)
    deductions.set(product.id, item.quantity)
    return { ...item, productName: product.name, unitPrice: product.price }
  })
  const sale: Sale = {
    id: randomUUID(),
    customerName: command.customerName,
    items,
    timestamp,
    currency: data.settings.currency,
  }
  const movements = items.map(item => movement(products.get(item.productId)!, -item.quantity, timestamp, {
    reason: "Venta",
    note: command.customerName ? `Cliente: ${command.customerName}` : undefined,
    saleId: sale.id,
  }))
  return {
    ...data,
    sales: [sale, ...data.sales],
    products: data.products.map(product => {
      const sold = deductions.get(product.id)
      return sold ? { ...product, quantity: product.quantity - sold } : product
    }),
    movements: [...movements, ...data.movements],
  }
}

function voidSale(data: AppData, id: string, timestamp: number): AppData {
  const sale = data.sales.find(sale => sale.id === id)
  if (!sale || sale.voidedAt !== undefined) throw new InventoryError("La venta ya fue anulada o no existe.")

  const returns = new Map(sale.items.map(item => [item.productId, item.quantity]))
  const movements: Movement[] = []
  const products = data.products.map(product => {
    const quantity = returns.get(product.id)
    if (!quantity) return product
    if (product.quantity + quantity > 1_000_000) {
      throw new InventoryError(`La devolución supera el límite de stock de «${product.name}».`)
    }
    movements.push(movement(product, quantity, timestamp, { reason: "Anulación", saleId: id }))
    return { ...product, quantity: product.quantity + quantity }
  })

  return {
    ...data,
    products,
    movements: [...movements, ...data.movements],
    sales: data.sales.map(sale => sale.id === id ? { ...sale, voidedAt: timestamp } : sale),
  }
}

export function applyInventoryCommand(data: AppData, command: InventoryCommand, timestamp = Date.now()): AppData {
  switch (command.type) {
    case "addProduct": {
      const order = data.products.reduce((max, product) => Math.max(max, product.order), -1) + 1
      const product = { ...command.product, id: randomUUID(), order }
      return {
        ...data,
        products: [...data.products, product],
        movements: product.quantity > 0
          ? [movement(product, product.quantity, timestamp, { reason: "Producción", note: "Stock inicial" }), ...data.movements]
          : data.movements,
      }
    }
    case "updateProduct": {
      const previous = findActiveProduct(data, command.id)
      return changeProduct(data, previous, { ...previous, category: undefined, ...command.product }, timestamp, "Ajuste", "Edición de producto")
    }
    case "archiveProduct":
      return { ...data, products: data.products.map(product => product.id === command.id ? { ...product, archived: command.archived } : product) }
    case "reorderProduct": {
      const sorted = data.products.filter(product => !product.archived).sort((a, b) => a.order - b.order)
      const index = sorted.findIndex(product => product.id === command.id)
      const adjacent = sorted[index + (command.direction === "up" ? -1 : 1)]
      if (index < 0 || !adjacent) return data
      const current = sorted[index]
      return {
        ...data,
        products: data.products.map(product => {
          if (product.id === current.id) return { ...product, order: adjacent.order }
          if (product.id === adjacent.id) return { ...product, order: current.order }
          return product
        }),
      }
    }
    case "adjustQuantity": {
      const previous = findActiveProduct(data, command.id)
      const next = { ...previous, quantity: previous.quantity + command.delta }
      return changeProduct(data, previous, next, timestamp, command.delta > 0 ? "Producción" : "Ajuste")
    }
    case "setQuantity": {
      const previous = findActiveProduct(data, command.id)
      return changeProduct(data, previous, { ...previous, quantity: command.quantity }, timestamp, "Ajuste")
    }
    case "addSale":
      return registerSale(data, command, timestamp)
    case "voidSale":
      return voidSale(data, command.id, timestamp)
    case "addNote":
      return { ...data, notes: [{ id: randomUUID(), text: command.text, done: false, timestamp }, ...data.notes] }
    case "toggleNote":
      return { ...data, notes: data.notes.map(note => note.id === command.id ? { ...note, done: !note.done } : note) }
    case "deleteNote":
      return { ...data, notes: data.notes.filter(note => note.id !== command.id) }
    case "addCustomer":
      return { ...data, customers: [...data.customers, { ...command.customer, id: randomUUID() }] }
    case "updateCustomer":
      return { ...data, customers: data.customers.map(customer => customer.id === command.id ? { ...command.customer, id: command.id } : customer) }
    case "deleteCustomer":
      return { ...data, customers: data.customers.filter(customer => customer.id !== command.id) }
    case "updateSettings":
      return { ...data, settings: { ...data.settings, ...command.settings } }
    case "setTheme":
      return { ...data, theme: command.theme }
    case "clearMovements":
      return { ...data, movements: [] }
    case "reset":
      return createDefaultData()
    case "restore":
      try {
        return parseBackup(command.backup)
      } catch (error) {
        throw new InventoryError((error as Error).message)
      }
  }
}
