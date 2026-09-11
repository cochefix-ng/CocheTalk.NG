import { and, eq } from "drizzle-orm";
import { answers, comments, db, discussionComments, discussions, marketplaceListings, questions, userProfiles } from "@workspace/db";

export type ContentType = "question" | "answer" | "discussion" | "listing";
export type Viewer = { userId: string; isAdmin: boolean; isVerifiedProvider: boolean };

export async function viewerFor(userId: string): Promise<Viewer> {
  const profile = (await db.select().from(userProfiles).where(eq(userProfiles.userId, userId)).limit(1))[0];
  return { userId, isAdmin: profile?.admin === true, isVerifiedProvider: profile?.accountType === "Service Provider" && profile.verified === true };
}
export function canViewQuestion(row: typeof questions.$inferSelect, viewer: Viewer) { return !row.isPrivateEcosystem || row.userId === viewer.userId || viewer.isAdmin || viewer.isVerifiedProvider; }
export function canViewDiscussion(row: typeof discussions.$inferSelect, viewer: Viewer) { return !row.isProCircle || row.userId === viewer.userId || viewer.isAdmin || viewer.isVerifiedProvider; }
export function canViewListing(row: typeof marketplaceListings.$inferSelect, viewer: Viewer) { return row.isApproved || row.userId === viewer.userId || viewer.isAdmin; }
export async function visibleQuestion(id: number, viewer: Viewer) { const row=(await db.select().from(questions).where(eq(questions.id,id)).limit(1))[0]; return row && canViewQuestion(row,viewer) ? row : null; }
export async function visibleAnswer(id: number, viewer: Viewer) { const row=(await db.select().from(answers).where(eq(answers.id,id)).limit(1))[0]; return row && await visibleQuestion(row.questionId,viewer) ? row : null; }
export async function visibleDiscussion(id: number, viewer: Viewer) { const row=(await db.select().from(discussions).where(eq(discussions.id,id)).limit(1))[0]; return row && canViewDiscussion(row,viewer) ? row : null; }
export async function visibleListing(id: number, viewer: Viewer) { const row=(await db.select().from(marketplaceListings).where(eq(marketplaceListings.id,id)).limit(1))[0]; return row && canViewListing(row,viewer) ? row : null; }
export async function visibleContent(type: ContentType, id: number, viewer: Viewer) {
  if (type==="question") return visibleQuestion(id,viewer);
  if (type==="answer") return visibleAnswer(id,viewer);
  if (type==="discussion") return visibleDiscussion(id,viewer);
  return visibleListing(id,viewer);
}
export async function deleteQuestionGraph(questionId: number, userId: string) {
  return db.transaction(async (tx) => {
    const question=(await tx.select().from(questions).where(and(eq(questions.id,questionId),eq(questions.userId,userId))).limit(1))[0];
    if (!question) return null;
    const answerRows=await tx.select({id:answers.id}).from(answers).where(eq(answers.questionId,questionId));
    await tx.delete(comments).where(and(eq(comments.questionOrAnswerId,questionId),eq(comments.isAnswer,false)));
    for (const answer of answerRows) await tx.delete(comments).where(and(eq(comments.questionOrAnswerId,answer.id),eq(comments.isAnswer,true)));
    await tx.delete(questions).where(eq(questions.id,questionId));
    return question;
  });
}
export async function deleteDiscussionGraph(id: number, userId: string) {
  return db.transaction(async (tx) => {
    const row = (
      await tx
        .select()
        .from(discussions)
        .where(and(eq(discussions.id, id), eq(discussions.userId, userId)))
        .limit(1)
    )[0];

    if (!row) return null;

    await tx
      .delete(discussionComments)
      .where(eq(discussionComments.postId, id));
    await tx.delete(discussions).where(eq(discussions.id, id));
    return row;
  });
}