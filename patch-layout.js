const fs = require('fs');
let content = fs.readFileSync('artifacts/cochetalk/app/_layout.tsx', 'utf8');

const regex = /<AppProvider>([\s\S]*?)<QueryClientProvider client=\{queryClient\}>([\s\S]*?)<\/QueryClientProvider>([\s\S]*?)<\/AppProvider>/;

content = content.replace(regex, (match, p1, p2, p3) => {
  return `<QueryClientProvider client={queryClient}>\n              <AppProvider>${p1}${p2}${p3}</AppProvider>\n            </QueryClientProvider>`;
});

fs.writeFileSync('artifacts/cochetalk/app/_layout.tsx', content);
