const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'js', 'data', 'vocabulary.js');
let content = fs.readFileSync(filePath, 'utf8');
content = content.replace('export const vocabulary = ', 'module.exports = ').replace(/;$/, '');
fs.writeFileSync('temp_c1_prep.js', content, 'utf8');
const vocab = require('./temp_c1_prep.js');
fs.unlinkSync('temp_c1_prep.js');

const missingC1 = vocab.filter(w => w.level === 'C1' && (!w.ex_fr || !w.ex_en || !w.ex_de || !w.ex_es));

if (!fs.existsSync('chunks_c1')) {
    fs.mkdirSync('chunks_c1');
}

const chunkSize = 50;
let chunkIndex = 0;
for (let i = 0; i < missingC1.length; i += chunkSize) {
    const chunk = missingC1.slice(i, i + chunkSize);
    fs.writeFileSync(`chunks_c1/c1_chunk_${chunkIndex}.json`, JSON.stringify(chunk, null, 2));
    chunkIndex++;
}

console.log(`Created ${chunkIndex} chunks of up to ${chunkSize} C1 words.`);
