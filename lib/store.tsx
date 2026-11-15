"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { toast } from "sonner"
import { createDefaultData } from "./app-data"
import type { InventoryCommand, InventorySnapshot } from "./inventory-schema"

type Connection = "loading" | "signedOut" | "ready" | "unavailable"

interface StoreContextValue extends InventorySnapshot {
  connection: Connection
  pending: boolean
  send: (command: InventoryCommand) => Promise<boolean>
  signIn: (password: string) => Promise<string | null>
  signOut: () => Promise<void>
  reload: () => Promise<void>
}

const initial: InventorySnapshot = { data: createDefaultData(), revision: 0, hasCheckpoint: false }
const StoreContext = createContext<StoreContextValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [snapshot, setSnapshot] = useState(initial)
  const [connection, setConnection] = useState<Connection>("loading")
  const [pending, setPending] = useState(false)
  const busy = useRef(false)

  const forgetSession = () => {
    setSnapshot(initial)
    setConnection("signedOut")
  }

  const reload = useCallback(async () => {
    try {
      const response = await fetch("/api/inventory", { cache: "no-store" })
      if (response.status === 401) {
        forgetSession()
      } else if (response.ok) {
        setSnapshot(await response.json())
        setConnection("ready")
      } else {
        setConnection("unavailable")
      }
    } catch {
      setConnection("unavailable")
    }
  }, [])

  useEffect(() => {
    const timer = window.setTimeout(() => { void reload() }, 0)
    return () => window.clearTimeout(timer)
  }, [reload])

  useEffect(() => {
    document.documentElement.classList.toggle("dark", snapshot.data.theme === "dark")
  }, [snapshot.data.theme])

  const send = async (command: InventoryCommand) => {
    if (busy.current) return false
    busy.current = true
    setPending(true)
    try {
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revision: snapshot.revision, command }),
      })
      if (response.status === 401) {
        forgetSession()
        toast.error("Tu sesión terminó. Inicia sesión de nuevo.")
        return false
      }
      const result = await response.json()
      if (response.ok || response.status === 409) {
        const { data, revision, hasCheckpoint } = result as InventorySnapshot
        setSnapshot({ data, revision, hasCheckpoint })
      }
      if (!response.ok) {
        toast.error(result.error ?? "No fue posible guardar los cambios.")
        return false
      }
      return true
    } catch {
      toast.error("No se pudo confirmar el guardado. Revisa la conexión y actualiza el inventario.")
      return false
    } finally {
      busy.current = false
      setPending(false)
    }
  }

  const signIn = async (password: string) => {
    try {
      const response = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      })
      if (!response.ok) {
        const result = await response.json()
        return result.error ?? "No fue posible iniciar sesión."
      }
      await reload()
      return null
    } catch {
      return "No fue posible conectar con el servidor."
    }
  }

  const signOut = async () => {
    if (busy.current) return
    busy.current = true
    setPending(true)
    try {
      const response = await fetch("/api/session", { method: "DELETE" })
      if (!response.ok) throw new Error()
      forgetSession()
    } catch {
      toast.error("No se pudo cerrar la sesión. Inténtalo de nuevo.")
    } finally {
      busy.current = false
      setPending(false)
    }
  }

  return (
    <StoreContext.Provider value={{ ...snapshot, connection, pending, send, signIn, signOut, reload }}>
      {children}
    </StoreContext.Provider>
  )
}

export function useStore() {
  const context = useContext(StoreContext)
  if (!context) throw new Error("useStore debe estar dentro de StoreProvider.")
  return context
}
