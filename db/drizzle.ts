import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

// Load environment variables
config({ path: ".env" });

// Validate database URL exists
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL environment variable is required. Please check your .env file and ensure it contains a valid Neon database connection string."
  );
}

// Initialize Neon client with connection string
const sql = neon(databaseUrl);

// Create Drizzle database instance
export const db = drizzle({ client: sql });
