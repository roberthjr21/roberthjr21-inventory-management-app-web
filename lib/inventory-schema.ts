import { z } from "zod"
import type { AppData } from "./types"

// PostgreSQL JSONB rejects NUL and unpaired UTF-16 surrogates.
const databaseString = /^[^\u0000\uD800-\uDFFF]*$/u
const id = z.string().regex(databaseString).min(1).max(128)
const name = z.string().regex(databaseString).trim().min(1).max(160)
const currency = z.string().regex(databaseString).max(16)
const text = z.string().regex(databaseString).max(4000)
const quantity = z.number().int().min(0).max(1_000_000)
const positiveQuantity = quantity.min(1)
const price = z.number().int().min(0).max(1_000_000_000)
const timestamp = z.number().int().min(0).max(8_640_000_000_000_000)
const productFields = z.strictObject({
  name,
  quantity,
  price,
  color: z.enum(["amber", "rose", "green", "blue", "purple", "orange", "teal", "slate"]),
  category: z.string().regex(databaseString).max(160).optional(),
})
const customerFields = z.strictObject({
  name,
  phone: z.string().regex(databaseString).max(80).optional(),
  address: z.string().regex(databaseString).max(500).optional(),
  notes: text.optional(),
})
const settings = z.strictObject({
  businessName: z.string().regex(databaseString).max(160),
  currency,
  lowStockThreshold: quantity,
})
const saleRequestItem = z.strictObject({ productId: id, quantity: positiveQuantity })
const saleItem = saleRequestItem.extend({ productName: name, unitPrice: price.optional() })
const sortOrder = z.number().int().nonnegative()
const theme = z.enum(["light", "dark"])

function unique<T>(items: readonly T[], key: (item: T) => string) {
  return new Set(items.map(key)).size === items.length
}

const appData = z.strictObject({
  products: z.array(productFields.extend({ id, order: sortOrder, archived: z.boolean().optional() })),
  customers: z.array(customerFields.extend({ id })),
  movements: z.array(z.strictObject({
    id,
    productId: id,
    productName: name,
    delta: z.number().int().min(-1_000_000).max(1_000_000),
    reason: z.string().regex(databaseString).min(1).max(80),
    note: text.optional(),
    saleId: id.optional(),
    timestamp,
  })),
  notes: z.array(z.strictObject({ id, text, done: z.boolean(), timestamp })),
  sales: z.array(z.strictObject({
    id,
    customerName: z.string().regex(databaseString).max(160),
    items: z.array(saleItem).min(1).refine(items => unique(items, item => item.productId)),
    timestamp,
    currency: currency.optional(),
    voidedAt: timestamp.optional(),
  })),
  settings,
  theme,
}).refine(data => (
  unique(data.products, item => item.id) &&
  unique(data.customers, item => item.id) &&
  unique(data.movements, item => item.id) &&
  unique(data.notes, item => item.id) &&
  unique(data.sales, item => item.id)
), { message: "El respaldo contiene identificadores duplicados." })

const backup = z.strictObject({ version: z.literal(2), data: appData })

export function parseBackup(raw: unknown): AppData {
  const result = z.union([backup, appData]).safeParse(raw)
  if (!result.success) throw new Error("El archivo no contiene un respaldo válido del inventario.")
  const data = "version" in result.data ? result.data.data : result.data
  return {
    ...data,
    products: [...data.products].sort((a, b) => a.order - b.order).map((product, order) => ({ ...product, order })),
  }
}

export const inventoryCommand = z.discriminatedUnion("type", [
  z.strictObject({ type: z.literal("addProduct"), product: productFields }),
  z.strictObject({ type: z.literal("updateProduct"), id, product: productFields }),
  z.strictObject({ type: z.literal("archiveProduct"), id, archived: z.boolean() }),
  z.strictObject({ type: z.literal("reorderProduct"), id, direction: z.enum(["up", "down"]) }),
  z.strictObject({ type: z.literal("adjustQuantity"), id, delta: z.union([z.literal(-1), z.literal(1)]) }),
  z.strictObject({ type: z.literal("setQuantity"), id, quantity }),
  z.strictObject({ type: z.literal("addNote"), text: text.trim().min(1) }),
  z.strictObject({ type: z.literal("toggleNote"), id }),
  z.strictObject({ type: z.literal("deleteNote"), id }),
  z.strictObject({
    type: z.literal("addSale"),
    customerName: z.string().regex(databaseString).trim().max(160),
    items: z.array(saleRequestItem).min(1).max(1000).refine(items => unique(items, item => item.productId)),
  }),
  z.strictObject({ type: z.literal("voidSale"), id }),
  z.strictObject({ type: z.literal("addCustomer"), customer: customerFields }),
  z.strictObject({ type: z.literal("updateCustomer"), id, customer: customerFields }),
  z.strictObject({ type: z.literal("deleteCustomer"), id }),
  z.strictObject({ type: z.literal("updateSettings"), settings: settings.partial() }),
  z.strictObject({ type: z.literal("setTheme"), theme }),
  z.strictObject({ type: z.literal("clearMovements") }),
  z.strictObject({ type: z.literal("reset") }),
  z.strictObject({ type: z.literal("restore"), backup: z.unknown() }),
])

export type InventoryCommand = z.infer<typeof inventoryCommand>

export const inventoryRequest = z.strictObject({
  revision: z.number().int().nonnegative(),
  command: inventoryCommand,
})

export interface InventorySnapshot {
  data: AppData
  revision: number
  hasCheckpoint: boolean
}
