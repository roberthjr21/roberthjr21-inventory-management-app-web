import type { Sale } from "./types"

export function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("es-CO", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
}

export function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

export function isThisWeek(ts: number) {
  const now = new Date()
  const start = new Date(now)
  const day = (now.getDay() + 6) % 7 // Monday = 0
  start.setDate(now.getDate() - day)
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(start.getDate() + 7)
  return ts >= start.getTime() && ts < end.getTime()
}

export function dayKey(ts: number) {
  const d = new Date(ts)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}


export function formatAmount(amount: number, currency: string) {
  return `${currency}${amount.toLocaleString("es-CO")}`
}

export function saleTotal(sale: Sale): number | undefined {
  let total = 0
  for (const item of sale.items) {
    if (item.unitPrice === undefined) return undefined
    total += item.quantity * item.unitPrice
  }
  return total
}
