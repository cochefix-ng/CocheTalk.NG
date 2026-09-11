import { boolean, index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { questions } from "./questions";

export const answers = pgTable("answers", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").notNull().references(() => questions.id, { onDelete: "cascade" }),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  userRole: text("user_role").notNull(),
  userSpecialization: text("user_specialization").notNull().default(""),
  userVerified: boolean("user_verified").notNull().default(false),
  content: text("content").notNull(),
  upvotes: integer("upvotes").notNull().default(0),
  upvotedBy: text("upvoted_by").array().notNull().default([]),
  isAccepted: boolean("is_accepted").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index("answers_question_created_idx").on(table.questionId, table.createdAt), index("answers_owner_created_idx").on(table.userId, table.createdAt)]);
export const insertAnswerSchema = createInsertSchema(answers).omit({ id: true, createdAt: true, updatedAt: true, upvotes: true, upvotedBy: true, isAccepted: true });
export type InsertAnswer = z.infer<typeof insertAnswerSchema>;
export type Answer = typeof answers.$inferSelect;