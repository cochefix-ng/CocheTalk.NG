import { defineConfig } from "drizzle-kit";
import path from "path";

import fs from "fs";

if (!process.env.DATABASE_URL) {
  const rootEnvPath = path.resolve(__dirname, "../../.env");
  if (fs.existsSync(rootEnvPath) && typeof process.loadEnvFile === "function") {
    process.loadEnvFile(rootEnvPath);
  }
}

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL, ensure the database is provisioned");
}

export default defineConfig({
  schema: "./src/schema/index.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
});
