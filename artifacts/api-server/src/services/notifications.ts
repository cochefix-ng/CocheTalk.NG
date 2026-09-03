import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@workspace/db";
import {
  notificationAuditLog,
  notificationGlobalSettings,
  notificationPreferences,
  notifications,
  pushTokens,
} from "@workspace/db/schema";

export const NOTIFICATION_TYPES = {
  new_answers: {
    label: "New Answers",
    preference: "newAnswersEnabled",
  },
  comments_replies: {
    label: "Comments & Replies",
    preference: "commentsRepliesEnabled",
  },
  new_messages: {
    label: "New Messages",
    preference: "newMessagesEnabled",
  },
  marketplace_updates: {
    label: "Marketplace Updates",
    preference: "marketplaceUpdatesEnabled",
  },
  provider_updates: {
    label: "Provider Updates",
    preference: "providerUpdatesEnabled",
  },
  announcements: {
    label: "Announcements",
    preference: "announcementsEnabled",
  },
  system_notifications: {
    label: "System Notifications",
    preference: "systemNotificationsEnabled",
  },
} as const;

export type NotificationType = keyof typeof NOTIFICATION_TYPES;

const DEFAULT_NOTIFICATION_TYPES = Object.keys(NOTIFICATION_TYPES) as NotificationType[];
const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const EXPO_BATCH_SIZE = 100;

let defaultsPromise: Promise<void> | undefined;

function isNotificationType(value: string): value is NotificationType {
  return value in NOTIFICATION_TYPES;
}

function preferenceEnabled(
  preferences: typeof notificationPreferences.$inferSelect,
  type: NotificationType,
) {
  switch (type) {
    case "new_answers":
      return preferences.newAnswersEnabled;
    case "comments_replies":
      return preferences.commentsRepliesEnabled;
    case "new_messages":
      return preferences.newMessagesEnabled;
    case "marketplace_updates":
      return preferences.marketplaceUpdatesEnabled;
    case "provider_updates":
      return preferences.providerUpdatesEnabled;
    case "announcements":
      return preferences.announcementsEnabled;
    case "system_notifications":
      return preferences.systemNotificationsEnabled;
  }
}

async function ensureGlobalDefaults() {
  if (!defaultsPromise) {
    defaultsPromise = Promise.all(
      DEFAULT_NOTIFICATION_TYPES.map((notificationType) =>
        db
          .insert(notificationGlobalSettings)
          .values({ notificationType, enabled: true })
          .onConflictDoNothing({ target: notificationGlobalSettings.notificationType }),
      ),
    ).then(() => undefined);
  }
  return defaultsPromise;
}

export async function ensureUserNotificationPreferences(userId: string) {
  await ensureGlobalDefaults();
  await db
    .insert(notificationPreferences)
    .values({ userId })
    .onConflictDoNothing({ target: notificationPreferences.userId });
  const [preferences] = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.userId, userId))
    .limit(1);
  if (!preferences) throw new Error("Notification preferences could not be created");
  return preferences;
}

export async function updateUserNotificationPreferences(
  userId: string,
  updates: Partial<{
    newAnswersEnabled: boolean;
    commentsRepliesEnabled: boolean;
    newMessagesEnabled: boolean;
    marketplaceUpdatesEnabled: boolean;
    providerUpdatesEnabled: boolean;
    announcementsEnabled: boolean;
    systemNotificationsEnabled: boolean;
  }>,
) {
  await ensureUserNotificationPreferences(userId);
  const [preferences] = await db
    .update(notificationPreferences)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(notificationPreferences.userId, userId))
    .returning();
  return preferences;
}

export async function getGlobalNotificationSettings() {
  await ensureGlobalDefaults();
  const rows = await db.select().from(notificationGlobalSettings);
  return DEFAULT_NOTIFICATION_TYPES.map((notificationType) => {
    const row = rows.find((candidate) => candidate.notificationType === notificationType);
    return {
      notificationType,
      label: NOTIFICATION_TYPES[notificationType].label,
      enabled: row?.enabled ?? true,
      updatedAt: row?.updatedAt?.toISOString() ?? null,
      updatedBy: row?.updatedBy ?? null,
    };
  });
}

export async function listNotificationAuditLog(limit: number) {
  const safeLimit = Math.max(1, Math.min(limit, 100));
  return db
    .select()
    .from(notificationAuditLog)
    .orderBy(desc(notificationAuditLog.createdAt))
    .limit(safeLimit);
}

export async function updateGlobalNotificationSetting(
  notificationType: string,
  enabled: boolean,
  adminUserId: string,
) {
  if (!isNotificationType(notificationType)) return null;
  await ensureGlobalDefaults();
  const [previous] = await db
    .select()
    .from(notificationGlobalSettings)
    .where(eq(notificationGlobalSettings.notificationType, notificationType))
    .limit(1);
  const [updated] = await db
    .update(notificationGlobalSettings)
    .set({ enabled, updatedAt: new Date(), updatedBy: adminUserId })
    .where(eq(notificationGlobalSettings.notificationType, notificationType))
    .returning();
  if (!updated) return null;
  if ((previous?.enabled ?? true) !== enabled) {
    await db.insert(notificationAuditLog).values({
      adminUserId,
      notificationType,
      previousValue: previous?.enabled ?? true,
      newValue: enabled,
    });
  }
  return updated;
}

export async function canSendNotification(userId: string, notificationType: string) {
  if (!isNotificationType(notificationType)) return false;
  await ensureGlobalDefaults();
  const [globalSetting] = await db
    .select()
    .from(notificationGlobalSettings)
    .where(eq(notificationGlobalSettings.notificationType, notificationType))
    .limit(1);
  if (!globalSetting?.enabled) return false;
  const preferences = await ensureUserNotificationPreferences(userId);
  return preferenceEnabled(preferences, notificationType);
}

export async function registerPushToken(input: {
  userId: string;
  token: string;
  platform: string;
  deviceIdentifier?: string | null;
}) {
  const [record] = await db
    .insert(pushTokens)
    .values({
      userId: input.userId,
      token: input.token,
      platform: input.platform,
      deviceIdentifier: input.deviceIdentifier ?? null,
      isActive: true,
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: pushTokens.token,
      set: {
        userId: input.userId,
        platform: input.platform,
        deviceIdentifier: input.deviceIdentifier ?? null,
        isActive: true,
        updatedAt: new Date(),
      },
    })
    .returning({
      id: pushTokens.id,
      token: pushTokens.token,
      platform: pushTokens.platform,
      isActive: pushTokens.isActive,
    });
  return record;
}

export async function deactivatePushToken(userId: string, token?: string) {
  const conditions = token
    ? and(eq(pushTokens.userId, userId), eq(pushTokens.token, token))
    : eq(pushTokens.userId, userId);
  await db
    .update(pushTokens)
    .set({ isActive: false, updatedAt: new Date() })
    .where(conditions);
}

export async function listUserNotifications(userId: string, limit: number) {
  const safeLimit = Math.max(1, Math.min(limit, 100));
  return db
    .select({
      id: notifications.id,
      userId: notifications.userId,
      notificationType: notifications.notificationType,
      title: notifications.title,
      body: notifications.body,
      data: notifications.payload,
      isRead: notifications.isRead,
      createdAt: notifications.createdAt,
      sentAt: notifications.sentAt,
      deliveryStatus: notifications.deliveryStatus,
    })
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(safeLimit);
}

export async function markNotificationRead(userId: string, notificationId: number) {
  const [record] = await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
    .returning({ id: notifications.id });
  return record ?? null;
}

export async function markAllNotificationsRead(userId: string) {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}

function isExpoPushToken(token: string) {
  return /^(Exponent|Expo)PushToken\[[^\]]+\]$/.test(token);
}

type ExpoPushMessage = {
  to: string;
  title: string;
  body: string;
  data: Record<string, unknown>;
  sound: "default";
  channelId: "default";
};

type ExpoPushTicket = {
  status: "ok" | "error";
  details?: { error?: string };
};

async function sendExpoPushMessages(messages: ExpoPushMessage[]) {
  const response = await fetch(EXPO_PUSH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(messages),
  });
  if (!response.ok) {
    throw new Error(`Expo Push Service returned ${response.status}`);
  }
  const payload = (await response.json()) as { data?: ExpoPushTicket[] };
  return payload.data ?? [];
}

export async function createAndSendNotification(input: {
  recipientId: string;
  actorId?: string | null;
  notificationType: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
  dedupeKey?: string | null;
}) {
  if (!isNotificationType(input.notificationType)) {
    return { created: false, reason: "unknown_type" as const };
  }
  if (input.actorId && input.actorId === input.recipientId) {
    return { created: false, reason: "self_action" as const };
  }
  if (!(await canSendNotification(input.recipientId, input.notificationType))) {
    return { created: false, reason: "disabled" as const };
  }

  const [record] = await db
    .insert(notifications)
    .values({
      userId: input.recipientId,
      notificationType: input.notificationType,
      title: input.title.trim().slice(0, 120),
      body: input.body.trim().slice(0, 500),
      payload: input.data ?? {},
      dedupeKey: input.dedupeKey ?? null,
    })
    .onConflictDoNothing({ target: notifications.dedupeKey })
    .returning({ id: notifications.id });
  if (!record) return { created: false, reason: "duplicate" as const };

  const activeTokens = await db
    .select({ id: pushTokens.id, token: pushTokens.token })
    .from(pushTokens)
    .where(and(eq(pushTokens.userId, input.recipientId), eq(pushTokens.isActive, true)));
  const validTokens = activeTokens.filter((candidate) => isExpoPushToken(candidate.token));
  if (validTokens.length === 0) {
    await db
      .update(notifications)
      .set({ deliveryStatus: "no_device" })
      .where(eq(notifications.id, record.id));
    return { created: true, sent: 0, notificationId: record.id };
  }

  let sent = 0;
  let hadFailure = false;
  const now = new Date();
  const pushData = { ...(input.data ?? {}), notificationId: record.id };
  try {
    for (let offset = 0; offset < validTokens.length; offset += EXPO_BATCH_SIZE) {
      const batch = validTokens.slice(offset, offset + EXPO_BATCH_SIZE);
      const tickets = await sendExpoPushMessages(
        batch.map((candidate) => ({
          to: candidate.token,
          title: input.title,
          body: input.body,
          data: pushData,
          sound: "default",
          channelId: "default",
        })),
      );
      const successfulIds: number[] = [];
      for (let i = 0; i < tickets.length; i += 1) {
        const ticket = tickets[i];
        const token = batch[i];
        if (ticket?.status === "ok") {
          sent += 1;
          successfulIds.push(token.id);
        } else {
          hadFailure = true;
          if (ticket?.details?.error === "DeviceNotRegistered") {
            await db
              .update(pushTokens)
              .set({ isActive: false, updatedAt: now })
              .where(eq(pushTokens.id, token.id));
          }
        }
      }
      if (successfulIds.length > 0) {
        await db
          .update(pushTokens)
          .set({ lastUsedAt: now, updatedAt: now })
          .where(inArray(pushTokens.id, successfulIds));
      }
    }
    await db
      .update(notifications)
      .set({
        sentAt: sent > 0 ? now : null,
        deliveryStatus: sent > 0 && hadFailure ? "partial" : sent > 0 ? "sent" : "failed",
      })
      .where(eq(notifications.id, record.id));
  } catch {
    await db
      .update(notifications)
      .set({ deliveryStatus: sent > 0 ? "partial" : "failed" })
      .where(eq(notifications.id, record.id));
  }

  return { created: true, sent, notificationId: record.id };
}

export async function createAnnouncement(input: {
  actorId: string;
  title: string;
  body: string;
  data?: Record<string, unknown>;
}) {
  const recipients = await db
    .select({ userId: notificationPreferences.userId })
    .from(notificationPreferences);
  const results = [];
  for (const recipient of recipients) {
    results.push(
      await createAndSendNotification({
        recipientId: recipient.userId,
        actorId: input.actorId,
        notificationType: "announcements",
        title: input.title,
        body: input.body,
        data: input.data,
        dedupeKey: `announcement:${input.actorId}:${Date.now()}:${recipient.userId}`,
      }),
    );
  }
  return results;
}
