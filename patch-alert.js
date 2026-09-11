const fs = require('fs');
let content = fs.readFileSync('artifacts/cochetalk/context/AppContext.tsx', 'utf8');

if (!content.includes('import { Alert } from')) {
  content = content.replace("import React,", "import { Alert } from 'react-native';\nimport React,");
}
content = content.replace(/alert\("Failed to approve listing/g, 'Alert.alert("Failed to approve listing');
content = content.replace(/alert\("Failed to feature listing/g, 'Alert.alert("Failed to feature listing');

fs.writeFileSync('artifacts/cochetalk/context/AppContext.tsx', content);
