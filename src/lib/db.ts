/**
 * @fileoverview Turso (LibSQL) database client and Drizzle ORM instance.
 *
 * Import `db` for all query operations. Import `client` only when raw
 * LibSQL access is required (e.g., batch statements outside Drizzle).
 */
import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"
import * as schema from "./schema"

/** Raw LibSQL client connected to the Turso database. */
export const client = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_AUTH_TOKEN!,
})

/** Drizzle ORM instance with full schema attached for type-safe queries. */
export const db = drizzle(client, { schema })
