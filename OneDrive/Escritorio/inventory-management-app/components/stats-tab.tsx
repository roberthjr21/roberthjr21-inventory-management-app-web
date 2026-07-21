"use client"

import { useMemo } from "react"
import { useStore } from "@/lib/store"
import { isThisWeek } from "@/lib/format"
import { cn } from "@/lib/utils"
import { ArrowDownRight, ArrowUpRight, BarChart3, CalendarDays, Sun } from "lucide-react"

export function StatsTab() {
  const { data } = useStore()

  const lowStockThreshold = data.settings?.lowStockThreshold ?? 0

  const stats = useMemo(() => {
    const sales = data.movements.filter((m) => m.reason === "Venta" && m.delta < 0)

    const all = new Map<string, number>()
    let totalSales = 0
    let weekTotal = 0

    for (const m of sales) {
      const qty = Math.abs(m.delta)
      totalSales += qty
      all.set(m.productName, (all.get(m.productName) ?? 0) + qty)
      if (isThisWeek(m.timestamp)) {
        weekTotal += qty
      }
    }

    const allArr = Array.from(all.entries()).sort((a, b) => b[1] - a[1])
    const maxQty = allArr[0]?.[1] || 1

    return {
      allList: allArr,
      totalSales,
      weekTotal,
      best: allArr[0],
      worst: allArr.length > 1 ? allArr[allArr.length - 1] : undefined,
      hasData: allArr.length > 0,
      maxQty,
    }
  }, [data.movements])

  const lowStock = useMemo(
    () => data.products.filter((p) => p.quantity <= lowStockThreshold),
    [data.products, lowStockThreshold],
  )

  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Sun className="size-4" />
            <span className="text-xs font-medium">Ventas totales</span>
          </div>
          <p className="mt-2 text-3xl font-bold tabular-nums">{stats.totalSales}</p>
          <p className="text-xs text-muted-foreground">unidades vendidas</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarDays className="size-4" />
            <span className="text-xs font-medium">Esta semana</span>
          </div>
          <p className="mt-2 text-3xl font-bold tabular-nums">{stats.weekTotal}</p>
          <p className="text-xs text-muted-foreground">unidades vendidas</p>
        </div>
      </div>

      <section className="rounded-2xl border bg-card p-4">
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <BarChart3 className="size-4 text-primary" />
            <span>Ventas totales por producto</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {stats.allList.length} producto(s) vendidos
          </span>
        </div>

        {stats.allList.length === 0 ? (
          <p className="text-sm text-muted-foreground">No hay ventas registradas.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {stats.allList.map(([name, qty], index) => (
              <div key={name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="truncate pr-2">{name}</span>
                  <span className="font-semibold tabular-nums">{qty}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full ${
                      index === 0
                        ? "bg-primary"
                        : index === 1
                        ? "bg-emerald-500"
                        : "bg-slate-400"
                    }`}
                    style={{ width: `${(qty / stats.maxQty) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {stats.hasData && (
        <div className="grid grid-cols-1 gap-3">
          <div className="flex items-center gap-3 rounded-2xl border border-green-500/30 bg-green-500/10 p-4">
            <ArrowUpRight className="size-6 shrink-0 text-green-600 dark:text-green-400" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">Más vendido</p>
              <p className="truncate font-semibold">
                {stats.best?.[0]}{" "}
                <span className="text-muted-foreground">({stats.best?.[1]})</span>
              </p>
            </div>
          </div>
          {stats.worst && (
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
              <ArrowDownRight className="size-6 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-muted-foreground">Menos vendido</p>
                <p className="truncate font-semibold">
                  {stats.worst[0]}{" "}
                  <span className="text-muted-foreground">({stats.worst[1]})</span>
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <section className="rounded-2xl border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Inventario actual</h3>
        <div className="flex flex-col gap-2">
          {[...data.products]
            .sort((a, b) => a.order - b.order)
            .map((p) => {
              const isLow = p.quantity <= lowStockThreshold
              return (
                <div key={p.id} className="flex items-center justify-between text-sm">
                  <span className="truncate pr-2">{p.name}</span>
                  <span
                    className={cn(
                      "font-semibold tabular-nums",
                      isLow ? "text-destructive" : "text-foreground",
                    )}
                  >
                    {p.quantity}
                  </span>
                </div>
              )
            })}
        </div>
        {lowStock.length > 0 && (
          <p className="mt-3 text-xs text-destructive">
            {lowStock.length} producto(s) con inventario bajo.
          </p>
        )}
      </section>
    </div>
  )
}
