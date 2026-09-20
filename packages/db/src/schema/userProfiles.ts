import { boolean, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/** Server-owned authorization and presentation attributes. Never populated from content requests. */
export const userProfiles = pgTable("user_profiles", {
  userId: text("user_id").primaryKey(),
  displayName: text("display_name").notNull().default("Member"),
  accountType: text("account_type", { enum: ["Car Owner", "Service Provider"] }).notNull().default("Car Owner"),
  verified: boolean("verified").notNull().default(false),
  admin: boolean("admin").notNull().default(false),
  specialization: text("specialization").notNull().default(""),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("user_profiles_admin_idx").on(table.admin)]);
export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({ createdAt: true, updatedAt: true });
export type UserProfile = z.infer<typeof insertUserProfileSchema>;