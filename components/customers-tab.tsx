"use client"

import { useEffect, useState } from "react"
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
import { Textarea } from "@/components/ui/textarea"
import { useStore } from "@/lib/store"
import type { Customer } from "@/lib/types"
import { MapPin, Phone, Trash2, UserPlus, Users } from "lucide-react"

export function CustomersTab() {
  const { data, addCustomer, updateCustomer, deleteCustomer } = useStore()
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Customer | null>(null)
  const [name, setName] = useState("")
  const [phone, setPhone] = useState("")
  const [address, setAddress] = useState("")
  const [notes, setNotes] = useState("")

  useEffect(() => {
    if (open) {
      setName(editing?.name ?? "")
      setPhone(editing?.phone ?? "")
      setAddress(editing?.address ?? "")
      setNotes(editing?.notes ?? "")
    }
  }, [open, editing])

  const openNew = () => {
    setEditing(null)
    setOpen(true)
  }

  const openEdit = (c: Customer) => {
    setEditing(c)
    setOpen(true)
  }

  const handleSave = () => {
    const trimmed = name.trim()
    if (!trimmed) return
    const payload = {
      name: trimmed,
      phone: phone.trim() || undefined,
      address: address.trim() || undefined,
      notes: notes.trim() || undefined,
    }
    if (editing) updateCustomer(editing.id, payload)
    else addCustomer(payload)
    setOpen(false)
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      <Button type="button" className="h-12 rounded-2xl text-base" onClick={openNew}>
        <UserPlus className="size-5" />
        Nuevo cliente
      </Button>

      <h2 className="text-sm font-medium text-muted-foreground">
        {data.customers.length} {data.customers.length === 1 ? "cliente" : "clientes"}
      </h2>

      {data.customers.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
          <Users className="size-8 opacity-50" />
          <p>Aún no tienes clientes guardados.</p>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {data.customers.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => openEdit(c)}
            className="rounded-2xl border bg-card p-4 text-left transition-colors hover:bg-accent/40"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="font-semibold">{c.name}</p>
            </div>
            <div className="mt-1 flex flex-col gap-1 text-sm text-muted-foreground">
              {c.phone && (
                <span className="flex items-center gap-2">
                  <Phone className="size-3.5" /> {c.phone}
                </span>
              )}
              {c.address && (
                <span className="flex items-center gap-2">
                  <MapPin className="size-3.5" /> {c.address}
                </span>
              )}
              {c.notes && <p className="mt-1 italic">{c.notes}</p>}
            </div>
          </button>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar cliente" : "Nuevo cliente"}</DialogTitle>
          </DialogHeader>

          <div className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-2">
              <Label htmlFor="c-name">Nombre</Label>
              <Input id="c-name" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="c-phone">Teléfono</Label>
              <Input
                id="c-phone"
                inputMode="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="c-address">Dirección</Label>
              <Input id="c-address" value={address} onChange={(e) => setAddress(e.target.value)} />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="c-notes">Observaciones</Label>
              <Textarea
                id="c-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ej. Siempre compra 5 bandejas los viernes"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
            {editing ? (
              <Button
                variant="ghost"
                className="text-destructive"
                onClick={() => {
                  deleteCustomer(editing.id)
                  setOpen(false)
                }}
              >
                <Trash2 className="size-4" />
                Eliminar
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave}>Guardar</Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
