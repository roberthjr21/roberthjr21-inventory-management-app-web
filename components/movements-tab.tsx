"use client"

import { useMemo } from "react"
import { Button } from "@/components/ui/button"
import { useStore } from "@/lib/store"
import { dayKey, formatDate, formatTime } from "@/lib/format"
import type { Movement } from "@/lib/types"
import { cn } from "@/lib/utils"
import { History, Trash2 } from "lucide-react"

export function MovementsTab() {
  const { data, pending, send } = useStore()

  const groups = useMemo(() => {
    const map = new Map<string, { label: string; ts: number; items: Movement[] }>()
    for (const m of data.movements) {
      const key = dayKey(m.timestamp)
      if (!map.has(key)) {
        map.set(key, { label: formatDate(m.timestamp), ts: m.timestamp, items: [] })
      }
      map.get(key)!.items.push(m)
    }
    return Array.from(map.values()).sort((a, b) => b.ts - a.ts)
  }, [data.movements])

  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          Historial de movimientos
        </h2>
        {data.movements.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            disabled={pending}
            onClick={() => {
              if (confirm("¿Borrar todo el historial de movimientos? Se guardará una copia anterior.")) {
                void send({ type: "clearMovements" })
              }
            }}
          >
            <Trash2 className="size-4" />
            Limpiar
          </Button>
        )}
      </div>

      {groups.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
          <History className="size-8 opacity-50" />
          <p>Aún no hay movimientos.</p>
          <p className="text-sm">Cada cambio de inventario se registrará aquí.</p>
        </div>
      )}

      {groups.map((group) => (
        <div key={group.label} className="flex flex-col gap-2">
          <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {group.label}
          </h3>
          <div className="overflow-hidden rounded-2xl border bg-card">
            {group.items.map((m, i) => (
              <div
                key={m.id}
                className={cn(
                  "flex items-center gap-3 p-3",
                  i > 0 && "border-t border-border",
                )}
              >
                <span
                  className={cn(
                    "flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold tabular-nums",
                    m.delta >= 0
                      ? "bg-green-100 text-green-800 dark:bg-green-500/20 dark:text-green-300"
                      : "bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-300",
                  )}
                >
                  {m.delta > 0 ? `+${m.delta}` : m.delta}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium leading-tight">{m.productName}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.reason}
                    {m.note ? ` · ${m.note}` : ""}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatTime(m.timestamp)}
                </span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
