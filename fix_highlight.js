const fs = require('fs');
let c = fs.readFileSync('js/drill.js', 'utf8');

const articleFunc = `function getArticleAlternatives(text) {
    let opts = [text];
    if (text.startsWith('un ')) opts.push(text.replace(/^un /, 'le '), text.replace(/^un /, "l'"), text.replace(/^un /, 'el '));
    if (text.startsWith('une ')) opts.push(text.replace(/^une /, 'la '), text.replace(/^une /, "l'"));
    if (text.startsWith('le ')) opts.push(text.replace(/^le /, 'un '));
    if (text.startsWith('la ')) opts.push(text.replace(/^la /, 'une '), text.replace(/^la /, 'una '));
    if (text.startsWith("l'")) opts.push(text.replace(/^l'/, 'un '), text.replace(/^l'/, 'une '), text.replace(/^l'/, 'le '), text.replace(/^l'/, 'la '));
    if (text.startsWith('el ')) opts.push(text.replace(/^el /, 'un '));
    if (text.startsWith('una ')) opts.push(text.replace(/^una /, 'la '));
    if (typeof sessionState !== 'undefined' && sessionState.langTarget === 'EN') {
        opts.push(text.replace(/^(the |a |an |to )/, ''));
    }
    // Also, if the string has no article, and we add an article for finding in the sentence:
    // This is useful if target is just 'house' and sentence has 'a house'.
    // Actually, it's safer to just strip the article from the targetWord as a fallback.
    return opts;
}

function buildTargetRegex(targetWord) {
    let allOpts = [];
    targetWord.split('/').forEach(s => {
        let t = s.trim();
        allOpts.push(...getArticleAlternatives(t));
        // Add a completely article-stripped version just in case (for highlighting/matching)
        allOpts.push(t.replace(/^(le |la |les |l'|un |une |des |the |a |an |to |el |los |las |una |unos |unas |der |die |das |ein |eine |einen |einem |einer )/g, ''));
    });
    // Sort by length descending to match longest first (e.g. "une maison" before "maison")
    allOpts = [...new Set(allOpts)].filter(x => x.length > 2).sort((a, b) => b.length - a.length);
    if (allOpts.length === 0) allOpts = [targetWord];
    const escapedOpts = allOpts.map(opt => opt.replace(/[.*+?^\\$\\{\\}()|[\\]\\\\]/g, '\\\\$&'));
    return new RegExp('(' + escapedOpts.join('|') + ')', 'gi');
}
`;

// Insert the functions after normalizeText
c = c.replace(/(function normalizeText[\s\S]*?})/, `$1\n\n${articleFunc}`);

// Remove internal getArticleAlternatives
c = c.replace(/const getArticleAlternatives = \(\w+\) => \{[\s\S]*?return opts;\s*\};\s*/g, '');

// Fix regex in show result correct
c = c.replace(/const escapedWord = targetWord\.replace\(\/\[\.\*\+\?\^\\\$[^]*?\\\\\$&'\);\s*const regex = new RegExp\(\`\(\\\$\{escapedWord\}\)\`, 'gi'\);/g, `const regex = buildTargetRegex(targetWord);`);

// Fix regex in startContextDrill
c = c.replace(/const escapedWord = targetWord\.replace\(\/\[\.\*\+\?\^\\\$\\\\{\\\}\(\)\\|\[\\\\\]\\\\\\\\\]\/g, '\\\\\\\\\$&'\);\s*const regex = new RegExp\(\'\(\' \+ escapedWord \+ \'\)\', \'gi\'\);/g, `const regex = buildTargetRegex(targetWord);`);

fs.writeFileSync('js/drill.js', c, 'utf8');
