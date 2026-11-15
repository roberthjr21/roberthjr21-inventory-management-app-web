import type { NextRequest } from "next/server"
import { z } from "zod"
import { authenticate, signOut } from "@/lib/server/auth"
import { json, readJson, requestFailure, sameOrigin } from "@/lib/server/http"

const login = z.strictObject({ password: z.string().min(1).max(256) })

export async function POST(request: NextRequest) {
  try {
    sameOrigin(request)
    const result = login.safeParse(await readJson(request, 4096))
    if (!result.success || Buffer.byteLength(result.data.password) > 256) {
      return json({ error: "La contraseña tiene un formato inválido." }, 400)
    }
    const response = json({ ok: true })
    await authenticate(result.data.password, request, response)
    return response
  } catch (error) {
    return requestFailure(error)
  }
}

export async function DELETE(request: NextRequest) {
  try {
    sameOrigin(request)
    const response = json({ ok: true })
    await signOut(request, response)
    return response
  } catch (error) {
    return requestFailure(error)
  }
}
