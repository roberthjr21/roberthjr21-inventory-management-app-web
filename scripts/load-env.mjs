import { loadEnvFile } from "node:process"

try {
  loadEnvFile(".env.local")
} catch (error) {
  if (error.code !== "ENOENT") throw error
}
