import { Router, type IRouter, type Request, type Response } from "express";
import { getAuth } from "@clerk/express";
import {
  NOTIFICATION_TYPES,
  createAnnouncement,
  createAndSendNotification,
  deactivatePushToken,
  ensureUserNotificationPreferences,
  getGlobalNotificationSettings,
  listUserNotifications,
  listNotificationAuditLog,
  markAllNotificationsRead,
  markNotificationRead,
  registerPushToken,
  updateGlobalNotificationSetting,
  updateUserNotificationPreferences,
} from "../services/notifications";
import { rateLimit } from "../middleware/rateLimit";

const router: IRouter = Router();
router.use("/notifications/events", rateLimit({ windowMs: 60_000, max: 30 }));
router.use("/notifications/admin/announcements", rateLimit({ windowMs: 60_000, max: 5 }));

function requireUser(req: Request, res: Response) {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  return userId;
}

function isAdmin(req: Request) {
  const auth = getAuth(req);
  if (!auth.userId) return false;

  const configuredIds = `${process.env.COCHETALK_ADMIN_USER_IDS ?? ""},${process.env.CLERK_ADMIN_USER_IDS ?? ""}`
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (configuredIds.includes(auth.userId)) return true;

  const claims = auth.sessionClaims as Record<string, unknown> | null | undefined;
  const metadata = (claims?.metadata ?? claims?.publicMetadata) as Record<string, unknown> | undefined;
  if (metadata?.role === "Admin") return true;

  const configuredEmails = (process.env.CLERK_ADMIN_EMAILS ?? "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const email =
    typeof claims?.email === "string"
      ? claims.email.toLowerCase()
      : Array.isArray(claims?.email_addresses) &&
          typeof claims.email_addresses[0] === "object" &&
          claims.email_addresses[0] !== null &&
          "email_address" in claims.email_addresses[0] &&
          typeof claims.email_addresses[0].email_address === "string"
        ? claims.email_addresses[0].email_address.toLowerCase()
        : "";
  return Boolean(email && configuredEmails.includes(email));
}

function requireAdmin(req: Request, res: Response) {
  const userId = requireUser(req, res);
  if (!userId) return null;
  if (!isAdmin(req)) {
    res.status(403).json({ error: "Admin authorization required" });
    return null;
  }
  return userId;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

router.get("/notifications/preferences", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  try {
    const [preferences, globalSettings] = await Promise.all([
      ensureUserNotificationPreferences(userId),
      getGlobalNotificationSettings(),
    ]);
    res.json({ preferences, globalSettings });
  } catch (error) {
    req.log.error({ error }, "Failed to load notification preferences");
    res.status(500).json({ error: "Failed to load notification preferences" });
  }
});

router.patch("/notifications/preferences", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId || !isRecord(req.body)) return;

  const allowedKeys = [
    "newAnswersEnabled",
    "commentsRepliesEnabled",
    "newMessagesEnabled",
    "marketplaceUpdatesEnabled",
    "providerUpdatesEnabled",
    "announcementsEnabled",
    "systemNotificationsEnabled",
  ] as const;
  const updates: Partial<Record<(typeof allowedKeys)[number], boolean>> = {};
  for (const key of allowedKeys) {
    if (key in req.body && typeof req.body[key] === "boolean") {
      updates[key] = req.body[key] as boolean;
    }
  }
  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "At least one valid preference is required" });
    return;
  }

  try {
    const preferences = await updateUserNotificationPreferences(userId, updates);
    res.json({ preferences });
  } catch (error) {
    req.log.error({ error }, "Failed to update notification preferences");
    res.status(500).json({ error: "Failed to update notification preferences" });
  }
});

router.post("/notifications/push-tokens", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId || !isRecord(req.body)) return;
  const token = typeof req.body.token === "string" ? req.body.token.trim() : "";
  const platform = typeof req.body.platform === "string" ? req.body.platform.trim().slice(0, 30) : "";
  const deviceIdentifier =
    typeof req.body.deviceIdentifier === "string" ? req.body.deviceIdentifier.trim().slice(0, 200) : null;
  if (!token || !platform || !/^(Exponent|Expo)PushToken\[[^\]]+\]$/.test(token)) {
    res.status(400).json({ error: "A valid Expo push token and platform are required" });
    return;
  }
  try {
    const pushToken = await registerPushToken({ userId, token, platform, deviceIdentifier });
    res.status(201).json({ pushToken });
  } catch (error) {
    req.log.error({ error }, "Failed to register push token");
    res.status(500).json({ error: "Failed to register push token" });
  }
});

router.delete("/notifications/push-tokens", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const token = typeof req.body?.token === "string" ? req.body.token.trim() : undefined;
  try {
    await deactivatePushToken(userId, token);
    res.status(204).send();
  } catch (error) {
    req.log.error({ error }, "Failed to deactivate push token");
    res.status(500).json({ error: "Failed to deactivate push token" });
  }
});

router.get("/notifications", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const rawLimit = Number(req.query.limit ?? 50);
  const limit = Number.isFinite(rawLimit) ? rawLimit : 50;
  try {
    const notificationRows = await listUserNotifications(userId, limit);
    res.json({ notifications: notificationRows });
  } catch (error) {
    req.log.error({ error }, "Failed to load notifications");
    res.status(500).json({ error: "Failed to load notifications" });
  }
});

router.post("/notifications/:id/read", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const notificationId = Number(req.params.id);
  if (!Number.isInteger(notificationId) || notificationId <= 0) {
    res.status(400).json({ error: "Invalid notification id" });
    return;
  }
  try {
    const notification = await markNotificationRead(userId, notificationId);
    if (!notification) {
      res.status(404).json({ error: "Notification not found" });
      return;
    }
    res.status(204).send();
  } catch (error) {
    req.log.error({ error }, "Failed to mark notification read");
    res.status(500).json({ error: "Failed to mark notification read" });
  }
});

router.post("/notifications/read-all", async (req, res) => {
  const userId = requireUser(req, res);
  if (!userId) return;
  try {
    await markAllNotificationsRead(userId);
    res.status(204).send();
  } catch (error) {
    req.log.error({ error }, "Failed to mark all notifications read");
    res.status(500).json({ error: "Failed to mark all notifications read" });
  }
});

router.get("/notifications/admin/global", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  try {
    res.json({ settings: await getGlobalNotificationSettings() });
  } catch (error) {
    req.log.error({ error }, "Failed to load global notification settings");
    res.status(500).json({ error: "Failed to load global notification settings" });
  }
});

router.get("/notifications/admin/audit", async (req, res) => {
  if (!requireAdmin(req, res)) return;
  const rawLimit = Number(req.query.limit ?? 50);
  const limit = Number.isFinite(rawLimit) ? rawLimit : 50;
  try {
    res.json({ auditLog: await listNotificationAuditLog(limit) });
  } catch (error) {
    req.log.error({ error }, "Failed to load notification audit log");
    res.status(500).json({ error: "Failed to load notification audit log" });
  }
});

router.patch("/notifications/admin/global/:type", async (req, res) => {
  const adminUserId = requireAdmin(req, res);
  if (!adminUserId || !isRecord(req.body) || typeof req.body.enabled !== "boolean") {
    if (adminUserId) res.status(400).json({ error: "enabled must be a boolean" });
    return;
  }
  const type = req.params.type;
  if (!(type in NOTIFICATION_TYPES)) {
    res.status(400).json({ error: "Unknown notification type" });
    return;
  }
  try {
    const setting = await updateGlobalNotificationSetting(type, req.body.enabled, adminUserId);
    res.json({ setting });
  } catch (error) {
    req.log.error({ error }, "Failed to update global notification setting");
    res.status(500).json({ error: "Failed to update global notification setting" });
  }
});

router.post("/notifications/admin/announcements", async (req, res) => {
  const adminUserId = requireAdmin(req, res);
  if (!adminUserId || !isRecord(req.body)) return;
  const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
  const body = typeof req.body.body === "string" ? req.body.body.trim() : "";
  const screen = typeof req.body.screen === "string" ? req.body.screen.trim().slice(0, 100) : undefined;
  if (!title || !body) {
    res.status(400).json({ error: "title and body are required" });
    return;
  }
  try {
    const results = await createAnnouncement({
      actorId: adminUserId,
      title,
      body,
      data: screen ? { screen } : undefined,
    });
    res.status(201).json({
      recipients: results.length,
      sent: results.reduce((sum, result) => sum + (result.sent ?? 0), 0),
    });
  } catch (error) {
    req.log.error({ error }, "Failed to send announcement");
    res.status(500).json({ error: "Failed to send announcement" });
  }
});

router.post("/notifications/events", async (req, res) => {
  const actorId = requireUser(req, res);
  if (!actorId || !isRecord(req.body)) return;
  const notificationType = typeof req.body.notificationType === "string" ? req.body.notificationType : "";
  const recipientId = typeof req.body.recipientId === "string" ? req.body.recipientId.trim() : "";
  const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
  const body = typeof req.body.body === "string" ? req.body.body.trim() : "";
  const dedupeKey = typeof req.body.dedupeKey === "string" ? req.body.dedupeKey.trim().slice(0, 250) : undefined;
  const data = isRecord(req.body.data) ? req.body.data : undefined;
  if (
    !recipientId ||
    !title ||
    !body ||
    !["new_answers", "comments_replies", "new_messages", "marketplace_updates", "provider_updates"].includes(
      notificationType,
    )
  ) {
    res.status(400).json({ error: "Invalid notification event" });
    return;
  }
  try {
    const result = await createAndSendNotification({
      actorId,
      recipientId,
      notificationType,
      title,
      body,
      data,
      dedupeKey,
    });
    res.status(202).json(result);
  } catch (error) {
    req.log.error({ error }, "Failed to create notification event");
    res.status(500).json({ error: "Failed to create notification event" });
  }
});

export default router;