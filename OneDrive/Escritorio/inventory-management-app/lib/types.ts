export type ProductColor =
  | "amber"
  | "rose"
  | "green"
  | "blue"
  | "purple"
  | "orange"
  | "teal"
  | "slate"

export interface Product {
  id: string
  name: string
  quantity: number
  price: number
  color: ProductColor
  category?: string
  order: number
}

export type MovementReason =
  | "Producción"
  | "Venta"
  | "Ajuste"
  | "Pérdida"
  | "Otro"

export interface Movement {
  id: string
  productId: string
  productName: string
  delta: number
  reason: string
  note?: string
  timestamp: number
}

export interface Note {
  id: string
  text: string
  done: boolean
  timestamp: number
}

export interface SaleItem {
  productId: string
  productName: string
  quantity: number
}

export interface Sale {
  id: string
  customerName: string
  items: SaleItem[]
  timestamp: number
}

export interface Customer {
  id: string
  name: string
  phone?: string
  address?: string
  notes?: string
}

export interface Settings {
  businessName: string
  currency: string
  lowStockThreshold: number
}

export interface AppData {
  products: Product[]
  movements: Movement[]
  notes: Note[]
  sales: Sale[]
  customers: Customer[]
  settings: Settings
  theme: "light" | "dark"
}

export const PRODUCT_COLORS: { value: ProductColor; label: string; dot: string; chip: string }[] = [
  { value: "amber", label: "Ámbar", dot: "bg-amber-500", chip: "bg-amber-100 text-amber-900 dark:bg-amber-500/20 dark:text-amber-200" },
  { value: "orange", label: "Naranja", dot: "bg-orange-500", chip: "bg-orange-100 text-orange-900 dark:bg-orange-500/20 dark:text-orange-200" },
  { value: "rose", label: "Rojo", dot: "bg-rose-500", chip: "bg-rose-100 text-rose-900 dark:bg-rose-500/20 dark:text-rose-200" },
  { value: "green", label: "Verde", dot: "bg-green-600", chip: "bg-green-100 text-green-900 dark:bg-green-500/20 dark:text-green-200" },
  { value: "teal", label: "Turquesa", dot: "bg-teal-500", chip: "bg-teal-100 text-teal-900 dark:bg-teal-500/20 dark:text-teal-200" },
  { value: "blue", label: "Azul", dot: "bg-blue-500", chip: "bg-blue-100 text-blue-900 dark:bg-blue-500/20 dark:text-blue-200" },
  { value: "purple", label: "Morado", dot: "bg-purple-500", chip: "bg-purple-100 text-purple-900 dark:bg-purple-500/20 dark:text-purple-200" },
  { value: "slate", label: "Gris", dot: "bg-slate-500", chip: "bg-slate-100 text-slate-900 dark:bg-slate-500/20 dark:text-slate-200" },
]

export function colorMeta(color: ProductColor) {
  return PRODUCT_COLORS.find((c) => c.value === color) ?? PRODUCT_COLORS[0]
}
