import { index, integer, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  contentType: text("content_type", { enum: ["discussion", "question", "answer", "listing"] }).notNull(),
  contentId: integer("content_id").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex("favorites_user_type_content_idx").on(table.userId, table.contentType, table.contentId), index("favorites_user_created_idx").on(table.userId, table.createdAt), index("favorites_content_lookup_idx").on(table.contentType, table.contentId)]);
export const insertFavoriteSchema = createInsertSchema(favorites).omit({ id: true, createdAt: true });
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;
export type Favorite = typeof favorites.$inferSelect;