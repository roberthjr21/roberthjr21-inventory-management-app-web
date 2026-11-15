import "./load-env.mjs"
import { readFile } from "node:fs/promises"
import pg from "pg"

if (!process.env.DATABASE_URL) throw new Error("Configura DATABASE_URL antes de ejecutar la migración.")

const db = new pg.Pool({ connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 5000 })
try {
  await db.query(await readFile(new URL("../db/001-inventory.sql", import.meta.url), "utf8"))
  console.log("Esquema del inventario listo.")
} finally {
  await db.end()
}
