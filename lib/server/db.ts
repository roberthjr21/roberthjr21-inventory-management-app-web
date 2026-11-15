import pg from "pg"
import { createDefaultData, MAX_BACKUP_BYTES } from "../app-data"
import type { AppData } from "../types"
import type { InventoryCommand, InventorySnapshot } from "../inventory-schema"
import { applyInventoryCommand, InventoryError } from "../inventory-operations"

let pool: pg.Pool | undefined

export function database() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error("DATABASE_URL no está configurada.")
  if (!pool) {
    pool = new pg.Pool({
      connectionString,
      max: 4,
      connectionTimeoutMillis: 5000,
      idleTimeoutMillis: 10_000,
      statement_timeout: 15_000,
    })
    pool.on("error", error => console.error("Inventario: conexión PostgreSQL interrumpida", error.name))
  }
  return pool
}

export async function readInventory(): Promise<InventorySnapshot> {
  const { rows: [row] } = await database().query<InventorySnapshot>(
    'SELECT data, revision, checkpoint IS NOT NULL AS "hasCheckpoint" FROM inventory_state WHERE id = 1',
  )
  return row ?? { data: createDefaultData(), revision: 0, hasCheckpoint: false }
}

export async function readCheckpoint(): Promise<AppData | null> {
  const { rows: [row] } = await database().query<{ checkpoint: AppData | null }>(
    "SELECT checkpoint FROM inventory_state WHERE id = 1",
  )
  return row?.checkpoint ?? null
}

type WriteResult = { snapshot: InventorySnapshot; conflict: boolean }

export async function writeInventory(revision: number, command: InventoryCommand): Promise<WriteResult> {
  const client = await database().connect()
  let discardClient = false
  try {
    await client.query("BEGIN")
    await client.query(
      "INSERT INTO inventory_state (id, data) VALUES (1, $1::jsonb) ON CONFLICT (id) DO NOTHING",
      [createDefaultData()],
    )
    const { rows: [current] } = await client.query<InventorySnapshot>(
      'SELECT data, revision, checkpoint IS NOT NULL AS "hasCheckpoint" FROM inventory_state WHERE id = 1 FOR UPDATE',
    )
    let result: WriteResult
    if (current.revision !== revision) {
      result = { snapshot: current, conflict: true }
    } else {
      const next = applyInventoryCommand(current.data, command)
      if (Buffer.byteLength(JSON.stringify({ version: 2, data: next })) > MAX_BACKUP_BYTES) {
        throw new InventoryError("El inventario alcanzó su tamaño máximo. Exporta los datos y reduce el historial de movimientos.")
      }
      const saveCheckpoint = command.type === "restore" || command.type === "reset" || command.type === "clearMovements"
      const { rows: [snapshot] } = await client.query<InventorySnapshot>(
        `UPDATE inventory_state SET data = $1::jsonb, revision = revision + 1,
          checkpoint = CASE WHEN $2::boolean THEN data ELSE checkpoint END
          WHERE id = 1
          RETURNING data, revision, checkpoint IS NOT NULL AS "hasCheckpoint"`,
        [next, saveCheckpoint],
      )
      result = { snapshot, conflict: false }
    }
    await client.query("COMMIT")
    return result
  } catch (error) {
    try {
      await client.query("ROLLBACK")
    } catch {
      discardClient = true
    }
    throw error
  } finally {
    client.release(discardClient)
  }
}
