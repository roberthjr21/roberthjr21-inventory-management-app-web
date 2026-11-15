"use client"

import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useStore } from "@/lib/store"

export function Login() {
  const { signIn } = useStore()
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [pending, setPending] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setError("")
    const failure = await signIn(password)
    if (failure) {
      setError(failure)
      setPending(false)
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md items-center px-4">
      <form onSubmit={submit} className="w-full space-y-5 rounded-2xl border bg-card p-6">
        <div>
          <h1 className="text-xl font-bold">Inventario de deditos y empanadas</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ingresa con la contraseña del negocio.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="inventory-password">Contraseña</Label>
          <Input id="inventory-password" type="password" autoComplete="current-password" required maxLength={256}
            value={password} onChange={event => setPassword(event.target.value)} />
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="h-11 w-full" disabled={pending}>{pending ? "Ingresando…" : "Entrar"}</Button>
      </form>
    </main>
  )
}
