"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useStore } from "@/lib/store"
import { colorMeta, type Product } from "@/lib/types"
import { cn } from "@/lib/utils"
import {
  ChevronDown,
  ChevronUp,
  Minus,
  Pencil,
  Plus,
  PlusCircle,
  Search,
  TriangleAlert,
} from "lucide-react"
import { ProductFormDialog } from "./product-form-dialog"

export function InventoryTab() {
  const { data, adjustQuantity, setQuantity, reorderProduct } = useStore()
  const [query, setQuery] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)
  const [reorderMode, setReorderMode] = useState(false)

  const threshold = data.settings.lowStockThreshold

  const sorted = useMemo(
    () => [...data.products].sort((a, b) => a.order - b.order),
    [data.products],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sorted
    return sorted.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.category?.toLowerCase().includes(q) ?? false),
    )
  }, [sorted, query])

  const lowStock = sorted.filter((p) => p.quantity <= threshold)

  const openNew = () => {
    setEditing(null)
    setDialogOpen(true)
  }

  const openEdit = (p: Product) => {
    setEditing(p)
    setDialogOpen(true)
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar producto..."
          className="h-12 rounded-2xl pl-10 text-base"
          aria-label="Buscar producto"
        />
      </div>

      {/* Low stock banner */}
      {lowStock.length > 0 && !query && (
        <div className="flex items-start gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" />
          <p>
            <span className="font-semibold">Inventario bajo:</span>{" "}
            {lowStock.map((p) => p.name).join(", ")}. Considera producir más.
          </p>
        </div>
      )}

      {/* Action row */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {filtered.length} {filtered.length === 1 ? "producto" : "productos"}
        </h2>
        <div className="flex gap-2">
          <Button
            variant={reorderMode ? "default" : "outline"}
            size="sm"
            className="rounded-full"
            onClick={() => setReorderMode((v) => !v)}
          >
            {reorderMode ? "Listo" : "Reordenar"}
          </Button>
        </div>
      </div>

      {/* Product list */}
      <div className="flex flex-col gap-3">
        {filtered.map((p, idx) => {
          const meta = colorMeta(p.color)
          const isLow = p.quantity <= threshold
          return (
            <div
              key={p.id}
              className={cn(
                "rounded-2xl border bg-card p-4 shadow-sm transition-colors",
                isLow ? "border-destructive/40" : "border-border",
              )}
            >
              <div className="flex items-center gap-3">
                <span className={cn("size-3 shrink-0 rounded-full", meta.dot)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-semibold leading-tight">{p.name}</h3>
                    {isLow && (
                      <span className="shrink-0 rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
                        Bajo
                      </span>
                    )}
                  </div>
                  {p.category && (
                    <p className="text-xs text-muted-foreground">{p.category}</p>
                  )}
                </div>
                {reorderMode ? (
                  <div className="flex flex-col">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      disabled={idx === 0}
                      onClick={() => reorderProduct(p.id, "up")}
                      aria-label="Subir"
                    >
                      <ChevronUp className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-7"
                      disabled={idx === filtered.length - 1}
                      onClick={() => reorderProduct(p.id, "down")}
                      aria-label="Bajar"
                    >
                      <ChevronDown className="size-4" />
                    </Button>
                  </div>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-muted-foreground"
                    onClick={() => openEdit(p)}
                    aria-label={`Editar ${p.name}`}
                  >
                    <Pencil className="size-4" />
                  </Button>
                )}
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  className="size-12 shrink-0 rounded-2xl"
                  onClick={() => adjustQuantity(p.id, -1, "Venta")}
                  disabled={p.quantity === 0}
                  aria-label={`Descontar ${p.name}`}
                >
                  <Minus className="size-6" />
                </Button>

                <input
                  type="text"
                  inputMode="numeric"
                  value={p.quantity}
                  onChange={(e) => {
                    const val = Number.parseInt(e.target.value.replace(/[^0-9]/g, ""), 10)
                    setQuantity(p.id, Number.isNaN(val) ? 0 : val)
                  }}
                  className={cn(
                    "w-full min-w-0 bg-transparent text-center text-4xl font-bold tabular-nums outline-none",
                    isLow ? "text-destructive" : "text-foreground",
                  )}
                  aria-label={`Cantidad de ${p.name}`}
                />

                <Button
                  size="icon"
                  className="size-12 shrink-0 rounded-2xl"
                  onClick={() => adjustQuantity(p.id, 1, "Producción")}
                  aria-label={`Agregar ${p.name}`}
                >
                  <Plus className="size-6" />
                </Button>
              </div>
            </div>
          )
        })}

        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed p-8 text-center text-muted-foreground">
            {query ? "No se encontró ese producto." : "Aún no tienes productos."}
          </div>
        )}
      </div>

      {/* New product */}
      <Button
        variant="outline"
        className="h-12 rounded-2xl border-dashed text-base"
        onClick={openNew}
      >
        <PlusCircle className="size-5" />
        Nuevo Producto
      </Button>

      <ProductFormDialog open={dialogOpen} onOpenChange={setDialogOpen} product={editing} />
    </div>
  )
}
