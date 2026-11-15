"use client"

import { useRef, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { MAX_BACKUP_BYTES, STORAGE_KEY } from "@/lib/app-data"
import { parseBackup } from "@/lib/inventory-schema"
import { useStore } from "@/lib/store"
import type { Settings } from "@/lib/types"
import { Download, LogOut, Moon, RotateCcw, Upload } from "lucide-react"
import { toast } from "sonner"

function downloadBackup(backup: unknown, name: string) {
  const blob = new Blob([JSON.stringify(backup)], { type: "application/json" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `respaldo-inventario-${name}.json`
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function BusinessForm({ settings }: { settings: Settings }) {
  const { pending, send } = useStore()

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    if (await send({
      type: "updateSettings",
      settings: {
        businessName: String(values.get("name")).trim(),
        currency: String(values.get("currency")).trim(),
        lowStockThreshold: Number(values.get("threshold")),
      },
    })) toast.success("Configuración guardada")
  }

  return (
    <form className="rounded-2xl border bg-card p-4" onSubmit={save}>
      <h3 className="mb-3 text-sm font-semibold">Negocio</h3>
      <div className="flex flex-col gap-3">
        <div className="space-y-2">
          <Label htmlFor="biz-name">Nombre del negocio</Label>
          <Input id="biz-name" name="name" defaultValue={settings.businessName} maxLength={160} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="biz-currency">Moneda</Label>
            <Input id="biz-currency" name="currency" defaultValue={settings.currency} maxLength={16} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="biz-threshold">Alerta de stock bajo</Label>
            <Input id="biz-threshold" name="threshold" type="number" min={0} max={1_000_000}
              defaultValue={settings.lowStockThreshold} required />
          </div>
        </div>
        <Button type="submit" variant="outline" className="self-start" disabled={pending}>Guardar configuración</Button>
      </div>
    </form>
  )
}

export function SettingsTab() {
  const { data, revision, hasCheckpoint, pending, send, signOut } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)
  const [reading, setReading] = useState(false)

  function legacyBackup() {
    try {
      return localStorage.getItem(STORAGE_KEY)
    } catch {
      return null
    }
  }

  async function restore(raw: string) {
    if (new Blob([raw]).size > MAX_BACKUP_BYTES) throw new Error("El respaldo supera los 4 MB.")
    const parsed = parseBackup(JSON.parse(raw))
    const message = [
      `Este respaldo contiene ${parsed.products.length} productos, ${parsed.sales.length} ventas, ${parsed.customers.length} clientes y ${parsed.notes.length} notas.`,
      "Si continúas, reemplazará los datos actuales y se guardará una copia anterior. ¿Restaurar?",
    ].join("\n\n")
    if (window.confirm(message) && await send({ type: "restore", backup: { version: 2, data: parsed } })) {
      toast.success("Respaldo restaurado")
    }
  }

  async function handleImport(file: File) {
    setReading(true)
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error("El respaldo supera los 4 MB.")
      await restore(await file.text())
    } catch (error) {
      toast.error(error instanceof SyntaxError ? "El archivo no contiene JSON válido." : (error as Error).message)
    } finally {
      setReading(false)
    }
  }

  async function importLegacy() {
    const raw = legacyBackup()
    if (!raw) {
      toast.info("Este navegador no tiene un inventario anterior en esta dirección. Puedes importar el archivo JSON.")
      return
    }
    setReading(true)
    try {
      await restore(raw)
    } catch {
      toast.error("Los datos locales no tienen el formato de un respaldo válido.")
    } finally {
      setReading(false)
    }
  }

  async function downloadCheckpoint() {
    try {
      const response = await fetch("/api/inventory/checkpoint", { cache: "no-store" })
      if (!response.ok) throw new Error()
      downloadBackup(await response.json(), "anterior")
    } catch {
      toast.error("No se pudo descargar la copia anterior.")
    }
  }

  async function reset() {
    if (window.confirm("¿Vaciar todo el inventario? Se guardará una copia anterior.")) {
      if (await send({ type: "reset" })) toast.success("El inventario quedó vacío")
    }
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      <BusinessForm key={revision} settings={data.settings} />

      <section className="rounded-2xl border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Apariencia</h3>
        <div className="flex items-center justify-between">
          <Label htmlFor="dark-mode" className="flex items-center gap-2"><Moon className="size-4" />Modo oscuro</Label>
          <Switch id="dark-mode" checked={data.theme === "dark"} disabled={pending}
            onCheckedChange={checked => send({ type: "setTheme", theme: checked ? "dark" : "light" })} />
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-4">
        <h3 className="mb-1 text-sm font-semibold">Copia de seguridad</h3>
        <p className="mb-3 text-xs text-muted-foreground">El respaldo incluye los datos de clientes e inventario.</p>
        <div className="flex flex-col gap-2">
          <Button variant="outline" className="h-11 rounded-xl" disabled={pending}
            onClick={() => downloadBackup({ version: 2, data }, new Date().toISOString().slice(0, 10))}>
            <Download className="size-4" /> Descargar respaldo
          </Button>
          <Button variant="outline" className="h-11 rounded-xl" disabled={pending || reading} onClick={() => fileRef.current?.click()}>
            <Upload className="size-4" /> Restaurar respaldo
          </Button>
          <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={event => {
            const file = event.target.files?.[0]
            event.target.value = ""
            if (file) void handleImport(file)
          }} />
          <Button variant="outline" className="h-11 rounded-xl" disabled={pending || reading} onClick={importLegacy}>
            Importar datos de este navegador
          </Button>
          {hasCheckpoint && <Button variant="outline" className="h-11 rounded-xl" onClick={downloadCheckpoint}>Descargar copia anterior</Button>}
        </div>
      </section>

      <section className="rounded-2xl border border-destructive/20 bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold text-destructive">Reiniciar inventario</h3>
        <Button variant="destructive" className="h-11 rounded-xl" disabled={pending || reading} onClick={reset}>
          <RotateCcw className="size-4" /> Vaciar inventario
        </Button>
      </section>

      <Button variant="outline" className="h-11 rounded-xl" disabled={pending} onClick={signOut}>
        <LogOut className="size-4" /> Cerrar sesión
      </Button>
    </div>
  )
}
