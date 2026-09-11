import { boolean, index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const discussions = pgTable("discussions", {
  id: serial("id").primaryKey(),
  title: text("title"),
  content: text("content").notNull(),
  tags: text("tags").notNull().default(""),
  mediaUris: text("media_uris").array().notNull().default([]),
  isProCircle: boolean("is_pro_circle").notNull().default(false),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  userRole: text("user_role").notNull(),
  userSpecialization: text("user_specialization").notNull().default(""),
  userVerified: boolean("user_verified").notNull().default(false),
  upvotes: integer("upvotes").notNull().default(0),
  upvotedBy: text("upvoted_by").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("discussions_owner_created_idx").on(table.userId, table.createdAt), index("discussions_access_created_idx").on(table.isProCircle, table.createdAt)]);
export const insertDiscussionSchema = createInsertSchema(discussions).omit({ id: true, createdAt: true, updatedAt: true, upvotes: true, upvotedBy: true });
export type InsertDiscussion = z.infer<typeof insertDiscussionSchema>;
export type Discussion = typeof discussions.$inferSelect;