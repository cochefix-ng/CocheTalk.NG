const fs = require('fs');
let content = fs.readFileSync('artifacts/cochetalk/context/AppContext.tsx', 'utf8');

const syncCode = `
  const syncBackend = useCallback(async () => {
    try {
      const [qs, ds, ls] = await Promise.all([
        listQuestions({ limit: 100 }).catch(() => ({ items: [] })),
        listDiscussions({ limit: 100 }).catch(() => ({ items: [] })),
        listListings({ limit: 100 }).catch(() => ({ items: [] }))
      ]);

      const questions = qs.items as Question[];
      const discussions = ds.items as DiscussionPost[];
      const listings = ls.items as MarketplaceListing[];

      const answersArr = [];
      const commentsArr = [];
      const discussionCommentsArr = [];

      await Promise.all(questions.map(async (q) => {
        const [ans, qC] = await Promise.all([
          listQuestionAnswers(q.id).catch(() => ({ items: [] })),
          listQuestionComments(q.id).catch(() => ({ items: [] }))
        ]);
        answersArr.push(...(ans.items as Answer[]));
        commentsArr.push(...(qC.items as Comment[]));
        await Promise.all(ans.items.map(async (a) => {
          const aC = await listAnswerComments(a.id).catch(() => ({ items: [] }));
          commentsArr.push(...(aC.items as Comment[]));
        }));
      }));

      await Promise.all(discussions.map(async (d) => {
        const dC = await listDiscussionComments(d.id).catch(() => ({ items: [] }));
        discussionCommentsArr.push(...(dC.items as DiscussionComment[]));
      }));

      setState(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          questions,
          discussions,
          listings,
          answers: answersArr,
          comments: commentsArr,
          discussionComments: discussionCommentsArr,
        };
      });
    } catch (e) {
      console.error('Failed to sync backend:', e);
    }
  }, []);

  useEffect(() => {
    if (state && state.currentUserId) {
      syncBackend();
    }
  }, [state?.currentUserId, syncBackend]);
`;

// Insert the sync code right after `const logout = ...`
content = content.replace(/const logout = useCallback\(\(\) => \{[\s\S]*?\}, \[state, save\]\);\n/, match => match + syncCode);

fs.writeFileSync('artifacts/cochetalk/context/AppContext.tsx', content);
