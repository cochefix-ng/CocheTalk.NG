const fs = require('fs');
let content = fs.readFileSync('artifacts/cochetalk/context/AppContext.tsx', 'utf8');

const newHydration = `
        try {
          const parsed = JSON.parse(raw) as Partial<AppState>;
          setState({
            ...parsed,
            questions: parsed.questions ?? [],
            answers: parsed.answers ?? [],
            comments: parsed.comments ?? [],
            discussions: parsed.discussions ?? [],
            discussionComments: parsed.discussionComments ?? [],
            listings: parsed.listings ?? [],
            analytics: {
              ...createSeedAnalytics(),
              ...(parsed.analytics ?? {}),
              pageVisits: parsed.analytics?.pageVisits ?? {},
              events: parsed.analytics?.events ?? [],
            },
          } as AppState);
        } catch (err) {
`;

content = content.replace(/try \{\s*const parsed = JSON\.parse\(raw\) as AppState;[\s\S]*?\} catch \(err\) \{/, newHydration.trim() + ' {\n');

fs.writeFileSync('artifacts/cochetalk/context/AppContext.tsx', content);
