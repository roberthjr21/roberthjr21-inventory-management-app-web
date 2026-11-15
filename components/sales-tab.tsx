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
import { formatAmount, formatDate, formatTime, saleTotal } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Minus, Plus, Receipt, ShoppingCart, Trash2 } from "lucide-react"
import { toast } from "sonner"

export function SalesTab() {
  const { data, pending, send } = useStore()
  const currency = data.settings.currency
  const [open, setOpen] = useState(false)
  const [customerName, setCustomerName] = useState("")
  const [cart, setCart] = useState<Record<string, number>>({})

  const sortedProducts = useMemo(
    () => data.products.filter(p => !p.archived).sort((a, b) => a.order - b.order),
    [data.products],
  )

  const totalItems = Object.values(cart).reduce((a, b) => a + b, 0)

  const productMap = useMemo(() => new Map(sortedProducts.map((product) => [product.id, product])), [sortedProducts])

  const cartTotal = useMemo(() => {
    return Object.entries(cart).reduce((sum, [productId, quantity]) => {
      const p = productMap.get(productId)
      return sum + (p?.price ?? 0) * quantity
    }, 0)
  }, [cart, productMap])

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

  const handleSave = async () => {
    const items = Object.entries(cart).map(([productId, quantity]) => ({ productId, quantity }))
    const overstock = items.find(item => item.quantity > (productMap.get(item.productId)?.quantity ?? 0))
    if (overstock) {
      toast.error("Revisa el carrito. Uno de los productos ya no tiene suficiente stock.")
      return
    }
    if (await send({ type: "addSale", customerName, items })) {
      toast.success("Venta registrada e inventario actualizado")
      resetForm()
      setOpen(false)
    }
  }

  const activeSales = data.sales.filter(sale => sale.voidedAt === undefined)
  const totals = new Map<string, number>()
  let incompleteTotals = false
  for (const sale of activeSales) {
    const total = saleTotal(sale)
    if (total === undefined || sale.currency === undefined) {
      incompleteTotals = true
    } else {
      totals.set(sale.currency, (totals.get(sale.currency) ?? 0) + total)
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      <Button
        className="h-12 rounded-2xl text-base"
        disabled={pending}
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
        {data.sales.map(sale => {
          const total = saleTotal(sale)
          const voided = sale.voidedAt !== undefined
          return (
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
                {voided ? <span className="text-xs text-muted-foreground">Anulada</span> : <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 shrink-0 text-muted-foreground"
                  disabled={pending}
                  onClick={async () => {
                    const missing = sale.items.filter(item => !data.products.some(product => product.id === item.productId))
                    const message = missing.length
                      ? `¿Anular esta venta? Estos productos ya no están en el catálogo y no recibirán devoluciones: ${missing.map(item => item.productName).join(", ")}.`
                      : "¿Anular esta venta y devolver sus unidades al inventario?"
                    if (window.confirm(message)) {
                      if (await send({ type: "voidSale", id: sale.id })) toast.success("Venta anulada")
                    }
                  }}
                  aria-label="Anular venta"
                >
                  <Trash2 className="size-4" />
                </Button>}
              </div>
              <ul className="mt-2 flex flex-col gap-1">
                {sale.items.map((item) => {
                  const itemTotal = item.unitPrice === undefined ? undefined : item.unitPrice * item.quantity
                  return (
                    <li key={item.productId} className="flex justify-between text-sm">
                      <div className="min-w-0 flex-1">
                        <span className="text-muted-foreground">{item.productName}</span>
                        <span className="text-muted-foreground"> x{item.quantity}</span>
                      </div>
                      <span className="font-medium tabular-nums text-foreground">
                        {itemTotal === undefined ? "Sin precio histórico" : formatAmount(itemTotal, sale.currency ?? "")}
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
                      {total === undefined ? "Sin importe histórico" : formatAmount(total, sale.currency ?? "")}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {activeSales.length > 0 && (
        <section className="rounded-2xl border bg-card px-4 py-4">
          <h2 className="font-bold">Total de ventas vigentes</h2>
          {Array.from(totals, ([symbol, amount]) => (
            <p key={symbol} className="text-xl font-bold tabular-nums text-primary">{formatAmount(amount, symbol)}</p>
          ))}
          {incompleteTotals && (
            <p className="text-sm text-muted-foreground">Hay ventas anteriores sin importe o moneda registrados.</p>
          )}
        </section>
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
              maxLength={160}
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
                const qty = Object.hasOwn(cart, p.id) ? cart[p.id] : 0
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
                        {formatAmount(p.price, currency)} · Disponible: {p.quantity}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-8 shrink-0 rounded-lg"
                      onClick={() => setQty(p.id, qty - 1)}
                      disabled={qty === 0}
                      aria-label={`Restar ${p.name}`}
                    >
                      <Minus className="size-4" />
                    </Button>
                    <span className="w-6 text-center font-semibold tabular-nums">{qty}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="size-8 shrink-0 rounded-lg"
                      onClick={() => setQty(p.id, qty + 1)}
                      disabled={qty >= p.quantity}
                      aria-label={`Sumar ${p.name}`}
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
                  {formatAmount(cartTotal, currency)}
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
            <Button type="button" onClick={handleSave} disabled={pending || totalItems === 0}>
              Registrar{totalItems > 0 ? ` (${totalItems})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
