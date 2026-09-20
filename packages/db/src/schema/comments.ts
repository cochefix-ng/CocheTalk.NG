import { boolean, index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { discussions } from "./discussions";

export const comments = pgTable("comments", {
  id: serial("id").primaryKey(), questionOrAnswerId: integer("question_or_answer_id").notNull(),
  isAnswer: boolean("is_answer").notNull(), userId: text("user_id").notNull(), userName: text("user_name").notNull(),
  content: text("content").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("comments_parent_created_idx").on(table.questionOrAnswerId, table.isAnswer, table.createdAt), index("comments_owner_created_idx").on(table.userId, table.createdAt)]);
export const discussionComments = pgTable("discussion_comments", {
  id: serial("id").primaryKey(), postId: integer("post_id").notNull().references(() => discussions.id, { onDelete: "cascade" }), userId: text("user_id").notNull(),
  userName: text("user_name").notNull(), content: text("content").notNull(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("discussion_comments_post_created_idx").on(table.postId, table.createdAt), index("discussion_comments_owner_created_idx").on(table.userId, table.createdAt)]);
export const insertCommentSchema = createInsertSchema(comments).omit({ id: true, createdAt: true });
export const insertDiscussionCommentSchema = createInsertSchema(discussionComments).omit({ id: true, createdAt: true });
export type InsertComment = z.infer<typeof insertCommentSchema>;
export type InsertDiscussionComment = z.infer<typeof insertDiscussionCommentSchema>;