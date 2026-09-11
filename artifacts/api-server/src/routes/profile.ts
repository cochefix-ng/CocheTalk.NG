import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import * as api from "@workspace/api-zod";
import { db, userProfiles } from "@workspace/db";

const router: IRouter = Router();
const admins = new Set((process.env.COCHETALK_ADMIN_USER_IDS ?? "").split(",").map((value) => value.trim()).filter(Boolean));

async function ensure(userId: string) {
  const existing = (await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1))[0];
  if (existing) return existing;
  const [created] = await db.insert(userProfiles)
    .values({ userId, displayName: "Member", accountType: "Car Owner", verified: false, admin: admins.has(userId), specialization: "" })
    .onConflictDoNothing({ target: userProfiles.userId })
    .returning();
  return created ?? (await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1))[0];
}

function output(profile: typeof userProfiles.$inferSelect) {
  return { userId: profile.userId, displayName: profile.displayName, accountType: profile.accountType, verified: profile.verified, admin: profile.admin, specialization: profile.specialization };
}

router.get("/profile", async (req, res) => {
  const userId = getAuth(req).userId;
  if (!userId) return res.status(401).json({ error: "Authentication required" });
  return res.json(api.GetCurrentProfileResponse.parse(output(await ensure(userId))));
});

router.patch("/profile", async (req, res) => {
  const userId = getAuth(req).userId;
  if (!userId) return res.status(401).json({ error: "Authentication required" });
  const parsed = api.UpdateCurrentProfileBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const current = await ensure(userId);
  const [updated] = await db.update(userProfiles).set({
    displayName: parsed.data.displayName ?? current.displayName,
    accountType: parsed.data.accountType ?? current.accountType,
    specialization: parsed.data.specialization ?? current.specialization,
    updatedAt: new Date(),
  }).where(eq(userProfiles.userId, userId)).returning();
  return res.json(api.UpdateCurrentProfileResponse.parse(output(updated)));
});

export default router;