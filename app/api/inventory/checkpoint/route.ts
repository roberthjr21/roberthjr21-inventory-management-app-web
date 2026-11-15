import type { NextRequest } from "next/server"
import { requireSession } from "@/lib/server/auth"
import { readCheckpoint } from "@/lib/server/db"
import { json, requestFailure } from "@/lib/server/http"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    await requireSession(request)
    const data = await readCheckpoint()
    if (!data) return json({ error: "Todavía no hay una copia anterior." }, 404)
    return json({ version: 2, data })
  } catch (error) {
    return requestFailure(error)
  }
}
