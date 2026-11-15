import type { NextRequest } from "next/server"
import { MAX_BACKUP_BYTES } from "@/lib/app-data"
import { InventoryError } from "@/lib/inventory-operations"
import { inventoryRequest } from "@/lib/inventory-schema"
import { requireSession } from "@/lib/server/auth"
import { readInventory, writeInventory } from "@/lib/server/db"
import { json, readJson, requestFailure, sameOrigin } from "@/lib/server/http"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    await requireSession(request)
    return json(await readInventory())
  } catch (error) {
    return requestFailure(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    sameOrigin(request)
    await requireSession(request)
    const result = inventoryRequest.safeParse(await readJson(request, MAX_BACKUP_BYTES + 4096))
    if (!result.success) return json({ error: "La operación contiene datos inválidos. Revisa los valores ingresados." }, 400)
    const { revision, command } = result.data
    const { snapshot, conflict } = await writeInventory(revision, command)
    if (conflict) {
      return json({ ...snapshot, error: "El inventario cambió en otra pestaña o dispositivo. Revisa los datos actualizados y vuelve a intentar." }, 409)
    }
    return json(snapshot)
  } catch (error) {
    if (error instanceof InventoryError) return json({ error: error.message }, 422)
    return requestFailure(error)
  }
}
