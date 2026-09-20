import fs from "fs";
import path from "path";
import { createClient } from "@supabase/supabase-js";

if (!process.env.SUPABASE_URL) {
  const candidates = [
    path.resolve(process.cwd(), ".env"),
    path.resolve(process.cwd(), "../../.env"),
    path.resolve(__dirname, "../../../.env"),
    path.resolve(__dirname, "../../.env"),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p) && typeof process.loadEnvFile === "function") {
      try {
        process.loadEnvFile(p);
        break;
      } catch {
        // continue
      }
    }
  }
}

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.EXPO_PUBLIC_SUPABASE_URL ||
  "https://zayfypmgkjedxqyjebem.supabase.co";

const supabaseKey =
  process.env.SUPABASE_SECRET_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
  "";

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
