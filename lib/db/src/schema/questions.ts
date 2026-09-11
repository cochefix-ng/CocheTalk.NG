import { boolean, index, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  userId: text("user_id").notNull(),
  userName: text("user_name").notNull(),
  userRole: text("user_role").notNull(),
  userSpecialization: text("user_specialization").notNull().default(""),
  userVerified: boolean("user_verified").notNull().default(false),
  tags: text("tags").notNull().default(""),
  isPrivateEcosystem: boolean("is_private_ecosystem").notNull().default(false),
  upvotes: integer("upvotes").notNull().default(0),
  upvotedBy: text("upvoted_by").array().notNull().default([]),
  acceptedAnswerId: integer("accepted_answer_id"),
  yrModel: text("yr_model").notNull().default(""),
  vehicleType: text("vehicle_type").notNull().default(""),
  seeConcern: boolean("see_concern").notNull().default(false),
  hearConcern: boolean("hear_concern").notNull().default(false),
  smellConcern: boolean("smell_concern").notNull().default(false),
  feelConcern: boolean("feel_concern").notNull().default(false),
  notStarting: boolean("not_starting").notNull().default(false),
  performanceConcern: boolean("performance_concern").notNull().default(false),
  dashboardWarningLights: boolean("dashboard_warning_lights").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("questions_owner_created_idx").on(table.userId, table.createdAt),
  index("questions_created_idx").on(table.createdAt),
]);

export const insertQuestionSchema = createInsertSchema(questions).omit({ id: true, createdAt: true, updatedAt: true, upvotes: true, upvotedBy: true, acceptedAnswerId: true });
export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questions.$inferSelect;