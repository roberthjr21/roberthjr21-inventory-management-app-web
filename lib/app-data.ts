import type { AppData, Customer, Note, Product, ProductColor } from "./types"

export const STORAGE_KEY = "inventario-deditos-v1"

export function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

export function createDefaultData(): AppData {
  return {
    products: [
      { id: uid(), name: "Bandejas de Deditos", quantity: 5, price: 0, color: "amber", order: 0 },
      { id: uid(), name: "Bandejas de Bocadillo", quantity: 6, price: 0, color: "rose", order: 1 },
      { id: uid(), name: "Empanadas de Carne", quantity: 8, price: 0, color: "orange", order: 2 },
      { id: uid(), name: "Empanadas de Pollo", quantity: 4, price: 0, color: "green", order: 3 },
      { id: uid(), name: "Bandejas Mixtas", quantity: 2, price: 0, color: "teal", order: 4 },
    ],
    movements: [],
    notes: [
      { id: uid(), text: "Comprar queso y harina", done: false, timestamp: Date.now() },
    ],
    sales: [],
    customers: [{ id: uid(), name: "María", notes: "Cliente de ejemplo" }],
    settings: {
      businessName: "Mi Negocio",
      currency: "$",
      lowStockThreshold: 3,
    },
    theme: "light",
  }
}

export function normalizeData(raw: Partial<AppData> | null | undefined): AppData {
  const base = createDefaultData()
  const parsed = (raw ?? {}) as Partial<AppData>

  const normalizedProducts = Array.isArray(parsed.products)
    ? parsed.products
        .filter((p): p is Product => Boolean(p && typeof p === "object" && typeof p.name === "string"))
        .map((p, index) => ({
          ...p,
          id: typeof p.id === "string" && p.id ? p.id : uid(),
          name: p.name,
          quantity: Number.isFinite(p.quantity) ? Math.max(0, p.quantity) : 0,
          price: Number.isFinite(p.price) ? p.price : 0,
          color: (p.color as ProductColor) || "amber",
          order: typeof p.order === "number" ? p.order : index,
        }))
    : base.products

  const normalizedNotes = Array.isArray(parsed.notes)
    ? parsed.notes
        .filter((n): n is Note => Boolean(n && typeof n === "object" && typeof n.text === "string"))
        .map((n) => ({
          ...n,
          id: typeof n.id === "string" && n.id ? n.id : uid(),
          text: n.text,
          done: Boolean(n.done),
          timestamp: typeof n.timestamp === "number" ? n.timestamp : Date.now(),
        }))
    : base.notes

  const normalizedCustomers = Array.isArray(parsed.customers)
    ? parsed.customers
        .filter((c): c is Customer => Boolean(c && typeof c === "object" && typeof c.name === "string"))
        .map((c) => ({
          ...c,
          id: typeof c.id === "string" && c.id ? c.id : uid(),
          name: c.name,
          phone: typeof c.phone === "string" ? c.phone : undefined,
          address: typeof c.address === "string" ? c.address : undefined,
          notes: typeof c.notes === "string" ? c.notes : undefined,
        }))
    : base.customers

  return {
    products: normalizedProducts.length > 0 ? normalizedProducts : base.products,
    movements: Array.isArray(parsed.movements) ? parsed.movements : base.movements,
    notes: normalizedNotes.length > 0 ? normalizedNotes : base.notes,
    sales: Array.isArray(parsed.sales) ? parsed.sales : base.sales,
    customers: normalizedCustomers.length > 0 ? normalizedCustomers : base.customers,
    settings: {
      businessName: parsed.settings?.businessName ?? base.settings.businessName,
      currency: parsed.settings?.currency ?? base.settings.currency,
      lowStockThreshold:
        typeof parsed.settings?.lowStockThreshold === "number"
          ? parsed.settings.lowStockThreshold
          : base.settings.lowStockThreshold,
    },
    theme: parsed.theme === "dark" ? "dark" : "light",
  }
}
