const fs = require('fs');
let content = fs.readFileSync('artifacts/cochetalk/context/AppContext.tsx', 'utf8');

function replaceMethod(methodName, newImpl) {
  const regex = new RegExp(`const ${methodName} = useCallback\\([\\s\\S]*?\\n    \\},[\\s\\S]*?\\]\\,?\\n  \\);`);
  content = content.replace(regex, newImpl);
}

replaceMethod('askQuestion', `const askQuestion = useCallback(
    async (data: any) => {
      if (!state || !currentUser) return;
      try {
        await createQuestion({ data: {
          ...data,
          userName: currentUser.name,
          userRole: currentUser.role,
          userSpecialization: currentUser.specialization.join(', '),
          userVerified: currentUser.verified,
        } });
        syncBackend();
      } catch (e) {
        console.error(e);
      }
    },
    [state, currentUser, syncBackend]
  );`);

replaceMethod('deleteQuestion', `const deleteQuestion = useCallback(
    async (id: number) => {
      if (!state) return;
      try {
        await deleteQuestionApi(id);
        syncBackend();
      } catch (e) {
        console.error(e);
      }
    },
    [state, syncBackend]
  );`);

replaceMethod('upvoteQuestion', `const upvoteQuestion = useCallback(
    async (id: number) => {
      if (!state || !currentUser) return;
      
      // Optimistic
      save({
        ...state,
        questions: state.questions.map((q) => {
          if (q.id !== id) return q;
          const isUpvoted = q.upvotedBy.includes(currentUser.id);
          return {
            ...q,
            upvotes: isUpvoted ? q.upvotes - 1 : q.upvotes + 1,
            upvotedBy: isUpvoted
              ? q.upvotedBy.filter((uid) => uid !== currentUser.id)
              : [...q.upvotedBy, currentUser.id],
          };
        }),
      });

      try {
        await upvoteQuestionApi(id);
        syncBackend();
      } catch (e) {
        console.error(e);
      }
    },
    [state, currentUser, save, syncBackend]
  );`);

replaceMethod('answerQuestion', `const answerQuestion = useCallback(
    async (questionId: number, content: string) => {
      if (!state || !currentUser) return;
      try {
        await createAnswer(questionId, { data: {
          content,
          userName: currentUser.name,
          userRole: currentUser.role,
          userSpecialization: currentUser.specialization.join(', '),
          userVerified: currentUser.verified,
        } });
        syncBackend();
      } catch (e) {
        console.error(e);
      }
    },
    [state, currentUser, syncBackend]
  );`);

replaceMethod('upvoteAnswer', `const upvoteAnswer = useCallback(
    async (id: number) => {
      if (!state || !currentUser) return;

      // Optimistic
      save({
        ...state,
        answers: state.answers.map((a) => {
          if (a.id !== id) return a;
          const isUpvoted = a.upvotedBy.includes(currentUser.id);
          return {
            ...a,
            upvotes: isUpvoted ? a.upvotes - 1 : a.upvotes + 1,
            upvotedBy: isUpvoted
              ? a.upvotedBy.filter((uid) => uid !== currentUser.id)
              : [...a.upvotedBy, currentUser.id],
          };
        }),
      });

      try {
        await upvoteAnswerApi(id);
        syncBackend();
      } catch (e) {
        console.error(e);
      }
    },
    [state, currentUser, save, syncBackend]
  );`);

replaceMethod('acceptAnswer', `const acceptAnswer = useCallback(
    async (questionId: number, answerId: number) => {
      if (!state) return;
      try {
        await acceptQuestionAnswer(questionId, answerId);
        syncBackend();
      } catch (e) {
        console.error(e);
      }
    },
    [state, syncBackend]
  );`);

replaceMethod('addComment', `const addComment = useCallback(
    async (parentId: number, isAnswer: boolean, content: string) => {
      if (!state || !currentUser) return;
      try {
        if (isAnswer) {
          await createAnswerComment(parentId, { data: { content, userName: currentUser.name } });
        } else {
          await createQuestionComment(parentId, { data: { content, userName: currentUser.name } });
        }
        syncBackend();
      } catch (e) {
        console.error(e);
      }
    },
    [state, currentUser, syncBackend]
  );`);

replaceMethod('createDiscussion', `const createDiscussion = useCallback(
    async (data: Pick<DiscussionPost, 'title' | 'content' | 'tags' | 'mediaUris' | 'isProCircle'>) => {
      if (!state || !currentUser) return;
      try {
        await createDiscussionApi({ data: {
          ...data,
          userName: currentUser.name,
          userRole: currentUser.role,
          userSpecialization: currentUser.specialization.join(', '),
          userVerified: currentUser.verified,
        } });
        syncBackend();
      } catch (e) {
        console.error(e);
      }
    },
    [state, currentUser, syncBackend]
  );`);

replaceMethod('deleteDiscussion', `const deleteDiscussion = useCallback(
    async (id: number) => {
      if (!state) return;
      try {
        await deleteDiscussionApi(id);
        syncBackend();
      } catch (e) {
        console.error(e);
      }
    },
    [state, syncBackend]
  );`);

replaceMethod('upvoteDiscussion', `const upvoteDiscussion = useCallback(
    async (id: number) => {
      if (!state || !currentUser) return;

      // Optimistic
      save({
        ...state,
        discussions: state.discussions.map((d) => {
          if (d.id !== id) return d;
          const isUpvoted = d.upvotedBy.includes(currentUser.id);
          return {
            ...d,
            upvotes: isUpvoted ? d.upvotes - 1 : d.upvotes + 1,
            upvotedBy: isUpvoted
              ? d.upvotedBy.filter((uid) => uid !== currentUser.id)
              : [...d.upvotedBy, currentUser.id],
          };
        }),
      });

      try {
        await upvoteDiscussionApi(id);
        syncBackend();
      } catch (e) {
        console.error(e);
      }
    },
    [state, currentUser, save, syncBackend]
  );`);

replaceMethod('addDiscussionComment', `const addDiscussionComment = useCallback(
    async (postId: number, content: string) => {
      if (!state || !currentUser) return;
      try {
        await createDiscussionComment(postId, { data: { content, userName: currentUser.name } });
        syncBackend();
      } catch (e) {
        console.error(e);
      }
    },
    [state, currentUser, syncBackend]
  );`);

replaceMethod('createListing', `const createListing = useCallback(
    async (data: any) => {
      if (!state || !currentUser) return;
      try {
        await createListingApi({ data: {
          ...data,
          userName: currentUser.name,
          userRole: currentUser.role,
          userPhone: currentUser.phone,
        } });
        syncBackend();
      } catch (e) {
        console.error(e);
      }
    },
    [state, currentUser, syncBackend]
  );`);

replaceMethod('deleteListing', `const deleteListing = useCallback(
    async (id: number) => {
      if (!state) return;
      try {
        await deleteListingApi(id);
        syncBackend();
      } catch (e) {
        console.error(e);
      }
    },
    [state, syncBackend]
  );`);

replaceMethod('approveListing', `const approveListing = useCallback(
    async (id: number, approved: boolean) => {
      if (!state) return;
      try {
        await setListingApproval(id, { data: { approved } });
        syncBackend();
      } catch (e) {
        console.error(e);
        // Explicitly surface failure instead of pretending success
        alert("Failed to approve listing (Admin authority error 403).");
      }
    },
    [state, syncBackend]
  );`);

replaceMethod('featureListing', `const featureListing = useCallback(
    async (id: number, featured: boolean) => {
      if (!state) return;
      try {
        await setListingFeatured(id, { data: { featured } });
        syncBackend();
      } catch (e) {
        console.error(e);
        // Explicitly surface failure instead of pretending success
        alert("Failed to feature listing (Admin authority error 403).");
      }
    },
    [state, syncBackend]
  );`);

// For API methods to compile correctly we must rename them in the import or below.
content = content.replace("deleteQuestion,", "deleteQuestion as deleteQuestionApi,");
content = content.replace("upvoteQuestion,", "upvoteQuestion as upvoteQuestionApi,");
content = content.replace("createDiscussion,", "createDiscussion as createDiscussionApi,");
content = content.replace("deleteDiscussion,", "deleteDiscussion as deleteDiscussionApi,");
content = content.replace("upvoteDiscussion,", "upvoteDiscussion as upvoteDiscussionApi,");
content = content.replace("createListing,", "createListing as createListingApi,");
content = content.replace("deleteListing,", "deleteListing as deleteListingApi,");
content = content.replace("upvoteAnswer,", "upvoteAnswer as upvoteAnswerApi,");

fs.writeFileSync('artifacts/cochetalk/context/AppContext.tsx', content);
