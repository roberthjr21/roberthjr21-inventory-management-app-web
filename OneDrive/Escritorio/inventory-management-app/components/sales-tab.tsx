"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useStore } from "@/lib/store"
import { formatDate, formatTime } from "@/lib/format"
import type { SaleItem } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Minus, Plus, Receipt, ShoppingCart, Trash2 } from "lucide-react"
import { toast } from "sonner"

export function SalesTab() {
  const { data, addSale, deleteSale } = useStore()
  const [open, setOpen] = useState(false)
  const [customerName, setCustomerName] = useState("")
  const [cart, setCart] = useState<Record<string, number>>({})

  const sortedProducts = useMemo(
    () => [...data.products].sort((a, b) => a.order - b.order),
    [data.products],
  )

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0)

  const cartTotal = useMemo(() => {
    return Object.entries(cart).reduce((sum, [productId, quantity]) => {
      const p = data.products.find((x) => x.id === productId)
      return sum + (p?.price ?? 0) * quantity
    }, 0)
  }, [cart, data.products])

  const setQty = (id: string, qty: number) => {
    setCart((c) => {
      const next = { ...c }
      if (qty <= 0) delete next[id]
      else next[id] = qty
      return next
    })
  }

  const resetForm = () => {
    setCustomerName("")
    setCart({})
  }

  const handleSave = () => {
    const items: SaleItem[] = Object.entries(cart).map(([productId, quantity]) => {
      const p = data.products.find((x) => x.id === productId)
      return { productId, productName: p?.name ?? "", quantity }
    })
    if (items.length === 0) {
      toast.error("Agrega al menos un producto a la venta")
      return
    }
    const overstock = items.find((item) => {
      const p = data.products.find((x) => x.id === item.productId)
      return !p || item.quantity > p.quantity
    })
    if (overstock) {
      toast.error(`No hay suficiente stock de "${overstock.productName}"`)
      return
    }
    addSale(customerName.trim(), items)
    toast.success("Venta registrada e inventario actualizado")
    resetForm()
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      <Button
        className="h-12 rounded-2xl text-base"
        onClick={() => {
          resetForm()
          setOpen(true)
        }}
      >
        <ShoppingCart className="size-5" />
        Registrar venta
      </Button>

      <h2 className="text-sm font-medium text-muted-foreground">Ventas recientes</h2>

      {data.sales.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
          <Receipt className="size-8 opacity-50" />
          <p>Aún no hay ventas registradas.</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {data.sales.map((sale) => (
          <div key={sale.id} className="rounded-2xl border bg-card p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold leading-tight">
                  {sale.customerName || "Cliente sin nombre"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(sale.timestamp)} · {formatTime(sale.timestamp)}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="size-8 shrink-0 text-muted-foreground"
                onClick={() => deleteSale(sale.id)}
                aria-label="Eliminar venta"
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
            <ul className="mt-2 flex flex-col gap-1">
              {sale.items.map((item) => {
                const p = data.products.find((x) => x.id === item.productId)
                const itemTotal = (p?.price ?? 0) * item.quantity
                return (
                  <li key={item.productId} className="flex justify-between text-sm">
                    <div className="min-w-0 flex-1">
                      <span className="text-muted-foreground">{item.productName}</span>
                      <span className="text-muted-foreground"> x{item.quantity}</span>
                    </div>
                    <span className="font-medium tabular-nums text-foreground">
                      ${itemTotal.toLocaleString()}
                    </span>
                  </li>
                )
              })}
            </ul>
            {sale.items.length > 0 && (
              <div className="mt-3 border-t pt-2">
                <div className="flex justify-between text-sm font-semibold">
                  <span>Total:</span>
                  <span className="tabular-nums">
                    ${sale.items
                      .reduce((sum, item) => {
                        const p = data.products.find((x) => x.id === item.productId)
                        return sum + (p?.price ?? 0) * item.quantity
                      }, 0)
                      .toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {data.sales.length > 0 && (
        <div className="mt-4 flex items-center justify-between border-t-2 border-border bg-card px-4 py-4 rounded-2xl">
          <span className="text-base font-bold">Total general:</span>
          <span className="text-2xl font-bold tabular-nums text-primary">
            ${data.sales
              .reduce((sum, sale) => {
                return sum + sale.items.reduce((saleSum, item) => {
                  const p = data.products.find((x) => x.id === item.productId)
                  return saleSum + (p?.price ?? 0) * item.quantity
                }, 0)
              }, 0)
              .toLocaleString()}
          </span>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[90vh] max-w-md flex-col rounded-2xl">
          <DialogHeader>
            <DialogTitle>Nueva venta</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="sale-customer">Cliente (opcional)</Label>
            <Input
              id="sale-customer"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Ej. María"
              list="customers-list"
            />
            <datalist id="customers-list">
              {data.customers.map((c) => (
                <option key={c.id} value={c.name} />
              ))}
            </datalist>
          </div>

          <div className="-mx-1 flex-1 overflow-y-auto px-1">
            <Label className="mb-2 block">Productos</Label>
            <div className="flex flex-col gap-2">
              {sortedProducts.map((p) => {
                const qty = cart[p.id] ?? 0
                return (
                  <div
                    key={p.id}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border p-2",
                      qty > 0 ? "border-primary/50 bg-primary/5" : "border-border",
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium leading-tight">{p.name}</p>
                      <p className="text-xs text-muted-foreground">
                        ${(p.price || 0).toLocaleString()} · Disponible: {p.quantity}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8 shrink-0 rounded-lg"
                      onClick={() => setQty(p.id, qty - 1)}
                      disabled={qty === 0}
                      aria-label="Restar"
                    >
                      <Minus className="size-4" />
                    </Button>
                    <span className="w-6 text-center font-semibold tabular-nums">{qty}</span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-8 shrink-0 rounded-lg"
                      onClick={() => setQty(p.id, qty + 1)}
                      disabled={qty >= p.quantity}
                      aria-label="Sumar"
                    >
                      <Plus className="size-4" />
                    </Button>
                  </div>
                )
              })}
            </div>
          </div>

          {totalItems > 0 && (
            <div className="flex items-center justify-between border-t bg-muted/30 px-4 py-3 -mx-6 -mb-6 rounded-b-2xl">
              <div>
                <p className="text-xs text-muted-foreground">Total de la venta</p>
                <p className="text-2xl font-bold tabular-nums">
                  ${cartTotal.toLocaleString()}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">{totalItems} productos</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Registrar{totalItems > 0 ? ` (${totalItems})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
