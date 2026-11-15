import { NextResponse } from "next/server"

export function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" },
  })
}

export class RequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

export function sameOrigin(request: Request) {
  const configured = process.env.APP_ORIGIN
  if (!configured) throw new Error("APP_ORIGIN no está configurada.")
  const expected = new URL(configured).origin
  if (request.headers.get("origin") !== expected) {
    throw new RequestError("Origen de la solicitud no permitido.", 403)
  }
}

export async function readJson(request: Request, limit: number): Promise<unknown> {
  if (request.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json") {
    throw new RequestError("Se esperaba contenido JSON.", 415)
  }
  if (Number(request.headers.get("content-length")) > limit) {
    throw new RequestError("El archivo es demasiado grande.", 413)
  }
  const reader = request.body?.getReader()
  if (!reader) throw new RequestError("Faltan los datos de la solicitud.", 400)

  let total = 0
  const chunks: Uint8Array[] = []
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      total += value.byteLength
      if (total > limit) {
        void reader.cancel().catch(() => undefined)
        throw new RequestError("El archivo es demasiado grande.", 413)
      }
      chunks.push(value)
    }
    return JSON.parse(Buffer.concat(chunks).toString("utf8"))
  } catch (error) {
    if (error instanceof RequestError) throw error
    throw new RequestError("El contenido JSON no es válido.", 400)
  } finally {
    reader.releaseLock()
  }
}

export function requestFailure(error: unknown) {
  if (error instanceof RequestError) return json({ error: error.message }, error.status)
  console.error("Inventario: error interno", error instanceof Error ? error.name : "Error")
  return json({ error: "El servicio no está disponible. Revisa la conexión e inténtalo de nuevo." }, 503)
}
