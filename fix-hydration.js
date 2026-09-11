const fs = require('fs');
let content = fs.readFileSync('artifacts/cochetalk/context/AppContext.tsx', 'utf8');

content = content.replace(/\} catch \(err\) \{ \{/, '} catch (err) {');

fs.writeFileSync('artifacts/cochetalk/context/AppContext.tsx', content);
