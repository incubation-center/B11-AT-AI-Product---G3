import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import type { NeonHttpDatabase } from "drizzle-orm/neon-http";

let _db: NeonHttpDatabase | null = null;

function getDb(): NeonHttpDatabase {
  if (_db) return _db;
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL environment variable is required. Please check your .env file and ensure it contains a valid Neon database connection string."
    );
  }
  const sql = neon(databaseUrl);
  _db = drizzle({ client: sql });
  return _db;
}

export const db = new Proxy({} as NeonHttpDatabase, {
  get(_target, prop) {
    return Reflect.get(getDb(), prop);
  },
});
