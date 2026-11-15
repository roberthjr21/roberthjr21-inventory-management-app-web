"use client"

import { useEffect, useReducer } from "react"
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

type FormState = {
  name: string
  quantity: string
  price: string
  color: ProductColor
  category: string
}

type FormAction =
  | { type: "reset"; product?: Product | null }
  | { type: "set-name"; value: string }
  | { type: "set-quantity"; value: string }
  | { type: "set-price"; value: string }
  | { type: "set-color"; value: ProductColor }
  | { type: "set-category"; value: string }

const initialFormState: FormState = {
  name: "",
  quantity: "0",
  price: "0",
  color: "amber",
  category: "",
}

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "reset":
      return {
        name: action.product?.name ?? "",
        quantity: String(action.product?.quantity ?? 0),
        price: String(action.product?.price ?? 0),
        color: action.product?.color ?? "amber",
        category: action.product?.category ?? "",
      }
    case "set-name":
      return { ...state, name: action.value }
    case "set-quantity":
      return { ...state, quantity: action.value }
    case "set-price":
      return { ...state, price: action.value }
    case "set-color":
      return { ...state, color: action.value }
    case "set-category":
      return { ...state, category: action.value }
    default:
      return state
  }
}

export function ProductFormDialog({ open, onOpenChange, product }: Props) {
  const { pending, send } = useStore()
  const [form, dispatch] = useReducer(formReducer, initialFormState)

  const editing = Boolean(product)

  useEffect(() => {
    if (open) {
      dispatch({ type: "reset", product })
    }
  }, [open, product])

  const handleSave = async () => {
    const name = form.name.trim()
    if (!name) return
    const fields = {
      name,
      quantity: Number(form.quantity),
      price: Number(form.price),
      color: form.color,
      category: form.category.trim() || undefined,
    }
    const saved = await send(product
      ? { type: "updateProduct", id: product.id, product: fields }
      : { type: "addProduct", product: fields })
    if (saved) onOpenChange(false)
  }

  const handleArchive = async () => {
    if (product && window.confirm(`¿Archivar «${product.name}»? Se conservará su historial.`)) {
      if (await send({ type: "archiveProduct", id: product.id, archived: true })) onOpenChange(false)
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
              value={form.name}
              onChange={(e) => dispatch({ type: "set-name", value: e.target.value })}
              placeholder="Ej. Bandejas de Deditos"
              maxLength={160}
              autoFocus
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="product-qty">Cantidad inicial</Label>
            <Input
              id="product-qty"
              maxLength={7}
              inputMode="numeric"
              value={form.quantity}
              onChange={(e) => dispatch({ type: "set-quantity", value: e.target.value.replace(/[^0-9]/g, "") })}
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="product-price">Precio</Label>
            <Input
              id="product-price"
              maxLength={10}
              inputMode="numeric"
              value={form.price}
              onChange={(e) => dispatch({ type: "set-price", value: e.target.value.replace(/[^0-9]/g, "") })}
              placeholder="Ej. 24000"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="product-cat">Categoría (opcional)</Label>
            <Input
              id="product-cat"
              value={form.category}
              onChange={(e) => dispatch({ type: "set-category", value: e.target.value })}
              placeholder="Ej. Empanadas"
              maxLength={160}
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
                  aria-pressed={form.color === c.value}
                  onClick={() => dispatch({ type: "set-color", value: c.value })}
                  className={cn(
                    "size-9 rounded-full border-2 transition-transform",
                    c.dot,
                    form.color === c.value
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
            <Button variant="ghost" className="text-destructive" onClick={handleArchive} disabled={pending}>
              <Trash2 className="size-4" />
              Archivar
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={pending || !form.name.trim()}>Guardar</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
