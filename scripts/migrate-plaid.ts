import { createClient } from "@libsql/client"
import { readFileSync } from "fs"
import { join } from "path"

const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

const sql = readFileSync(
  join(process.cwd(), "supabase/migrations/0003_plaid.sql"),
  "utf8",
)

const statements = sql.split(";").map((s) => s.trim()).filter(Boolean)

try {
  for (const statement of statements) {
    await client.execute(statement)
    process.stdout.write(`Executed: ${statement.slice(0, 60)}...\n`)
  }
  process.stdout.write("Migration complete.\n")
} catch (error) {
  process.stderr.write(`Migration failed: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
}
