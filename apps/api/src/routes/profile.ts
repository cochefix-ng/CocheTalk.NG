import { getAuth } from "../middleware/authMiddleware";
import { eq } from "drizzle-orm";
import { Router, type IRouter } from "express";
import * as api from "@workspace/api-zod";
import { db, userProfiles, marketplaceListings, questions, discussions } from "@workspace/db";

const router: IRouter = Router();
function getAdminIdentifiers(): Set<string> {
  const ids = (process.env.COCHETALK_ADMIN_USER_IDS ?? "").split(",").map((v) => v.trim().toLowerCase());
  const emails = (process.env.COCHETALK_ADMIN_EMAILS ?? "").split(",").map((v) => v.trim().toLowerCase());
  return new Set([...ids, ...emails].filter(Boolean));
}

function checkIsAdmin(userId: string, email?: string | null): boolean {
  const admins = getAdminIdentifiers();
  if (admins.has(userId.toLowerCase())) return true;
  if (email && admins.has(email.toLowerCase())) return true;
  return false;
}

async function ensure(userId: string, email?: string | null) {
  const isAdmin = checkIsAdmin(userId, email);
  let existing = (await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1))[0];
  if (existing) {
    if (isAdmin && !existing.admin) {
      const [updated] = await db.update(userProfiles).set({ admin: true, updatedAt: new Date() }).where(eq(userProfiles.userId, userId)).returning();
      if (updated) existing = updated;
    }
    return existing;
  }
  const [created] = await db.insert(userProfiles)
    .values({ userId, displayName: "Member", accountType: "Car Owner", verified: false, admin: isAdmin, specialization: "" })
    .onConflictDoNothing({ target: userProfiles.userId })
    .returning();
  return created ?? (await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1))[0];
}

function output(profile: typeof userProfiles.$inferSelect, email?: string | null) {
  const isAdmin = profile.admin === true || checkIsAdmin(profile.userId, email);
  return { userId: profile.userId, displayName: profile.displayName, accountType: profile.accountType, verified: profile.verified, admin: isAdmin, specialization: profile.specialization };
}

router.get("/profile", async (req, res) => {
  const auth = getAuth(req);
  if (!auth.userId) return res.status(401).json({ error: "Authentication required" });
  return res.json(api.GetCurrentProfileResponse.parse(output(await ensure(auth.userId, auth.email), auth.email)));
});

router.patch("/profile", async (req, res) => {
  const auth = getAuth(req);
  if (!auth.userId) return res.status(401).json({ error: "Authentication required" });
  const parsed = api.UpdateCurrentProfileBody.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
  const current = await ensure(auth.userId, auth.email);
  const [updated] = await db.update(userProfiles).set({
    displayName: parsed.data.displayName ?? current.displayName,
    accountType: parsed.data.accountType ?? current.accountType,
    specialization: parsed.data.specialization ?? current.specialization,
    updatedAt: new Date(),
  }).where(eq(userProfiles.userId, auth.userId)).returning();
  return res.json(api.UpdateCurrentProfileResponse.parse(output(updated, auth.email)));
});

router.get("/users/:id", async (req, res) => {
  const { id } = req.params;
  const profile = (await db.select().from(userProfiles).where(eq(userProfiles.userId, id)).limit(1))[0];
  if (profile) {
    return res.json({
      id: profile.userId,
      name: profile.displayName,
      role: profile.accountType,
      verified: profile.verified,
      admin: profile.admin,
      specialization: profile.specialization ? profile.specialization.split(",").map((s) => s.trim()).filter(Boolean) : [],
    });
  }

  const listing = (await db.select().from(marketplaceListings).where(eq(marketplaceListings.userId, id)).limit(1))[0];
  if (listing) {
    return res.json({
      id: listing.userId,
      name: listing.userName,
      role: listing.userRole,
      verified: false,
      phone: listing.userPhone,
      businessName: "",
      location: listing.location,
      specialization: [],
    });
  }

  const question = (await db.select().from(questions).where(eq(questions.userId, id)).limit(1))[0];
  if (question) {
    return res.json({
      id: question.userId,
      name: question.userName,
      role: question.userRole,
      verified: question.userVerified,
      specialization: question.userSpecialization ? [question.userSpecialization] : [],
    });
  }

  const discussion = (await db.select().from(discussions).where(eq(discussions.userId, id)).limit(1))[0];
  if (discussion) {
    return res.json({
      id: discussion.userId,
      name: discussion.userName,
      role: discussion.userRole,
      verified: discussion.userVerified,
      specialization: discussion.userSpecialization ? [discussion.userSpecialization] : [],
    });
  }

  return res.status(404).json({ error: "User not found" });
});

router.get("/profile/:id", async (req, res) => {
  const { id } = req.params;
  const profile = (await db.select().from(userProfiles).where(eq(userProfiles.userId, id)).limit(1))[0];
  if (!profile) return res.status(404).json({ error: "User not found" });
  return res.json(output(profile));
});

export default router;