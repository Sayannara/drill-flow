const fs = require('fs');
const files = ['append_part1.ps1', 'append_part2.ps1', 'append_part3.ps1', 'append_part4.ps1', 'append_part5.ps1', 'append_part6.ps1'];
let allWords = [];

files.forEach(f => {
    let content = fs.readFileSync(f, 'utf8');
    let regex = /\("(.*?)",\s*"(.*?)",\s*"(.*?)",\s*"(.*?)",\s*"(.*?)",\s*"(.*?)"\)/g;
    let match;
    while ((match = regex.exec(content)) !== null) {
        allWords.push([match[1], match[2], match[3], match[4], match[5], match[6]]);
    }
});

let finalVocab = allWords.map((w, i) => {
    return {
        id: "word_" + (i+1),
        fr: w[0].trim(),
        en: w[1].trim(),
        de: w[2].trim(),
        es: w[3].trim(),
        type: w[4].trim(),
        level: w[5].trim()
    };
});

fs.writeFileSync('js/data/vocabulary.js', 'export const vocabulary = ' + JSON.stringify(finalVocab, null, 2) + ';\n', 'utf8');
console.log('Vocabulary generated with ' + finalVocab.length + ' words in UTF-8.');
