import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

import fs from "fs";
import path from "path";

if (!process.env.DATABASE_URL) {
  const rootEnvPath = path.resolve(process.cwd(), ".env");
  const fallbackEnvPath = path.resolve(__dirname, "../../.env");
  if (fs.existsSync(rootEnvPath) && typeof process.loadEnvFile === "function") {
    process.loadEnvFile(rootEnvPath);
  } else if (fs.existsSync(fallbackEnvPath) && typeof process.loadEnvFile === "function") {
    process.loadEnvFile(fallbackEnvPath);
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle(pool, { schema });

export * from "./schema";
