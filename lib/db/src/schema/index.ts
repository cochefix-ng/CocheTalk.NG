import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const notificationPreferences = pgTable(
  "notification_preferences",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    newAnswersEnabled: boolean("new_answers_enabled").notNull().default(true),
    commentsRepliesEnabled: boolean("comments_replies_enabled").notNull().default(true),
    newMessagesEnabled: boolean("new_messages_enabled").notNull().default(true),
    marketplaceUpdatesEnabled: boolean("marketplace_updates_enabled").notNull().default(true),
    providerUpdatesEnabled: boolean("provider_updates_enabled").notNull().default(true),
    announcementsEnabled: boolean("announcements_enabled").notNull().default(true),
    systemNotificationsEnabled: boolean("system_notifications_enabled").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("notification_preferences_user_id_idx").on(table.userId)],
);

export const notificationGlobalSettings = pgTable(
  "notification_global_settings",
  {
    id: serial("id").primaryKey(),
    notificationType: text("notification_type").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    updatedBy: text("updated_by"),
  },
  (table) => [uniqueIndex("notification_global_type_idx").on(table.notificationType)],
);

export const pushTokens = pgTable(
  "push_tokens",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    token: text("token").notNull(),
    platform: text("platform").notNull(),
    deviceIdentifier: text("device_identifier"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("push_tokens_token_idx").on(table.token),
    index("push_tokens_user_active_idx").on(table.userId, table.isActive),
  ],
);

export const notifications = pgTable(
  "notifications",
  {
    id: serial("id").primaryKey(),
    userId: text("user_id").notNull(),
    notificationType: text("notification_type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull().default({}),
    isRead: boolean("is_read").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveryStatus: text("delivery_status").notNull().default("pending"),
    dedupeKey: text("dedupe_key"),
  },
  (table) => [
    index("notifications_user_created_idx").on(table.userId, table.createdAt),
    uniqueIndex("notifications_dedupe_key_idx").on(table.dedupeKey),
  ],
);

export const notificationAuditLog = pgTable(
  "notification_audit_log",
  {
    id: serial("id").primaryKey(),
    adminUserId: text("admin_user_id").notNull(),
    notificationType: text("notification_type").notNull(),
    previousValue: boolean("previous_value").notNull(),
    newValue: boolean("new_value").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("notification_audit_type_created_idx").on(table.notificationType, table.createdAt)],
);