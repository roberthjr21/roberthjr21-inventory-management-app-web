"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useStore } from "@/lib/store"
import { PRODUCT_COLORS, type Product, type ProductColor } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Trash2 } from "lucide-react"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  product?: Product | null
}

export function ProductFormDialog({ open, onOpenChange, product }: Props) {
  const { addProduct, updateProduct, deleteProduct } = useStore()
  const [name, setName] = useState("")
  const [quantity, setQuantity] = useState("0")
  const [price, setPrice] = useState("0")
  const [color, setColor] = useState<ProductColor>("amber")
  const [category, setCategory] = useState("")

  const editing = Boolean(product)

  useEffect(() => {
    if (open) {
      setName(product?.name ?? "")
      setQuantity(String(product?.quantity ?? 0))
      setPrice(String(product?.price ?? 0))
      setColor(product?.color ?? "amber")
      setCategory(product?.category ?? "")
    }
  }, [open, product])

  const handleSave = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    const qty = Math.max(0, Number.parseInt(quantity, 10) || 0)
    const priceNum = Math.max(0, Number.parseInt(price, 10) || 0)
    if (editing && product) {
      updateProduct(product.id, { name: trimmed, quantity: qty, price: priceNum, color, category: category.trim() || undefined })
    } else {
      addProduct({ name: trimmed, quantity: qty, price: priceNum, color, category: category.trim() || undefined })
    }
    onOpenChange(false)
  }

  const handleDelete = () => {
    if (product) {
      deleteProduct(product.id)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar producto" : "Nuevo producto"}</DialogTitle>
          <DialogDescription>
            {editing ? "Cambia los datos del producto." : "Crea un producto para tu inventario."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <Label htmlFor="product-name">Nombre</Label>
            <Input
              id="product-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Bandejas de Deditos"
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="product-qty">Cantidad inicial</Label>
            <Input
              id="product-qty"
              inputMode="numeric"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value.replace(/[^0-9]/g, ""))}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="product-price">Precio</Label>
            <Input
              id="product-price"
              inputMode="numeric"
              value={price}
              onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="Ej. 24000"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="product-cat">Categoría (opcional)</Label>
            <Input
              id="product-cat"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Ej. Empanadas"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {PRODUCT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  aria-label={c.label}
                  onClick={() => setColor(c.value)}
                  className={cn(
                    "size-9 rounded-full border-2 transition-transform",
                    c.dot,
                    color === c.value
                      ? "scale-110 border-foreground"
                      : "border-transparent opacity-80",
                  )}
                />
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
          {editing ? (
            <Button variant="ghost" className="text-destructive" onClick={handleDelete}>
              <Trash2 className="size-4" />
              Eliminar
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Guardar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
