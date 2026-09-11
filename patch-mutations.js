const fs = require('fs');
let content = fs.readFileSync('artifacts/cochetalk/context/AppContext.tsx', 'utf8');

const regex = /catch \(e\) \{\s*console\.error\(e\);\s*\}/g;
content = content.replace(regex, `catch (e) {
        console.error(e);
        Alert.alert('Action Failed', 'Could not save your changes. Please try again.');
      }`);

fs.writeFileSync('artifacts/cochetalk/context/AppContext.tsx', content);
