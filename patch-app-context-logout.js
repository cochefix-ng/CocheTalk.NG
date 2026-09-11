const fs = require('fs');
let content = fs.readFileSync('artifacts/cochetalk/context/AppContext.tsx', 'utf8');

const importStr = `import { useQueryClient } from '@tanstack/react-query';\nimport React,`;
content = content.replace('import React,', importStr);

const providerStart = `
export function AppProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
`;
content = content.replace('export function AppProvider({ children }: { children: React.ReactNode }) {', providerStart);

const newLogout = `
  const logout = useCallback(() => {
    if (!state) return;
    queryClient.clear(); // Clear React Query cache
    save({ 
      ...state, 
      currentUserId: null, 
      questions: [],
      answers: [],
      comments: [],
      discussions: [],
      discussionComments: [],
      listings: []
    });
  }, [state, save, queryClient]);
`;

content = content.replace(/const logout = useCallback\(\(\) => \{[\s\S]*?\}, \[state, save\]\);/, newLogout.trim());

fs.writeFileSync('artifacts/cochetalk/context/AppContext.tsx', content);
