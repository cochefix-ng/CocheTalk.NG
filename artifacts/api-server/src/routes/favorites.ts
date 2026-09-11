import { getAuth } from "@clerk/express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import {
  CheckFavoriteParams,
  CheckFavoriteResponse,
  CreateFavoriteBody,
  DeleteFavoriteParams,
  ListFavoritesQueryParams,
  ListFavoritesResponse,
} from "@workspace/api-zod";
import { answers, db, discussions, favorites, marketplaceListings, questions } from "@workspace/db";
import { canViewDiscussion, canViewListing, canViewQuestion, viewerFor, visibleContent } from "../services/contentAccess";

const router: IRouter = Router();
type ContentType = "discussion" | "question" | "answer" | "listing";

function requireUser(req: Request, res: Response): string | null {
  const { userId } = getAuth(req);
  if (!userId) {
    res.status(401).json({ error: "Authentication required" });
    return null;
  }
  return userId;
}

router.post("/favorites", async (req: Request, res: Response): Promise<void> => {
  const userId = requireUser(req, res);
  if (!userId) return;
  const body = CreateFavoriteBody.safeParse(req.body);
  if (!body.success) { req.log.warn({ errors: body.error.issues }, "Invalid favorite request"); res.status(400).json({ error: body.error.message }); return; }
  if (!await visibleContent(body.data.contentType, body.data.contentId, await viewerFor(userId))) { res.status(404).json({ error: "Content not found or unavailable" }); return; }
  try {
    const [created] = await db.insert(favorites).values({ userId, ...body.data }).onConflictDoNothing().returning();
    const favorite = created ?? (await db.select().from(favorites).where(and(eq(favorites.userId, userId), eq(favorites.contentType, body.data.contentType), eq(favorites.contentId, body.data.contentId))).limit(1))[0];
    if (!favorite) { res.status(500).json({ error: "Could not save favorite" }); return; }
    // The contract returns the saved favorite directly; validate it through the
    // generated reusable favorite shape before returning it.
    const validated = CheckFavoriteResponse.parse({ favorited: true, favorite }).favorite;
    res.status(201).json(validated);
  } catch (error) { req.log.error({ error }, "Failed to save favorite"); res.status(500).json({ error: "Failed to save favorite" }); }
});

router.get("/favorites/:contentType/:contentId", async (req: Request, res: Response): Promise<void> => {
  const userId = requireUser(req, res); if (!userId) return;
  const params = CheckFavoriteParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    const favorite = (await db.select().from(favorites).where(and(eq(favorites.userId, userId), eq(favorites.contentType, params.data.contentType), eq(favorites.contentId, params.data.contentId))).limit(1))[0];
    res.json(CheckFavoriteResponse.parse({ favorited: Boolean(favorite), ...(favorite ? { favorite } : {}) }));
  } catch (error) { req.log.error({ error }, "Failed to check favorite"); res.status(500).json({ error: "Failed to check favorite" }); }
});

router.delete("/favorites/:contentType/:contentId", async (req: Request, res: Response): Promise<void> => {
  const userId = requireUser(req, res); if (!userId) return;
  const params = DeleteFavoriteParams.safeParse(req.params);
  if (!params.success) { res.status(400).json({ error: params.error.message }); return; }
  try {
    await db.delete(favorites).where(and(eq(favorites.userId, userId), eq(favorites.contentType, params.data.contentType), eq(favorites.contentId, params.data.contentId)));
    res.status(204).send();
  } catch (error) { req.log.error({ error }, "Failed to remove favorite"); res.status(500).json({ error: "Failed to remove favorite" }); }
});

router.get("/favorites", async (req: Request, res: Response): Promise<void> => {
  const userId = requireUser(req, res); if (!userId) return;
  const query = ListFavoritesQueryParams.safeParse(req.query);
  if (!query.success) { res.status(400).json({ error: query.error.message }); return; }
  const limit = query.data.limit ?? 100, offset = query.data.offset ?? 0, type = query.data.contentType;
  try {
    const saved = await db.select().from(favorites).where(type ? and(eq(favorites.userId, userId), eq(favorites.contentType, type)) : eq(favorites.userId, userId)).orderBy(desc(favorites.createdAt)).limit(limit).offset(offset);
    const ids = (kind: ContentType) => saved.filter((f) => f.contentType === kind).map((f) => f.contentId);
    const viewer = await viewerFor(userId);
    const [questionRows, answerRows, discussionRows, listingRows] = await Promise.all([
      ids("question").length ? db.select().from(questions).where(inArray(questions.id, ids("question"))) : [],
      ids("answer").length ? db.select().from(answers).where(inArray(answers.id, ids("answer"))) : [],
      ids("discussion").length ? db.select().from(discussions).where(inArray(discussions.id, ids("discussion"))) : [],
      ids("listing").length ? db.select().from(marketplaceListings).where(inArray(marketplaceListings.id, ids("listing"))) : [],
    ]);
    const lookup = new Map<string, unknown>();
    const answerQuestionIds = answerRows.map((row) => row.questionId);
    const answerParents = answerQuestionIds.length ? await db.select().from(questions).where(inArray(questions.id, answerQuestionIds)) : [];
    const parentById = new Map(answerParents.map((row) => [row.id, row]));
    for (const row of questionRows) if (canViewQuestion(row, viewer)) lookup.set(`question:${row.id}`, row);
    for (const row of answerRows) { const parent=parentById.get(row.questionId); if (parent && canViewQuestion(parent,viewer)) lookup.set(`answer:${row.id}`, row); }
    for (const row of discussionRows) if (canViewDiscussion(row, viewer)) lookup.set(`discussion:${row.id}`, row);
    for (const row of listingRows) if (canViewListing(row, viewer)) lookup.set(`listing:${row.id}`, row);
    res.json(ListFavoritesResponse.parse({ items: saved.map((favorite) => ({ favorite, available: lookup.has(`${favorite.contentType}:${favorite.contentId}`), item: lookup.get(`${favorite.contentType}:${favorite.contentId}`) ?? null })), limit, offset }));
  } catch (error) { req.log.error({ error }, "Failed to list favorites"); res.status(500).json({ error: "Failed to list favorites" }); }
});

export default router;