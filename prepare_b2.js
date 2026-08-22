const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'js', 'data', 'vocabulary.js');
let content = fs.readFileSync(filePath, 'utf8');
content = content.replace('export const vocabulary = ', 'module.exports = ').replace(/;$/, '');
fs.writeFileSync('temp.js', content, 'utf8');
const vocab = require('./temp.js');
fs.unlinkSync('temp.js');

const missingB2 = vocab.filter(w => w.level === 'B2' && (!w.ex_fr || !w.ex_en || !w.ex_de || !w.ex_es));

if (!fs.existsSync('chunks')) {
    fs.mkdirSync('chunks');
}

const chunkSize = 50;
let chunkIndex = 0;
for (let i = 0; i < missingB2.length; i += chunkSize) {
    const chunk = missingB2.slice(i, i + chunkSize);
    fs.writeFileSync(`chunks/b2_chunk_${chunkIndex}.json`, JSON.stringify(chunk, null, 2));
    chunkIndex++;
}

console.log(`Created ${chunkIndex} chunks of up to ${chunkSize} words.`);
