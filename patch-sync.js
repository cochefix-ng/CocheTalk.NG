const fs = require('fs');
let content = fs.readFileSync('artifacts/cochetalk/context/AppContext.tsx', 'utf8');

const newSyncBackend = `
  const syncBackend = useCallback(async () => {
    try {
      const [qs, ds, ls] = await Promise.all([
        listQuestions({ limit: 100 }),
        listDiscussions({ limit: 100 }),
        listListings({ limit: 100 })
      ]);

      const questions = qs.items as Question[];
      const discussions = ds.items as DiscussionPost[];
      const listings = ls.items as MarketplaceListing[];

      const answersArr: Answer[] = [];
      const commentsArr: Comment[] = [];
      const discussionCommentsArr: DiscussionComment[] = [];

      await Promise.all(questions.map(async (q) => {
        try {
          const [ans, qC] = await Promise.all([
            listQuestionAnswers(q.id),
            listQuestionComments(q.id)
          ]);
          answersArr.push(...(ans.items as Answer[]));
          commentsArr.push(...(qC.items as Comment[]));
          await Promise.all(ans.items.map(async (a) => {
            try {
              const aC = await listAnswerComments(a.id);
              commentsArr.push(...(aC.items as Comment[]));
            } catch (err) {
              console.error('Failed to sync answer comments:', err);
            }
          }));
        } catch (err) {
          console.error('Failed to sync question relations:', err);
        }
      }));

      await Promise.all(discussions.map(async (d) => {
        try {
          const dC = await listDiscussionComments(d.id);
          discussionCommentsArr.push(...(dC.items as DiscussionComment[]));
        } catch (err) {
          console.error('Failed to sync discussion comments:', err);
        }
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
      Alert.alert('Connection Error', 'Could not sync latest content from the server.');
    }
  }, []);
`;

content = content.replace(/const syncBackend = useCallback\(async \(\) => \{[\s\S]*?\}, \[\]\);/, newSyncBackend.trim());

const newSave = `
  const save = useCallback((next: AppState) => {
    setState(next);
    const { questions, answers, comments, discussions, discussionComments, listings, ...localData } = next;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(localData)).catch((err) => {
      console.error('[AppContext] Failed to persist state to AsyncStorage.', err);
    });
  }, []);
`;

content = content.replace(/const save = useCallback\(\(next: AppState\) => \{[\s\S]*?\}, \[\]\);/, newSave.trim());

fs.writeFileSync('artifacts/cochetalk/context/AppContext.tsx', content);
