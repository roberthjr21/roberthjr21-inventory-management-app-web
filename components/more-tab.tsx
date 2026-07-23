"use client"

import { useStore } from "@/lib/store"
import { ChevronRight, History, Settings, Users } from "lucide-react"
import type { View } from "./app-shell"

const items: { view: View; label: string; description: string; icon: typeof History }[] = [
  { view: "movimientos", label: "Movimientos", description: "Historial de entradas y salidas", icon: History },
  { view: "clientes", label: "Clientes frecuentes", description: "Guarda tus clientes y notas", icon: Users },
  { view: "config", label: "Configuración", description: "Negocio, modo oscuro y respaldo", icon: Settings },
]

export function MoreTab({ onNavigate }: { onNavigate: (view: View) => void }) {
  const { data } = useStore()

  return (
    <div className="flex flex-col gap-3 px-4 pb-4">
      <div className="overflow-hidden rounded-2xl border bg-card">
        {items.map((item, i) => (
          <button
            key={item.view}
            type="button"
            onClick={() => onNavigate(item.view)}
            className={`flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-accent/40 ${
              i > 0 ? "border-t border-border" : ""
            }`}
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <item.icon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-medium leading-tight">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
            <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>

      <p className="text-center text-xs text-muted-foreground">
        {data.products.length} productos · {data.sales.length} ventas ·{" "}
        {data.customers.length} clientes
      </p>
    </div>
  )
}
