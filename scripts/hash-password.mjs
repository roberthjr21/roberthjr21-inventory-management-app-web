import { randomBytes, scryptSync } from "node:crypto"

if (process.stdin.isTTY) {
  console.error("Pasa la contraseña por entrada estándar. Consulta el comando del README.")
  process.exit(1)
}

process.stdin.setEncoding("utf8")
let input = ""
for await (const chunk of process.stdin) input += chunk
const password = input.replace(/\r?\n$/, "")

if (password.length < 16 || Buffer.byteLength(password) > 256) {
  console.error("Usa una contraseña de al menos 16 caracteres y máximo 256 bytes.")
  process.exit(1)
}

const salt = randomBytes(16)
const key = scryptSync(password, salt, 64, { N: 32768, maxmem: 64 * 1024 * 1024 })
console.log(`scrypt:${salt.toString("hex")}:${key.toString("hex")}`)
