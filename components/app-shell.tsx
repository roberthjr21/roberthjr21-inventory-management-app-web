"use client"

import { useState } from "react"
import { useStore } from "@/lib/store"
import { cn } from "@/lib/utils"
import {
  ArrowLeft,
  BarChart3,
  Home,
  LayoutGrid,
  Moon,
  NotebookPen,
  ShoppingCart,
  Sun,
} from "lucide-react"
import { InventoryTab } from "./inventory-tab"
import { SalesTab } from "./sales-tab"
import { StatsTab } from "./stats-tab"
import { NotesTab } from "./notes-tab"
import { MoreTab } from "./more-tab"
import { MovementsTab } from "./movements-tab"
import { CustomersTab } from "./customers-tab"
import { SettingsTab } from "./settings-tab"
import { Clock } from "./clock"
import { Login } from "./login"
import { Button } from "./ui/button"

export type View =
  | "inicio"
  | "ventas"
  | "stats"
  | "notas"
  | "mas"
  | "movimientos"
  | "clientes"
  | "config"

const titles: Record<View, string> = {
  inicio: "Inventario",
  ventas: "Ventas",
  stats: "Estadísticas",
  notas: "Bloc de notas",
  mas: "Más opciones",
  movimientos: "Movimientos",
  clientes: "Clientes",
  config: "Configuración",
}

const navItems: { view: View; label: string; icon: typeof Home }[] = [
  { view: "inicio", label: "Inicio", icon: Home },
  { view: "ventas", label: "Ventas", icon: ShoppingCart },
  { view: "stats", label: "Stats", icon: BarChart3 },
  { view: "notas", label: "Notas", icon: NotebookPen },
  { view: "mas", label: "Más", icon: LayoutGrid },
]

const subViews: View[] = ["movimientos", "clientes", "config"]

export function AppShell() {
  const { data, connection, pending, send, reload } = useStore()
  const [view, setView] = useState<View>("inicio")

  const isSub = subViews.includes(view)
  const activeNav: View = isSub ? "mas" : view

  if (connection === "signedOut") return <Login />

  if (connection === "unavailable") {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
        <p role="alert">El inventario no está disponible en este momento.</p>
        <Button onClick={reload}>Volver a intentar</Button>
      </main>
    )
  }

  if (connection === "loading") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Cargando inventario...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background">
      {/* Header */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/90 backdrop-blur">
        <div className="flex items-center gap-2 px-4 py-3">
          {isSub && (
            <button
              type="button"
              onClick={() => setView("mas")}
              aria-label="Volver"
              className="-ml-1 flex size-9 items-center justify-center rounded-full text-foreground hover:bg-accent"
            >
              <ArrowLeft className="size-5" />
            </button>
          )}
          <div className="min-w-0 flex-1">
            {view === "inicio" ? (
              <>
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-xs text-muted-foreground">
                    {data.settings.businessName}
                  </p>
                  <Clock />
                </div>
                <h1 className="text-lg font-bold leading-tight">Inventario</h1>
              </>
            ) : (
              <h1 className="truncate text-lg font-bold leading-tight">{titles[view]}</h1>
            )}
          </div>
          <button
            type="button"
            onClick={() => send({ type: "setTheme", theme: data.theme === "dark" ? "light" : "dark" })}
            disabled={pending}
            aria-label="Cambiar modo claro/oscuro"
            className="flex size-9 items-center justify-center rounded-full text-foreground hover:bg-accent"
          >
            {data.theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 pt-4">
        {view === "inicio" && <InventoryTab />}
        {view === "ventas" && <SalesTab />}
        {view === "stats" && <StatsTab />}
        {view === "notas" && <NotesTab />}
        {view === "mas" && <MoreTab onNavigate={setView} />}
        {view === "movimientos" && <MovementsTab />}
        {view === "clientes" && <CustomersTab />}
        {view === "config" && <SettingsTab />}
      </main>

      {/* Bottom navigation */}
      <nav className="sticky bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto grid max-w-md grid-cols-5">
          {navItems.map((item) => {
            const active = activeNav === item.view
            return (
              <button
                key={item.view}
                type="button"
                onClick={() => setView(item.view)}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-xs transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
                aria-current={active ? "page" : undefined}
              >
                <item.icon className={cn("size-6", active && "fill-primary/15")} />
                <span className={cn(active && "font-semibold")}>{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
