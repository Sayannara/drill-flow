const fs = require('fs');
let c = fs.readFileSync('js/drill.js', 'utf8');

const regexValidation = /const removeArticles = \(\w+\) => [\s\S]*?const isCorrect = [\s\S]*?;/;

const replacementValidation = `const getArticleAlternatives = (text) => {
            let opts = [text];
            if (text.startsWith('un ')) opts.push(text.replace(/^un /, 'le '), text.replace(/^un /, "l'"), text.replace(/^un /, 'el '));
            if (text.startsWith('une ')) opts.push(text.replace(/^une /, 'la '), text.replace(/^une /, "l'"));
            if (text.startsWith('le ')) opts.push(text.replace(/^le /, 'un '));
            if (text.startsWith('la ')) opts.push(text.replace(/^la /, 'une '), text.replace(/^la /, 'una '));
            if (text.startsWith("l'")) opts.push(text.replace(/^l'/, 'un '), text.replace(/^l'/, 'une '), text.replace(/^l'/, 'le '), text.replace(/^l'/, 'la '));
            if (text.startsWith('el ')) opts.push(text.replace(/^el /, 'un '));
            if (text.startsWith('una ')) opts.push(text.replace(/^una /, 'la '));
            if (text.startsWith('a ')) opts.push(text.replace(/^a /, 'the '));
            if (text.startsWith('an ')) opts.push(text.replace(/^an /, 'the '));
            if (text.startsWith('the ')) opts.push(text.replace(/^the /, 'a '), text.replace(/^the /, 'an '));
            return opts;
        };

        const expectedOptions = [];
        expected.split('/').forEach(s => {
            expectedOptions.push(normalizeText(s));
            expectedOptions.push(normalizeText(s.replace(/\\(.*?\\)/g, ' ')));
        });

        let allExpectedOpts = [];
        expectedOptions.forEach(opt => allExpectedOpts.push(...getArticleAlternatives(opt)));
        
        let allInputOpts = [normalizedInput, inputNoParens, ...getArticleAlternatives(normalizedInput), ...getArticleAlternatives(inputNoParens)];

        const isCorrect = allInputOpts.some(inputOpt => allExpectedOpts.includes(inputOpt));`;

c = c.replace(regexValidation, replacementValidation);

const regexRewrite = /const removeArticles = \(\w+\) => [\s\S]*?if \(isRewriteCorrect\)/;

const replacementRewrite = `const getArticleAlternatives = (text) => {
                        let opts = [text];
                        if (text.startsWith('un ')) opts.push(text.replace(/^un /, 'le '), text.replace(/^un /, "l'"), text.replace(/^un /, 'el '));
                        if (text.startsWith('une ')) opts.push(text.replace(/^une /, 'la '), text.replace(/^une /, "l'"));
                        if (text.startsWith('le ')) opts.push(text.replace(/^le /, 'un '));
                        if (text.startsWith('la ')) opts.push(text.replace(/^la /, 'une '), text.replace(/^la /, 'una '));
                        if (text.startsWith("l'")) opts.push(text.replace(/^l'/, 'un '), text.replace(/^l'/, 'une '), text.replace(/^l'/, 'le '), text.replace(/^l'/, 'la '));
                        if (text.startsWith('el ')) opts.push(text.replace(/^el /, 'un '));
                        if (text.startsWith('una ')) opts.push(text.replace(/^una /, 'la '));
                        if (text.startsWith('a ')) opts.push(text.replace(/^a /, 'the '));
                        if (text.startsWith('an ')) opts.push(text.replace(/^an /, 'the '));
                        if (text.startsWith('the ')) opts.push(text.replace(/^the /, 'a '), text.replace(/^the /, 'an '));
                        return opts;
                    };
                    
                    let isRewriteCorrect = false;
                    expected.split('/').forEach(s => {
                        const normExp = normalizeText(s);
                        const normExpNoParens = normalizeText(s.replace(/\\(.*?\\)/g, ' '));
                        
                        let expOpts = [...getArticleAlternatives(normExp), ...getArticleAlternatives(normExpNoParens)];
                        let inOpts = [...getArticleAlternatives(normalizedInput)];
                        
                        if (inOpts.some(io => expOpts.includes(io))) {
                            isRewriteCorrect = true;
                        }
                    });

                    if (isRewriteCorrect)`;

c = c.replace(regexRewrite, replacementRewrite);

fs.writeFileSync('js/drill.js', c, 'utf8');
