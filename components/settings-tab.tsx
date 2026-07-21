"use client"

import { useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useStore } from "@/lib/store"
import { Download, Moon, Upload } from "lucide-react"
import { toast } from "sonner"

export function SettingsTab() {
  const { data, updateSettings, toggleTheme } = useStore()
  const fileRef = useRef<HTMLInputElement>(null)

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `respaldo-inventario-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast.success("Copia de seguridad descargada")
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        localStorage.setItem("inventario-deditos-v1", JSON.stringify(parsed))
        toast.success("Respaldo restaurado. Recargando...")
        setTimeout(() => window.location.reload(), 800)
      } catch {
        toast.error("El archivo no es un respaldo válido")
      }
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  return (
    <div className="flex flex-col gap-4 px-4 pb-4">
      <section className="rounded-2xl border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Negocio</h3>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="biz-name">Nombre del negocio</Label>
            <Input
              id="biz-name"
              value={data.settings.businessName}
              onChange={(e) => updateSettings({ businessName: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label htmlFor="biz-currency">Moneda</Label>
              <Input
                id="biz-currency"
                value={data.settings.currency}
                onChange={(e) => updateSettings({ currency: e.target.value })}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="biz-threshold">Alerta de stock bajo</Label>
              <Input
                id="biz-threshold"
                inputMode="numeric"
                value={data.settings.lowStockThreshold}
                onChange={(e) =>
                  updateSettings({
                    lowStockThreshold: Math.max(
                      0,
                      Number.parseInt(e.target.value.replace(/[^0-9]/g, ""), 10) || 0,
                    ),
                  })
                }
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-4">
        <h3 className="mb-3 text-sm font-semibold">Apariencia</h3>
        <div className="flex items-center justify-between">
          <Label htmlFor="dark-mode" className="flex items-center gap-2">
            <Moon className="size-4" />
            Modo oscuro
          </Label>
          <Switch
            id="dark-mode"
            checked={data.theme === "dark"}
            onCheckedChange={toggleTheme}
          />
        </div>
      </section>

      <section className="rounded-2xl border bg-card p-4">
        <h3 className="mb-1 text-sm font-semibold">Copia de seguridad</h3>
        <p className="mb-3 text-xs text-muted-foreground">
          Tus datos se guardan en este dispositivo. Descarga un respaldo para no perderlos
          al cambiar de celular.
        </p>
        <div className="flex flex-col gap-2">
          <Button variant="outline" className="h-11 rounded-xl" onClick={handleExport}>
            <Download className="size-4" />
            Descargar respaldo
          </Button>
          <Button
            variant="outline"
            className="h-11 rounded-xl"
            onClick={() => fileRef.current?.click()}
          >
            <Upload className="size-4" />
            Restaurar respaldo
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={handleImport}
          />
        </div>
      </section>

      <p className="text-center text-xs text-muted-foreground">
        Inventario · {data.settings.businessName}
      </p>
    </div>
  )
}
