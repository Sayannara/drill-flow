const fs = require('fs');
let c = fs.readFileSync('js/drill.js', 'utf8');

c = c.replace(/const escapedWord = targetWord\.replace\(.*?;\s*const regex = new RegExp.*?;/g, 'const regex = buildTargetRegex(targetWord);');

// For sourceWord highlight:
// const sourceWord = currentWord[sessionState.langSource];
// const escapedWord = sourceWord.replace(...);
// const regex = new RegExp(\`(\${escapedWord})\`, 'gi');
c = c.replace(/const escapedWord = sourceWord\.replace\(.*?;\s*\/\/ Mettre en gras.*?\s*const regex = new RegExp.*?;/g, 'const regex = buildTargetRegex(sourceWord);');

fs.writeFileSync('js/drill.js', c, 'utf8');
