import type { AppData } from "./types"

export const STORAGE_KEY = "inventario-deditos-v1"
export const MAX_BACKUP_BYTES = 4 * 1024 * 1024

export function createDefaultData(): AppData {
  return {
    products: [],
    movements: [],
    notes: [],
    sales: [],
    customers: [],
    settings: { businessName: "Mi Negocio", currency: "$", lowStockThreshold: 3 },
    theme: "light",
  }
}
