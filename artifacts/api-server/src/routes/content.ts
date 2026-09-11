import { getAuth } from "@clerk/express";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { Router, type IRouter, type Request, type Response } from "express";
import * as api from "@workspace/api-zod";
import { answers, comments, db, discussionComments, discussions, marketplaceListings, questions, userProfiles } from "@workspace/db";
import { deleteAnswerGraph, deleteDiscussionGraph, deleteQuestionGraph, viewerFor, visibleAnswer, visibleDiscussion, visibleListing, visibleQuestion } from "../services/contentAccess";

const router: IRouter = Router();
const schema = (name: string) => (api as unknown as Record<string, { parse(value: unknown): any; safeParse(value: unknown): any }>)[name];
function authenticated(req: Request, res: Response) { const value = getAuth(req).userId; if (!value) { res.status(401).json({ error: "Authentication required" }); return null; } return value; }
function parsed(schemaName: string, value: unknown, res: Response) { const result = schema(schemaName).safeParse(value); if (!result.success) { res.status(400).json({ error: result.error.message }); return null; } return result.data; }
const q = (r: any) => ({ ...r, timestamp: r.createdAt.getTime(), acceptedAnswerId: r.acceptedAnswerId ?? null });
const a = (r: any) => ({ ...r, timestamp: r.createdAt.getTime() });
const d = (r: any) => ({ ...r, timestamp: r.createdAt.getTime(), title: r.title ?? null });
const l = (r: any) => ({ ...r, price: Number(r.price), timestamp: r.createdAt.getTime() });
const c = (r: any) => ({ ...r, timestamp: r.createdAt.getTime() });

async function author(userId: string) {
  const profile = (await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1))[0];
  return { userId, userName: profile?.displayName ?? "Member", userRole: profile?.accountType ?? "Car Owner", userSpecialization: profile?.specialization ?? "", userVerified: profile?.verified === true };
}

async function toggle(table: any, rowId: number, userId: string, map: (row: any) => any, output: string, res: Response, canView: (row: any) => Promise<boolean>) {
  const row = (await db.select().from(table).where(eq(table.id, rowId)).limit(1))[0];
  if (!row || !(await canView(row))) return res.status(404).json({ error: "Content not found" });
  const voters = row.upvotedBy.includes(userId) ? row.upvotedBy.filter((x: string) => x !== userId) : [...row.upvotedBy, userId];
  const [updated] = await db.update(table).set({ upvotedBy: voters, upvotes: voters.length, updatedAt: new Date() }).where(eq(table.id, rowId)).returning();
  return res.json(schema(output).parse(map(updated)));
}

router.get("/content/bootstrap", async (req, res) => {
  const userId = authenticated(req, res); if (!userId) return;
  const viewer = await viewerFor(userId);
  const [questionRows, discussionRows, listingRows] = await Promise.all([
    db.select().from(questions).orderBy(desc(questions.createdAt)),
    db.select().from(discussions).orderBy(desc(discussions.createdAt)),
    db.select().from(marketplaceListings).orderBy(desc(marketplaceListings.createdAt)),
  ]);
  const visibleQuestions = questionRows.filter((row) => !row.isPrivateEcosystem || row.userId === userId || viewer.isAdmin || viewer.isVerifiedProvider);
  const visibleDiscussions = discussionRows.filter((row) => !row.isProCircle || row.userId === userId || viewer.isAdmin || viewer.isVerifiedProvider);
  const visibleListings = listingRows.filter((row) => row.isApproved || row.userId === userId || viewer.isAdmin);
  const questionIds = visibleQuestions.map((row) => row.id);
  const discussionIds = visibleDiscussions.map((row) => row.id);
  const answerRows = questionIds.length ? await db.select().from(answers).where(inArray(answers.questionId, questionIds)).orderBy(answers.createdAt) : [];
  const answerIds = answerRows.map((row) => row.id);
  const commentRows = questionIds.length || answerIds.length
    ? await db.select().from(comments).where(or(
      questionIds.length ? and(inArray(comments.questionOrAnswerId, questionIds), eq(comments.isAnswer, false)) : undefined,
      answerIds.length ? and(inArray(comments.questionOrAnswerId, answerIds), eq(comments.isAnswer, true)) : undefined,
    ))
    : [];
  const discussionCommentRows = discussionIds.length
    ? await db.select().from(discussionComments).where(inArray(discussionComments.postId, discussionIds)).orderBy(discussionComments.createdAt)
    : [];
  return res.json(schema("GetContentBootstrapResponse").parse({
    questions: visibleQuestions.map(q),
    answers: answerRows.map(a),
    comments: commentRows.map(c),
    discussions: visibleDiscussions.map(d),
    discussionComments: discussionCommentRows.map(c),
    listings: visibleListings.map(l),
  }));
});

router.get("/questions", async (req, res) => {
  const userId = authenticated(req, res); if (!userId) return;
  const p = parsed("ListQuestionsQueryParams", req.query, res); if (!p) return;
  const viewer = await viewerFor(userId);
  const rows = await db.select().from(questions).orderBy(desc(questions.createdAt));
  const visible = rows.filter((row) => !row.isPrivateEcosystem || row.userId === viewer.userId || viewer.isAdmin || viewer.isVerifiedProvider);
  res.json(schema("ListQuestionsResponse").parse({ items: visible.slice(p.offset, p.offset + p.limit).map(q), limit: p.limit, offset: p.offset }));
});

router.post("/questions", async (req, res) => {
  const userId = authenticated(req, res); if (!userId) return;
  const body = parsed("CreateQuestionBody", req.body, res); if (!body) return;
  const [row] = await db.insert(questions).values({ ...body, ...await author(userId) }).returning();
  res.status(201).json(schema("GetQuestionResponse").parse(q(row)));
});

router.get("/questions/:id", async (req, res) => {
  const userId = authenticated(req, res); if (!userId) return;
  const p = parsed("GetQuestionParams", req.params, res); if (!p) return;
  const row = await visibleQuestion(p.id, await viewerFor(userId));
  if (!row) return res.status(404).json({ error: "Question not found" });
  return res.json(schema("GetQuestionResponse").parse(q(row)));
});

router.delete("/questions/:id", async (req, res) => {
  const userId = authenticated(req, res); if (!userId) return;
  const p = parsed("DeleteQuestionParams", req.params, res); if (!p) return;
  const row = await deleteQuestionGraph(p.id, userId);
  if (!row) return res.status(404).json({ error: "Question not found" });
  return res.status(204).send();
});

router.post("/questions/:id/upvote", async (req, res) => {
  const userId = authenticated(req, res); if (!userId) return;
  const p = parsed("UpvoteQuestionParams", req.params, res); if (!p) return;
  return toggle(questions, p.id, userId, q, "UpvoteQuestionResponse", res, async (row) => Boolean(await visibleQuestion(row.id, await viewerFor(userId))));
});

router.get("/questions/:id/answers", async (req, res) => {
  const userId = authenticated(req, res); if (!userId) return;
  const p = parsed("ListQuestionAnswersParams", req.params, res); if (!p) return;
  if (!await visibleQuestion(p.id, await viewerFor(userId))) return res.status(404).json({ error: "Question not found" });
  const rows = await db.select().from(answers).where(eq(answers.questionId, p.id)).orderBy(answers.createdAt);
  return res.json(schema("ListQuestionAnswersResponse").parse({ items: rows.map(a) }));
});

router.post("/questions/:id/answers", async (req, res) => {
  const userId = authenticated(req, res); if (!userId) return;
  const p = parsed("CreateAnswerParams", req.params, res); const body = parsed("CreateAnswerBody", req.body, res); if (!p || !body) return;
  if (!await visibleQuestion(p.id, await viewerFor(userId))) return res.status(404).json({ error: "Question not found" });
  const [row] = await db.insert(answers).values({ questionId: p.id, content: body.content, ...await author(userId) }).returning();
  return res.status(201).json(schema("GetAnswerResponse").parse(a(row)));
});

router.post("/questions/:questionId/answers/:answerId/accept", async (req, res) => {
  const userId = authenticated(req, res); if (!userId) return;
  const p = parsed("AcceptQuestionAnswerParams", req.params, res); if (!p) return;
  const result = await db.transaction(async (tx) => {
    const question = (await tx.select().from(questions).where(and(eq(questions.id, p.questionId), eq(questions.userId, userId))).limit(1))[0];
    if (!question) return null;
    const answer = (await tx.select().from(answers).where(and(eq(answers.id, p.answerId), eq(answers.questionId, question.id))).limit(1))[0];
    if (!answer) return null;
    await tx.update(answers).set({ isAccepted: false, updatedAt: new Date() }).where(eq(answers.questionId, question.id));
    const [updated] = await tx.update(answers).set({ isAccepted: true, updatedAt: new Date() }).where(eq(answers.id, answer.id)).returning();
    await tx.update(questions).set({ acceptedAnswerId: answer.id, updatedAt: new Date() }).where(eq(questions.id, question.id));
    return updated;
  });
  if (!result) return res.status(404).json({ error: "Question or answer not found" });
  return res.json(schema("AcceptQuestionAnswerResponse").parse(a(result)));
});

router.get("/answers/:id", async (req, res) => {
  const userId = authenticated(req, res); if (!userId) return;
  const p = parsed("GetAnswerParams", req.params, res); if (!p) return;
  const row = await visibleAnswer(p.id, await viewerFor(userId));
  if (!row) return res.status(404).json({ error: "Answer not found" });
  return res.json(schema("GetAnswerResponse").parse(a(row)));
});

router.delete("/answers/:id", async (req, res) => {
  const userId = authenticated(req, res); if (!userId) return;
  const p = parsed("DeleteAnswerParams", req.params, res); if (!p) return;
  if (!await deleteAnswerGraph(p.id, userId)) return res.status(404).json({ error: "Answer not found" });
  return res.status(204).send();
});

router.post("/answers/:id/upvote", async (req, res) => {
  const userId = authenticated(req, res); if (!userId) return;
  const p = parsed("UpvoteAnswerParams", req.params, res); if (!p) return;
  return toggle(answers, p.id, userId, a, "UpvoteAnswerResponse", res, async (row) => Boolean(await visibleAnswer(row.id, await viewerFor(userId))));
});

async function parentVisible(id: number, isAnswer: boolean, userId: string) {
  return isAnswer ? Boolean(await visibleAnswer(id, await viewerFor(userId))) : Boolean(await visibleQuestion(id, await viewerFor(userId)));
}
function commentRoutes(path: string, isAnswer: boolean, params: string, listResponse: string, createBody: string) {
  router.get(path, async (req, res) => {
    const userId = authenticated(req, res); if (!userId) return;
    const p = parsed(params, req.params, res); if (!p) return;
    if (!await parentVisible(p.id, isAnswer, userId)) return res.status(404).json({ error: "Parent not found" });
    const rows = await db.select().from(comments).where(and(eq(comments.questionOrAnswerId, p.id), eq(comments.isAnswer, isAnswer))).orderBy(comments.createdAt);
    return res.json(schema(listResponse).parse({ items: rows.map(c) }));
  });
  router.post(path, async (req, res) => {
    const userId = authenticated(req, res); if (!userId) return;
    const p = parsed(params, req.params, res); const body = parsed(createBody, req.body, res); if (!p || !body) return;
    if (!await parentVisible(p.id, isAnswer, userId)) return res.status(404).json({ error: "Parent not found" });
    const profile = await author(userId);
    const [row] = await db.insert(comments).values({ questionOrAnswerId: p.id, isAnswer, userId, userName: profile.userName, content: body.content }).returning();
    return res.status(201).json(schema(listResponse).parse({ items: [c(row)] }));
  });
}
commentRoutes("/questions/:id/comments", false, "ListQuestionCommentsParams", "ListQuestionCommentsResponse", "CreateQuestionCommentBody");
commentRoutes("/answers/:id/comments", true, "ListAnswerCommentsParams", "ListAnswerCommentsResponse", "CreateAnswerCommentBody");

router.get("/discussions", async (req, res) => {
  const userId = authenticated(req, res); if (!userId) return;
  const p = parsed("ListDiscussionsQueryParams", req.query, res); if (!p) return;
  const viewer = await viewerFor(userId);
  const rows = await db.select().from(discussions).orderBy(desc(discussions.createdAt));
  const visible = rows.filter((row) => !row.isProCircle || row.userId === userId || viewer.isAdmin || viewer.isVerifiedProvider);
  return res.json(schema("ListDiscussionsResponse").parse({ items: visible.slice(p.offset, p.offset + p.limit).map(d), limit: p.limit, offset: p.offset }));
});

router.post("/discussions", async (req, res) => {
  const userId = authenticated(req, res); if (!userId) return;
  const body = parsed("CreateDiscussionBody", req.body, res); if (!body) return;
  const [row] = await db.insert(discussions).values({ ...body, ...await author(userId) }).returning();
  return res.status(201).json(schema("GetDiscussionResponse").parse(d(row)));
});

router.get("/discussions/:id", async (req, res) => {
  const userId = authenticated(req, res); if (!userId) return;
  const p = parsed("GetDiscussionParams", req.params, res); if (!p) return;
  const row = await visibleDiscussion(p.id, await viewerFor(userId));
  if (!row) return res.status(404).json({ error: "Discussion not found" });
  return res.json(schema("GetDiscussionResponse").parse(d(row)));
});

router.delete("/discussions/:id", async (req, res) => {
  const userId = authenticated(req, res); if (!userId) return;
  const p = parsed("DeleteDiscussionParams", req.params, res); if (!p) return;
  if (!await deleteDiscussionGraph(p.id, userId)) return res.status(404).json({ error: "Discussion not found" });
  return res.status(204).send();
});

router.post("/discussions/:id/upvote", async (req, res) => {
  const userId = authenticated(req, res); if (!userId) return;
  const p = parsed("UpvoteDiscussionParams", req.params, res); if (!p) return;
  return toggle(discussions, p.id, userId, d, "UpvoteDiscussionResponse", res, async (row) => Boolean(await visibleDiscussion(row.id, await viewerFor(userId))));
});

router.get("/discussions/:id/comments", async (req, res) => {
  const userId = authenticated(req, res); if (!userId) return;
  const p = parsed("ListDiscussionCommentsParams", req.params, res); if (!p) return;
  if (!await visibleDiscussion(p.id, await viewerFor(userId))) return res.status(404).json({ error: "Discussion not found" });
  const rows = await db.select().from(discussionComments).where(eq(discussionComments.postId, p.id)).orderBy(discussionComments.createdAt);
  return res.json(schema("ListDiscussionCommentsResponse").parse({ items: rows.map(c) }));
});

router.post("/discussions/:id/comments", async (req, res) => {
  const userId = authenticated(req, res); if (!userId) return;
  const p = parsed("CreateDiscussionCommentParams", req.params, res); const body = parsed("CreateDiscussionCommentBody", req.body, res); if (!p || !body) return;
  if (!await visibleDiscussion(p.id, await viewerFor(userId))) return res.status(404).json({ error: "Discussion not found" });
  const profile = await author(userId);
  const [row] = await db.insert(discussionComments).values({ postId: p.id, userId, userName: profile.userName, content: body.content }).returning();
  return res.status(201).json(schema("ListDiscussionCommentsResponse").parse({ items: [c(row)] }));
});

router.get("/listings", async (req, res) => {
  const userId = authenticated(req, res); if (!userId) return;
  const p = parsed("ListListingsQueryParams", req.query, res); if (!p) return;
  const viewer = await viewerFor(userId);
  const rows = await db.select().from(marketplaceListings).orderBy(desc(marketplaceListings.createdAt));
  const visible = rows.filter((row) => row.isApproved || row.userId === userId || viewer.isAdmin);
  return res.json(schema("ListListingsResponse").parse({ items: visible.slice(p.offset, p.offset + p.limit).map(l), limit: p.limit, offset: p.offset }));
});

router.post("/listings", async (req, res) => {
  const userId = authenticated(req, res); if (!userId) return;
  const body = parsed("CreateListingBody", req.body, res); if (!body) return;
  const imageUris = Array.isArray(body.imageUris) ? body.imageUris : [];
  if (imageUris.some((uri: string) => uri.startsWith("file://") || uri.startsWith("content://"))) {
    return res.status(400).json({ error: "Listing images must be uploaded before creating a listing" });
  }
  const profile = await author(userId);
  const [row] = await db.insert(marketplaceListings).values({ ...body, imageUris, price: String(body.price), ...profile, userPhone: body.userPhone ?? "" }).returning();
  return res.status(201).json(schema("GetListingResponse").parse(l(row)));
});

router.get("/listings/:id", async (req, res) => {
  const userId = authenticated(req, res); if (!userId) return;
  const p = parsed("GetListingParams", req.params, res); if (!p) return;
  const row = await visibleListing(p.id, await viewerFor(userId));
  if (!row) return res.status(404).json({ error: "Listing not found" });
  return res.json(schema("GetListingResponse").parse(l(row)));
});

router.delete("/listings/:id", async (req, res) => {
  const userId = authenticated(req, res); if (!userId) return;
  const p = parsed("DeleteListingParams", req.params, res); if (!p) return;
  const [row] = await db.delete(marketplaceListings).where(and(eq(marketplaceListings.id, p.id), eq(marketplaceListings.userId, userId))).returning();
  if (!row) return res.status(404).json({ error: "Listing not found" });
  return res.status(204).send();
});

for (const [path, param, body] of [["/listings/:id/approval", "SetListingApprovalParams", "SetListingApprovalBody"], ["/listings/:id/featured", "SetListingFeaturedParams", "SetListingFeaturedBody"]] as const) {
  router.patch(path, async (req, res) => {
    const userId = authenticated(req, res); if (!userId) return;
    const p = parsed(param, req.params, res); const b = parsed(body, req.body, res); if (!p || !b) return;
    if (!(await viewerFor(userId)).isAdmin) return res.status(403).json({ error: "Administrator access required" });
    const values = path.endsWith("approval") ? { isApproved: b.approved, updatedAt: new Date() } : { isFeaturedBottom: b.featured, updatedAt: new Date() };
    const [row] = await db.update(marketplaceListings).set(values).where(eq(marketplaceListings.id, p.id)).returning();
    if (!row) return res.status(404).json({ error: "Listing not found" });
    return res.json(schema("GetListingResponse").parse(l(row)));
  });
}

export default router;