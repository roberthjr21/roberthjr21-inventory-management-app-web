import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto"
import type { NextRequest, NextResponse } from "next/server"
import { database } from "./db"
import { RequestError } from "./http"

const SESSION_SECONDS = 12 * 60 * 60
const TOKEN_PATTERN = /^[a-f0-9]{64}$/
const MAX_LOGIN_ATTEMPTS = 15

function hash(value: string) {
  return createHash("sha256").update(value).digest("hex")
}

function credentials() {
  const encoded = process.env.INVENTORY_PASSWORD_HASH ?? ""
  const match = /^scrypt:([a-f0-9]{32}):([a-f0-9]{128})$/.exec(encoded)
  if (!match) throw new Error("INVENTORY_PASSWORD_HASH no está configurado.")
  return { salt: Buffer.from(match[1], "hex"), key: Buffer.from(match[2], "hex"), tag: hash(encoded) }
}

function cookieSettings() {
  const origin = new URL(process.env.APP_ORIGIN ?? "")
  const secure = origin.protocol === "https:"
  if (!secure && (origin.protocol !== "http:" || !["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname))) {
    throw new Error("APP_ORIGIN debe usar HTTPS fuera del equipo local.")
  }
  return {
    name: secure ? "__Host-inventory_session" : "inventory_session",
    options: { httpOnly: true, secure, sameSite: "strict" as const, path: "/" },
  }
}

function requestToken(request: NextRequest) {
  const token = request.cookies.get(cookieSettings().name)?.value
  return token && TOKEN_PATTERN.test(token) ? hash(token) : null
}

export async function requireSession(request: NextRequest) {
  const token = requestToken(request)
  if (token) {
    const { rowCount } = await database().query(
      "SELECT 1 FROM inventory_sessions WHERE token_hash = $1 AND credential_tag = $2 AND expires_at > now()",
      [token, credentials().tag],
    )
    if (rowCount) return
  }
  throw new RequestError("Inicia sesión para acceder al inventario.", 401)
}

export async function authenticate(password: string, request: NextRequest, response: NextResponse) {
  const cookie = cookieSettings()
  const { salt, key, tag } = credentials()
  const db = database()
  const { rowCount } = await db.query(
    `INSERT INTO inventory_login_limit (id, attempts, expires_at)
     VALUES (1, 1, now() + interval '5 minutes')
     ON CONFLICT (id) DO UPDATE SET
       attempts = CASE WHEN inventory_login_limit.expires_at <= now() THEN 1 ELSE inventory_login_limit.attempts + 1 END,
       expires_at = CASE WHEN inventory_login_limit.expires_at <= now() THEN EXCLUDED.expires_at ELSE inventory_login_limit.expires_at END
     WHERE inventory_login_limit.expires_at <= now() OR inventory_login_limit.attempts < $1
     RETURNING attempts`,
    [MAX_LOGIN_ATTEMPTS],
  )
  if (!rowCount) throw new RequestError("Demasiados intentos. Espera unos minutos y vuelve a intentar.", 429)

  const passwordKey = await new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, key.length, { N: 32768, maxmem: 64 * 1024 * 1024 }, (error, derivedKey) => {
      if (error) reject(error)
      else resolve(derivedKey)
    })
  })
  if (!timingSafeEqual(key, passwordKey)) throw new RequestError("Contraseña incorrecta.", 401)

  const token = randomBytes(32).toString("hex")
  await db.query(
    "DELETE FROM inventory_sessions WHERE expires_at <= now() OR credential_tag <> $1 OR token_hash = $2",
    [tag, requestToken(request)],
  )
  await db.query("DELETE FROM inventory_login_limit WHERE id = 1")
  await db.query(
    "INSERT INTO inventory_sessions (token_hash, credential_tag, expires_at) VALUES ($1, $2, now() + $3 * interval '1 second')",
    [hash(token), tag, SESSION_SECONDS],
  )
  response.cookies.set(cookie.name, token, { ...cookie.options, maxAge: SESSION_SECONDS })
}

export async function signOut(request: NextRequest, response: NextResponse) {
  const token = requestToken(request)
  if (token) await database().query("DELETE FROM inventory_sessions WHERE token_hash = $1", [token])
  const cookie = cookieSettings()
  response.cookies.set(cookie.name, "", { ...cookie.options, maxAge: 0 })
}
