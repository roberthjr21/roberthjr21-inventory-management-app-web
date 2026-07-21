"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import type {
  AppData,
  Customer,
  Movement,
  Note,
  Product,
  ProductColor,
  Sale,
  SaleItem,
  Settings,
} from "./types"

const STORAGE_KEY = "inventario-deditos-v1"

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36)
}

const defaultData: AppData = {
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
  customers: [],
  settings: {
    businessName: "Mi Negocio",
    currency: "$",
    lowStockThreshold: 3,
  },
  theme: "light",
}

interface StoreContextValue {
  data: AppData
  ready: boolean
  // products
  addProduct: (p: { name: string; quantity: number; price: number; color: ProductColor; category?: string }) => void
  updateProduct: (id: string, patch: Partial<Product>) => void
  deleteProduct: (id: string) => void
  reorderProduct: (id: string, direction: "up" | "down") => void
  adjustQuantity: (id: string, delta: number, reason: string, note?: string) => void
  setQuantity: (id: string, value: number, reason?: string) => void
  // notes
  addNote: (text: string) => void
  toggleNote: (id: string) => void
  updateNote: (id: string, text: string) => void
  deleteNote: (id: string) => void
  // sales
  addSale: (customerName: string, items: SaleItem[]) => void
  deleteSale: (id: string) => void
  // customers
  addCustomer: (c: Omit<Customer, "id">) => void
  updateCustomer: (id: string, patch: Partial<Customer>) => void
  deleteCustomer: (id: string) => void
  // settings & theme
  updateSettings: (patch: Partial<Settings>) => void
  toggleTheme: () => void
  // movements
  clearMovements: () => void
}

const StoreContext = createContext<StoreContextValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(defaultData)
  const [ready, setReady] = useState(false)
  const firstLoad = useRef(true)

  // load
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as AppData
        setData({ ...defaultData, ...parsed, settings: { ...defaultData.settings, ...parsed.settings } })
      }
    } catch {
      // ignore corrupt data
    }
    setReady(true)
  }, [])

  // persist
  useEffect(() => {
    if (firstLoad.current) {
      firstLoad.current = false
      return
    }
    if (!ready) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // ignore quota errors
    }
  }, [data, ready])

  // apply theme class
  useEffect(() => {
    const root = document.documentElement
    if (data.theme === "dark") {
      root.classList.add("dark")
      root.classList.remove("light")
    } else {
      root.classList.add("light")
      root.classList.remove("dark")
    }
  }, [data.theme])

  const value = useMemo<StoreContextValue>(() => {
    const recordMovement = (m: Omit<Movement, "id" | "timestamp">) => {
      const movement: Movement = { ...m, id: uid(), timestamp: Date.now() }
      setData((d) => ({ ...d, movements: [movement, ...d.movements].slice(0, 500) }))
    }

    return {
      data,
      ready,
      addProduct: ({ name, quantity, price, color, category }) =>
        setData((d) => ({
          ...d,
          products: [
            ...d.products,
            { id: uid(), name, quantity, price, color, category, order: d.products.length },
          ],
        })),
      updateProduct: (id, patch) =>
        setData((d) => ({
          ...d,
          products: d.products.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        })),
      deleteProduct: (id) =>
        setData((d) => ({ ...d, products: d.products.filter((p) => p.id !== id) })),
      reorderProduct: (id, direction) =>
        setData((d) => {
          const sorted = [...d.products].sort((a, b) => a.order - b.order)
          const idx = sorted.findIndex((p) => p.id === id)
          if (idx === -1) return d
          const swapWith = direction === "up" ? idx - 1 : idx + 1
          if (swapWith < 0 || swapWith >= sorted.length) return d
          const a = sorted[idx]
          const b = sorted[swapWith]
          const aOrder = a.order
          a.order = b.order
          b.order = aOrder
          return { ...d, products: [...sorted] }
        }),
      adjustQuantity: (id, delta, reason, note) => {
        const product = data.products.find((p) => p.id === id)
        if (!product) return
        setData((d) => ({
          ...d,
          products: d.products.map((p) =>
            p.id === id ? { ...p, quantity: Math.max(0, p.quantity + delta) } : p,
          ),
        }))
        recordMovement({ productId: id, productName: product.name, delta, reason, note })
      },
      setQuantity: (id, value, reason = "Ajuste") =>
        setData((d) => {
          const product = d.products.find((p) => p.id === id)
          if (!product) return d
          const newVal = Math.max(0, value)
          const delta = newVal - product.quantity
          const movements =
            delta !== 0
              ? [
                  {
                    id: uid(),
                    productId: id,
                    productName: product.name,
                    delta,
                    reason,
                    timestamp: Date.now(),
                  } as Movement,
                  ...d.movements,
                ].slice(0, 500)
              : d.movements
          return {
            ...d,
            products: d.products.map((p) => (p.id === id ? { ...p, quantity: newVal } : p)),
            movements,
          }
        }),
      addNote: (text) =>
        setData((d) => ({
          ...d,
          notes: [{ id: uid(), text, done: false, timestamp: Date.now() }, ...d.notes],
        })),
      toggleNote: (id) =>
        setData((d) => ({
          ...d,
          notes: d.notes.map((n) => (n.id === id ? { ...n, done: !n.done } : n)),
        })),
      updateNote: (id, text) =>
        setData((d) => ({
          ...d,
          notes: d.notes.map((n) => (n.id === id ? { ...n, text } : n)),
        })),
      deleteNote: (id) =>
        setData((d) => ({ ...d, notes: d.notes.filter((n) => n.id !== id) })),
      addSale: (customerName, items) => {
        const sale: Sale = { id: uid(), customerName, items, timestamp: Date.now() }
        setData((d) => {
          const products = d.products.map((p) => {
            const item = items.find((i) => i.productId === p.id)
            return item ? { ...p, quantity: Math.max(0, p.quantity - item.quantity) } : p
          })
          const movements = items.map(
            (i) =>
              ({
                id: uid(),
                productId: i.productId,
                productName: i.productName,
                delta: -i.quantity,
                reason: "Venta",
                note: customerName ? `Cliente: ${customerName}` : undefined,
                timestamp: Date.now(),
              }) as Movement,
          )
          return {
            ...d,
            sales: [sale, ...d.sales],
            products,
            movements: [...movements, ...d.movements].slice(0, 500),
          }
        })
      },
      deleteSale: (id) =>
        setData((d) => ({ ...d, sales: d.sales.filter((s) => s.id !== id) })),
      addCustomer: (c) =>
        setData((d) => ({ ...d, customers: [...d.customers, { ...c, id: uid() }] })),
      updateCustomer: (id, patch) =>
        setData((d) => ({
          ...d,
          customers: d.customers.map((c) => (c.id === id ? { ...c, ...patch } : c)),
        })),
      deleteCustomer: (id) =>
        setData((d) => ({ ...d, customers: d.customers.filter((c) => c.id !== id) })),
      updateSettings: (patch) =>
        setData((d) => ({ ...d, settings: { ...d.settings, ...patch } })),
      toggleTheme: () =>
        setData((d) => ({ ...d, theme: d.theme === "dark" ? "light" : "dark" })),
      clearMovements: () => setData((d) => ({ ...d, movements: [] })),
    }
  }, [data, ready])

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>
}

export function useStore() {
  const ctx = useContext(StoreContext)
  if (!ctx) throw new Error("useStore must be used within StoreProvider")
  return ctx
}
