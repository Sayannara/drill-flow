const fs = require('fs');
let c = fs.readFileSync('js/drill.js', 'utf8');

const regex = /if \(text\.startsWith\('a '\)\) opts\.push\([\s\S]*?text\.replace\(\/\^the \/, 'an '\)\);/g;

const replacement = `if (sessionState.langTarget === 'EN') {
                opts.push(text.replace(/^(the |a |an |to )/, ''));
            }`;

c = c.replace(regex, replacement);
fs.writeFileSync('js/drill.js', c, 'utf8');
