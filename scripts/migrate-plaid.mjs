import { createClient } from "@libsql/client"
import { readFileSync } from "fs"
import { join, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
})

const sql = readFileSync(
  join(__dirname, "../supabase/migrations/0003_plaid.sql"),
  "utf8",
)

const statements = sql.split(";").map((s) => s.trim()).filter(Boolean)
for (const statement of statements) {
  await client.execute(statement)
  console.log("Executed:", statement.slice(0, 60) + "...")
}

console.log("Migration complete.")
