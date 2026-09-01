import { vocabulary } from './data/vocabulary.js';
import { getWordStatus, setWordStatus, getWordStats, reportWordTranslation } from './storage.js';
import { translations } from './i18n.js';

function getAppLanguage() {
    return localStorage.getItem('app_lang') || 'fr';
}

let sessionState = {
    langSource: 'fr',
    langTarget: 'en',
    words: [],      // Mots actifs dans la session
    currentIndex: 0, // Index du mot en cours
    isWaitingAction: false // Attend G, R ou Enter après validation
};

// Mélange un tableau aléatoirement
function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex !== 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
    }
    return array;
}

// Nettoyage simple (insensible à la casse, espaces, et œ)
function normalizeText(text) {
    return text.trim().toLowerCase().replace(/\s+/g, ' ').replace(/œ/g, 'oe');
}

const SPECIAL_KEYS_BY_LANG = {
    de: ['ä', 'ö', 'ü', 'ß'],
    es: ['á', 'é', 'í', 'ó', 'ú', 'ñ'],
    fr: ['é', 'è', 'ê', 'ë', 'à', 'â', 'î', 'ï', 'ô', 'ù', 'û', 'ç', 'œ']
};

function isAccentToleranceEnabled() {
    return localStorage.getItem('drillflow_tolerate_accents') !== 'off';
}

function normalizeTolerant(text, lang = '') {
    if (!text) return '';
    let s = text.trim().toLowerCase().replace(/\s+/g, ' ');
    s = s.replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/ß/g, 'ss');
    s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (lang === 'de') {
        s = s.replace(/ae/g, 'a').replace(/oe/g, 'o').replace(/ue/g, 'u');
    }
    return s;
}

function renderSpecialKeysBar(containerId, targetInputId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const targetLang = (sessionState.langTarget || '').toLowerCase();
    const keys = SPECIAL_KEYS_BY_LANG[targetLang];

    if (!keys || keys.length === 0) {
        container.style.display = 'none';
        container.innerHTML = '';
        return;
    }

    container.innerHTML = '';
    keys.forEach(char => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'special-key-btn';
        btn.textContent = char;
        btn.tabIndex = -1;

        btn.addEventListener('pointerdown', (e) => {
            e.preventDefault();
        });

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const input = document.getElementById(targetInputId);
            if (!input) return;

            const start = input.selectionStart ?? input.value.length;
            const end = input.selectionEnd ?? input.value.length;
            const val = input.value;
            input.value = val.substring(0, start) + char + val.substring(end);
            const newPos = start + char.length;
            input.setSelectionRange(newPos, newPos);
            input.focus();
            input.dispatchEvent(new Event('input', { bubbles: true }));
        });

        container.appendChild(btn);
    });

    container.style.display = 'flex';
}

function getArticleAlternatives(text) {
    let opts = [text];
    if (text.startsWith('un ')) opts.push(text.replace(/^un /, 'le '), text.replace(/^un /, "l'"), text.replace(/^un /, 'el '));
    if (text.startsWith('une ')) opts.push(text.replace(/^une /, 'la '), text.replace(/^une /, "l'"));
    if (text.startsWith('le ')) opts.push(text.replace(/^le /, 'un '));
    if (text.startsWith('la ')) opts.push(text.replace(/^la /, 'une '), text.replace(/^la /, 'una '));
    if (text.startsWith("l'")) opts.push(text.replace(/^l'/, 'un '), text.replace(/^l'/, 'une '), text.replace(/^l'/, 'le '), text.replace(/^l'/, 'la '));
    if (text.startsWith('el ')) opts.push(text.replace(/^el /, 'un '));
    if (text.startsWith('una ')) opts.push(text.replace(/^una /, 'la '));
    if (typeof sessionState !== 'undefined' && sessionState.langTarget?.toLowerCase() === 'en') {
        opts.push(text.replace(/^(the |a |an |to )/i, ''));
    }
    return opts;
}

function getTargetPrefix(word, langTarget, langSource) {
    if (!word || !langTarget || langTarget.toLowerCase() !== 'en') {
        return '';
    }

    const targetVal = (word.en || '').trim();
    const sourceVal = (word[langSource] || '').trim();
    const type = (word.type || '').toLowerCase();

    // 1. Verbe anglais -> toujours "to "
    if (type === 'verbe' || targetVal.toLowerCase().startsWith('to ')) {
        return 'to ';
    }

    // 2. Nom anglais avec article explicite dans le mot cible
    if (targetVal.toLowerCase().startsWith('the ')) return 'the ';
    if (targetVal.toLowerCase().startsWith('a ')) return 'a ';
    if (targetVal.toLowerCase().startsWith('an ')) return 'an ';

    // 3. Nom anglais sans article explicite, mais le mot source en possède un
    if (type === 'nom') {
        const srcLower = sourceVal.toLowerCase();
        // Déterminant défini (le, la, l', les, der, die, das, el, la, los, las)
        if (/^(le |la |l'|les |der |die |das |el |la |los |las )/i.test(srcLower)) {
            return 'the ';
        }
        // Déterminant indéfini (un, une, ein, eine, un, una)
        if (/^(un |une |ein |eine |un |una )/i.test(srcLower)) {
            const cleanedTarget = targetVal.replace(/^(the |a |an |to )/i, '').trim();
            if (/^[aeiou]/i.test(cleanedTarget)) {
                return 'an ';
            }
            return 'a ';
        }
    }

    return '';
}

function buildTargetRegex(targetWord) {
    let allOpts = [];
    targetWord.split('/').forEach(s => {
        let t = s.replace(/\(.*?\)/g, '').trim();
        allOpts.push(...getArticleAlternatives(t));
        allOpts.push(t.replace(/^(le |la |les |l'|un |une |des |the |a |an |to |el |los |las |una |unos |unas |der |die |das |ein |eine |einen |einem |einer |se |s'|me |te |sich )/gi, ''));
    });
    allOpts = [...new Set(allOpts)].filter(x => x.length >= 1).sort((a, b) => b.length - a.length);
    if (allOpts.length === 0) allOpts = [targetWord];
    const escapedOpts = allOpts.map(opt => opt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
    return new RegExp('(?:\\b|(?<=[\'\\s]))(' + escapedOpts.join('|') + ')(?:\\b|(?=[\'\\s.,!?;:]))', 'gi');
}

function highlightExampleSentence(sentence, targetWord, styleOrClass) {
    if (!sentence || !targetWord) return sentence || '';
    
    const isStyle = !styleOrClass.startsWith('class=');
    const tagOpen = isStyle ? `<span style="${styleOrClass}">` : `<span ${styleOrClass}>`;
    const tagClose = `</span>`;

    // 1. Si la phrase contient déjà des astérisques (ex: "Je *parle* français avec toi."), on remplace la partie entre astérisques
    if (sentence.includes('*')) {
        const hasAsteriskMatch = /\*([^*]+)\*/.test(sentence);
        if (hasAsteriskMatch) {
            return sentence.replace(/\*([^*]+)\*/g, `${tagOpen}$1${tagClose}`);
        }
    }

    // 2. Tenter une correspondance exacte avec la regex basée sur les mots cibles (buildTargetRegex)
    const regex = buildTargetRegex(targetWord);
    let matched = false;
    const resultExact = sentence.replace(regex, (match) => {
        matched = true;
        return `${tagOpen}${match}${tagClose}`;
    });

    if (matched) {
        return resultExact;
    }

    // 3. Fallback : Correspondance par radical / début de mot (ex: "parler" -> "parl", "sprechen" -> "sprech", "hablar" -> "habl")
    const cleanWords = targetWord.split('/')
        .map(w => w.replace(/\(.*?\)/g, '').trim())
        .map(w => w.replace(/^(le |la |les |l'|un |une |des |the |a |an |to |el |los |las |una |unos |unas |der |die |das |ein |eine |einen |einem |einer |se |s'|me |te |sich )/gi, '').trim())
        .filter(w => w.length >= 3);

    const stems = [];
    cleanWords.forEach(w => {
        stems.push(w);
        if (w.endsWith('er') || w.endsWith('ir') || w.endsWith('re')) {
            stems.push(w.slice(0, -2));
        }
        if (w.endsWith('ar') || w.endsWith('er') || w.endsWith('ir')) {
            stems.push(w.slice(0, -2));
        }
        if (w.endsWith('en')) {
            stems.push(w.slice(0, -2));
        } else if (w.endsWith('n')) {
            stems.push(w.slice(0, -1));
        }
    });

    const validStems = [...new Set(stems)].filter(s => s.length >= 3).sort((a, b) => b.length - a.length);

    if (validStems.length > 0) {
        const escapedStems = validStems.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        const stemRegex = new RegExp('(?:\\b|(?<=[\'\\s]))(' + escapedStems.join('|') + ')[a-zàâäéèêëîïôöùûüçñáéíóúß]*\\b', 'gi');
        
        let stemMatched = false;
        const resultStem = sentence.replace(stemRegex, (match) => {
            if (!stemMatched) {
                stemMatched = true;
                return `${tagOpen}${match}${tagClose}`;
            }
            return match;
        });

        if (stemMatched) {
            return resultStem;
        }
    }

    return sentence;
}


// Variable configurable de la taille maximale du pool actif (100 par défaut, gérée par admin)
export function getActivePoolMaxSize() {
    const custom = localStorage.getItem('drillflow_active_pool_size');
    return custom ? parseInt(custom, 10) : 100;
}

export function setActivePoolMaxSize(size) {
    if (typeof size === 'number' && size > 0) {
        localStorage.setItem('drillflow_active_pool_size', size.toString());
    }
}

export function initDrillSession(source, target, volume, levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'], mode = 'smart') {
    sessionState.langSource = source;
    sessionState.langTarget = target;
    sessionState.mode = mode; // Store the mode in session state
    
    // Filtrer les mots qui correspondent au niveau (non validés et non ignorés)
    const activeWords = vocabulary.filter(w => {
        const status = getWordStatus(source, target, w.id);
        return status !== 'validé' && status !== 'ignoré' && levels.includes(w.level);
    });
    
    const validatedWords = vocabulary.filter(w => {
        return getWordStatus(source, target, w.id) === 'validé' && levels.includes(w.level);
    });

    let selectedWords = [];

    if (mode === 'smart') {
        // Smart Drill: Gestion du pool actif (cible : 100 mots par défaut, paramétrable admin)
        // Les mots du pool actif sont les mots tentés et non validés (attempts > 0, status !== 'validé', status !== 'ignoré')
        const attemptedWords = [];
        const brandNewWords = [];

        activeWords.forEach(w => {
            const stats = getWordStats(source, target, w.id);
            if (stats && stats.attempts > 0) {
                attemptedWords.push(w);
            } else {
                brandNewWords.push(w);
            }
        });

        // Trier le pool actif du plus ancien au plus récent (rotation intelligente)
        attemptedWords.sort((a, b) => {
            const statsA = getWordStats(source, target, a.id);
            const statsB = getWordStats(source, target, b.id);
            const dateA = statsA.last_updated ? new Date(statsA.last_updated).getTime() : 0;
            const dateB = statsB.last_updated ? new Date(statsB.last_updated).getTime() : 0;
            return dateA - dateB;
        });

        const maxPoolSize = getActivePoolMaxSize();
        // Places disponibles dans le pool pour de nouveaux mots
        const availableSlotsInPool = Math.max(0, maxPoolSize - attemptedWords.length);

        // Nombre de nouveaux mots pouvant être injectés dans cette session :
        // Ne peut jamais dépasser les places disponibles dans le pool
        let allowedNew = Math.min(volume, availableSlotsInPool);

        // Nombre de mots du pool actif à prendre dans la session
        let neededAttempted = volume - allowedNew;

        // Si le pool actif ne contient pas assez de mots (ex: démarrage de l'appli ou pool presque vide)
        if (attemptedWords.length < neededAttempted) {
            neededAttempted = attemptedWords.length;
            allowedNew = Math.min(volume - neededAttempted, availableSlotsInPool);
            if (attemptedWords.length === 0) {
                allowedNew = Math.min(volume, maxPoolSize);
            }
        }

        let selectedAttempted = attemptedWords.slice(0, neededAttempted);
        const shuffledNew = shuffle([...brandNewWords]);
        let selectedNew = shuffledNew.slice(0, allowedNew);

        // Fallbacks de sécurité si la session n'est pas encore complète
        if (selectedAttempted.length + selectedNew.length < volume) {
            const remaining = volume - (selectedAttempted.length + selectedNew.length);
            const extraAttempted = attemptedWords.slice(selectedAttempted.length, selectedAttempted.length + remaining);
            selectedAttempted = [...selectedAttempted, ...extraAttempted];
        }
        if (selectedAttempted.length + selectedNew.length < volume && availableSlotsInPool > 0) {
            const remaining = volume - (selectedAttempted.length + selectedNew.length);
            const extraNew = shuffledNew.slice(selectedNew.length, selectedNew.length + Math.min(remaining, availableSlotsInPool));
            selectedNew = [...selectedNew, ...extraNew];
        }

        selectedWords = shuffle([...selectedAttempted, ...selectedNew]);
    } else if (mode === 'review') {
        // Mode Révision : Mots validés
        validatedWords.sort((a, b) => {
            const statsA = getWordStats(source, target, a.id);
            const statsB = getWordStats(source, target, b.id);
            
            const aNeedsReview = statsA.attempts > 1 ? 1 : 0;
            const bNeedsReview = statsB.attempts > 1 ? 1 : 0;
            if (aNeedsReview !== bNeedsReview) {
                return bNeedsReview - aNeedsReview;
            }
            
            const dateA = statsA.validation_date ? new Date(statsA.validation_date).getTime() : 0;
            const dateB = statsB.validation_date ? new Date(statsB.validation_date).getTime() : 0;
            return dateA - dateB;
        });

        let selectedReviewWords = validatedWords.slice(0, volume);
        let selectedActiveWords = [];
        if (selectedReviewWords.length < volume) {
            const remainingNeeded = volume - selectedReviewWords.length;
            selectedActiveWords = shuffle([...activeWords]).slice(0, remainingNeeded);
        }
        selectedWords = shuffle([...selectedReviewWords, ...selectedActiveWords]);
    } else {
        // Mode Découverte (100% nouveaux / non validés)
        selectedWords = shuffle([...activeWords]).slice(0, volume);
    }

    sessionState.words = selectedWords;
    sessionState.originalWords = [...sessionState.words]; // Keep for context drill
    sessionState.currentIndex = 0;
    sessionState.isWaitingAction = false;
    sessionState.wordSessionAttempts = {};

    // Reset de l'UI si on vient d'une fin de session
    const flashcard = document.querySelector('.flashcard');
    const headerSection = document.getElementById('drill-header-section');
    const endContainer = document.getElementById('end-session-container');
    if (flashcard) flashcard.style.display = 'block';
    if (headerSection) headerSection.style.display = 'flex';
    if (endContainer) endContainer.style.display = 'none';

    renderCurrentWord();
}

function getRewriteCandidates(expectedTarget) {
    const candidates = [];
    if (!expectedTarget) return candidates;

    expectedTarget.split('/').forEach(part => {
        let clean = part.trim();
        if (sessionState.currentPrefix) {
            const prefixClean = sessionState.currentPrefix.trim();
            if (clean.toLowerCase().startsWith(prefixClean.toLowerCase())) {
                clean = clean.substring(prefixClean.length).trim();
            }
        }
        if (clean) candidates.push(clean);

        const noParens = clean.replace(/\(.*?\)/g, '').trim();
        if (noParens && noParens !== clean) {
            candidates.push(noParens);
        }

        const noArticle = clean.replace(/^(the |a |an |to |le |la |les |l'|un |une |des |el |los |las |der |die |das |ein |eine )/i, '').trim();
        if (noArticle && noArticle !== clean) {
            candidates.push(noArticle);
        }
    });

    return Array.from(new Set(candidates));
}

function getRewriteMatchLength(inputValue, expectedTarget) {
    if (!inputValue || !expectedTarget) return 0;
    const candidates = getRewriteCandidates(expectedTarget);
    const tolerate = isAccentToleranceEnabled();
    const lang = typeof sessionState !== 'undefined' ? (sessionState.langTarget || '') : '';
    let bestMatch = 0;

    for (const candidate of candidates) {
        let m = 0;
        while (m < inputValue.length && m < candidate.length) {
            const charIn = inputValue[m].toLowerCase();
            const charCand = candidate[m].toLowerCase();
            if (charIn === charCand) {
                m++;
            } else if (tolerate && normalizeTolerant(charIn, lang) === normalizeTolerant(charCand, lang)) {
                m++;
            } else {
                break;
            }
        }
        if (m > bestMatch) {
            bestMatch = m;
        }
    }
    return bestMatch;
}

function escapeHtml(str) {
    if (!str) return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

export function formatWordForDisplay(raw) {
    if (!raw) return '';
    // Découpage par '/' en dehors des parenthèses
    const chunks = [];
    let current = '';
    let parenDepth = 0;
    for (let i = 0; i < raw.length; i++) {
        const ch = raw[i];
        if (ch === '(') {
            parenDepth++;
            current += ch;
        } else if (ch === ')') {
            if (parenDepth > 0) parenDepth--;
            current += ch;
        } else if (ch === '/' && parenDepth === 0) {
            chunks.push(current.trim());
            current = '';
            while (i + 1 < raw.length && raw[i + 1] === ' ') {
                i++;
            }
        } else {
            current += ch;
        }
    }
    if (current.trim()) {
        chunks.push(current.trim());
    }

    const filteredChunks = chunks.filter(Boolean);
    const items = [];

    filteredChunks.forEach((c, idx) => {
        const isLastChunk = (idx === filteredChunks.length - 1);
        const slashSuffix = isLastChunk ? '' : ' /';

        // Détection d'une note entre parenthèses à la fin du fragment : 'mot (note)'
        const parenMatch = c.match(/^(.*?)\s*(\([^)]+\))\s*$/);
        if (parenMatch && parenMatch[1].trim()) {
            const mainText = parenMatch[1].trim();
            const noteText = parenMatch[2].trim();
            items.push({ text: mainText, isNote: false, hasBreak: true });
            items.push({ text: noteText + slashSuffix, isNote: true, hasBreak: !isLastChunk });
        } else {
            items.push({ text: c + slashSuffix, isNote: false, hasBreak: !isLastChunk });
        }
    });

    if (items.length === 1 && !items[0].isNote) {
        return escapeHtml(items[0].text);
    }

    return items.map((item, idx) => {
        const escaped = escapeHtml(item.text);
        const classes = ['word-source-chunk'];
        if (item.isNote) classes.push('word-source-note');
        if (item.hasBreak) classes.push('has-break');
        const space = (idx < items.length - 1) ? ' ' : '';
        return `<span class="${classes.join(' ')}">${escaped}</span>${space}`;
    }).join('');
}

function renderCurrentWord() {
    const wordSourceEl = document.getElementById('drill-word-source');
    const inputEl = document.getElementById('drill-input');
    const resultSection = document.getElementById('drill-result');
    const counterEl = document.getElementById('drill-counter');
    const langSourceEl = document.getElementById('drill-lang-source');
    const langTargetEl = document.getElementById('drill-lang-target');

    // Cacher le résultat, vider l'input
    const inputWrapperEl = document.getElementById('drill-input-wrapper');
    if (inputWrapperEl) inputWrapperEl.style.display = 'flex';
    
    resultSection.classList.add('hidden');
    inputEl.value = '';
    inputEl.disabled = false;
    sessionState.isWaitingAction = false;

    const rewriteLine = document.getElementById('rewrite-line');
    const rewriteInput = document.getElementById('rewrite-input');
    const rewriteMirror = document.getElementById('rewrite-mirror');
    const rewritePrefix = document.getElementById('rewrite-prefix');
    const rewriteWrapper = document.getElementById('rewrite-wrapper');
    if (rewriteLine && rewriteInput) {
        rewriteLine.style.display = 'none';
        rewriteInput.value = '';
        rewriteInput.style.color = '';
        rewriteInput.style.caretColor = '';
        rewriteInput.classList.remove('correct');
        rewriteInput.disabled = true;
        if (rewriteMirror) rewriteMirror.innerHTML = '';
        if (rewriteWrapper) rewriteWrapper.style.borderBottomColor = '';
        if (rewritePrefix) {
            rewritePrefix.textContent = '';
            rewritePrefix.style.display = 'none';
        }
    }

    const exampleCorrectLine = document.getElementById('example-correct-line');
    const exampleIncorrectLine = document.getElementById('example-incorrect-line');
    if (exampleCorrectLine) exampleCorrectLine.style.display = 'none';
    if (exampleIncorrectLine) exampleIncorrectLine.style.display = 'none';

    // Mise à jour de l'UI
    langSourceEl.textContent = sessionState.langSource.toUpperCase();
    langTargetEl.textContent = sessionState.langTarget.toUpperCase();

    if (sessionState.words.length === 0) {
        // Fin de session ou plus de mots à apprendre !
        wordSourceEl.textContent = "Session terminée !";
        counterEl.textContent = "-";
        inputEl.style.display = 'none';
        const badgeEl = document.getElementById('drill-word-type-badge');
        if (badgeEl) {
            badgeEl.classList.add('hidden');
            badgeEl.style.display = 'none';
        }
        const levelBadgeEl = document.getElementById('drill-word-level-badge');
        if (levelBadgeEl) {
            levelBadgeEl.classList.add('hidden');
            levelBadgeEl.style.display = 'none';
        }
        return;
    }

    // Afficher le mot courant
    const currentWord = sessionState.words[sessionState.currentIndex];
    wordSourceEl.innerHTML = formatWordForDisplay(currentWord[sessionState.langSource]);
    wordSourceEl.style.display = '';
    
    const wordWrapperEl = document.getElementById('drill-word-wrapper');
    if (wordWrapperEl) wordWrapperEl.style.display = 'flex';
    
    const lang = getAppLanguage();

    // Afficher le badge de catégorie de mot
    const badgeEl = document.getElementById('drill-word-type-badge');
    if (badgeEl) {
        if (currentWord.type) {
            badgeEl.textContent = translations[lang][`type_${currentWord.type}`] || currentWord.type;
            badgeEl.className = `type-badge ${currentWord.type}`;
            badgeEl.classList.remove('hidden');
            badgeEl.style.display = 'inline-block';
        } else {
            badgeEl.classList.add('hidden');
            badgeEl.style.display = 'none';
        }
    }
    
    const levelBadgeEl = document.getElementById('drill-word-level-badge');
    if (levelBadgeEl) {
        if (currentWord.level) {
            levelBadgeEl.textContent = currentWord.level;
            levelBadgeEl.classList.remove('hidden');
            levelBadgeEl.style.display = 'inline-block';
            
            let badgeBg = 'rgba(255,255,255,0.1)';
            let badgeColor = 'inherit';
            if (currentWord.level === 'A1') { badgeBg = 'rgba(59, 130, 246, 0.2)'; badgeColor = '#3b82f6'; }
            if (currentWord.level === 'A2') { badgeBg = 'rgba(6, 182, 212, 0.2)'; badgeColor = '#06b6d4'; }
            if (currentWord.level === 'B1') { badgeBg = 'rgba(16, 185, 129, 0.2)'; badgeColor = '#10b981'; }
            if (currentWord.level === 'B2') { badgeBg = 'rgba(234, 179, 8, 0.2)'; badgeColor = '#eab308'; }
            if (currentWord.level === 'C1') { badgeBg = 'rgba(249, 115, 22, 0.2)'; badgeColor = '#f97316'; }
            if (currentWord.level === 'C2') { badgeBg = 'rgba(239, 68, 68, 0.2)'; badgeColor = '#ef4444'; }
            
            levelBadgeEl.style.background = badgeBg;
            levelBadgeEl.style.color = badgeColor;
            levelBadgeEl.style.fontWeight = '600';
        } else {
            levelBadgeEl.classList.add('hidden');
            levelBadgeEl.style.display = 'none';
        }
    }

    // Configurer le bouton de signalement d'erreur
    setupReportButton('btn-report-word', currentWord);
    setupReportButton('btn-report-word-result', currentWord);
    
    // Afficher la phrase d'exemple dans la langue source (pour ne pas dévoiler la réponse dans la langue cible)
    const exampleSentenceEl = document.getElementById('drill-example-sentence');
    if (exampleSentenceEl) {
        const srcKey = `ex_${sessionState.langSource}`;
        const srcSentence = currentWord[srcKey];

        if (srcSentence) {
            const sourceWord = currentWord[sessionState.langSource];
            const highlightedSrc = highlightExampleSentence(srcSentence, sourceWord, 'font-weight: bold; color: var(--primary-color);');
            exampleSentenceEl.innerHTML = `<div style="font-style: italic; font-size: 1.05rem; color: var(--text-primary); line-height: 1.4;">${highlightedSrc}</div>`;
            exampleSentenceEl.style.display = 'block';
        } else {
            exampleSentenceEl.style.display = 'none';
        }
    }

    const suffix = translations[lang].words_remaining;
    counterEl.textContent = `${sessionState.words.length} ${suffix}`;
    
    // Déterminer et afficher le préfixe visuel fixe (ex: "to ", "the ", "a ", "an ")
    const prefixEl = document.getElementById('drill-input-prefix');
    sessionState.currentPrefix = getTargetPrefix(currentWord, sessionState.langTarget, sessionState.langSource);
    
    if (sessionState.currentPrefix) {
        if (prefixEl) {
            prefixEl.textContent = sessionState.currentPrefix;
            prefixEl.style.display = 'inline-block';
        }
        if (inputWrapperEl) {
            inputWrapperEl.classList.add('has-prefix');
            inputWrapperEl.style.display = 'flex';
        }
    } else {
        if (prefixEl) {
            prefixEl.textContent = '';
            prefixEl.style.display = 'none';
        }
        if (inputWrapperEl) {
            inputWrapperEl.classList.remove('has-prefix');
            inputWrapperEl.style.display = 'flex';
        }
    }

    inputEl.style.display = 'block';
    
    // Quick-keys : touches de caractères spéciaux contextuelles
    renderSpecialKeysBar('drill-special-keys', 'drill-input');
    const rewriteKeysEl = document.getElementById('rewrite-special-keys');
    if (rewriteKeysEl) rewriteKeysEl.style.display = 'none';
    const spellingHintEl = document.getElementById('result-spelling-hint');
    if (spellingHintEl) spellingHintEl.style.display = 'none';

    // On ne donne le focus à l'input que sur ordinateur pour éviter de forcer le clavier sur mobile
    const isMobile = window.innerWidth <= 640;
    if (!isMobile) {
        inputEl.focus();
    }

    // Boutons d'action mobile (phase Saisie)
    const swipeIgnore = document.getElementById('mobile-swipe-ignore');
    const btnMobilePrimary = document.getElementById('btn-mobile-primary');
    
    if (swipeIgnore) {
        swipeIgnore.style.display = 'none';
    }
    if (btnMobilePrimary) {
        btnMobilePrimary.innerHTML = translations[lang].btn_check;
        btnMobilePrimary.className = "btn-primary"; // reset du style de base
        btnMobilePrimary.onclick = (e) => {
            e.stopPropagation();
            handleValidation();
        };
    }
}

function handleValidation() {
    try {
        if (sessionState.isWaitingAction) return;

        const inputEl = document.getElementById('drill-input');
        const userInput = inputEl.value; // On autorise la soumission vide
        
        const currentWord = sessionState.words[sessionState.currentIndex];
        const expected = currentWord[sessionState.langTarget];

        const normalizedInput = normalizeText(userInput);
        const inputNoParens = normalizeText(userInput.replace(/\(.*?\)/g, ' '));
        
        const expectedOptions = [];
        expected.split('/').forEach(s => {
            expectedOptions.push(normalizeText(s));
            expectedOptions.push(normalizeText(s.replace(/\(.*?\)/g, ' ')));
        });

        let allExpectedOpts = [];
        expectedOptions.forEach(opt => {
            allExpectedOpts.push(...getArticleAlternatives(opt));
            allExpectedOpts.push(opt.replace(/^(the |a |an |to )/i, '').trim());
        });
        
        let allInputOpts = [
            normalizedInput, 
            inputNoParens, 
            ...getArticleAlternatives(normalizedInput), 
            ...getArticleAlternatives(inputNoParens)
        ];

        // Si un préfixe était affiché (ex: "to "), inclure la version complétée
        if (sessionState.currentPrefix && userInput.trim()) {
            const prefixClean = sessionState.currentPrefix.trim();
            if (!normalizedInput.startsWith(prefixClean)) {
                const combined = normalizeText(sessionState.currentPrefix + ' ' + userInput);
                allInputOpts.push(combined, ...getArticleAlternatives(combined));
            }
        }

        const isStrictCorrect = allInputOpts.some(inputOpt => allExpectedOpts.includes(inputOpt));
        let isCorrect = isStrictCorrect;
        let isTolerantMatch = false;

        if (!isCorrect && isAccentToleranceEnabled() && userInput.trim()) {
            const tgtLang = (sessionState.langTarget || '').toLowerCase();
            const tolerantInputOpts = allInputOpts.map(opt => normalizeTolerant(opt, tgtLang));
            const tolerantExpectedOpts = allExpectedOpts.map(opt => normalizeTolerant(opt, tgtLang));
            if (tolerantInputOpts.some(inputOpt => tolerantExpectedOpts.includes(inputOpt))) {
                isCorrect = true;
                isTolerantMatch = true;
            }
        }

        // Affichage des résultats
        const asked = currentWord[sessionState.langSource];
        document.getElementById('result-asked').innerHTML = formatWordForDisplay(asked);
        const lang = getAppLanguage();
        
        // Badges Type & Niveau dans l'écran de correction
        const resultTypeBadge = document.getElementById('result-asked-type-badge');
        if (resultTypeBadge) {
            if (currentWord.type) {
                resultTypeBadge.textContent = translations[lang][`type_${currentWord.type}`] || currentWord.type;
                resultTypeBadge.className = `type-badge ${currentWord.type}`;
                resultTypeBadge.classList.remove('hidden');
                resultTypeBadge.style.display = 'inline-block';
            } else {
                resultTypeBadge.classList.add('hidden');
                resultTypeBadge.style.display = 'none';
            }
        }

        const resultLevelBadge = document.getElementById('result-asked-level-badge');
        if (resultLevelBadge) {
            if (currentWord.level) {
                resultLevelBadge.textContent = currentWord.level;
                resultLevelBadge.classList.remove('hidden');
                resultLevelBadge.style.display = 'inline-block';
                
                let badgeBg = 'rgba(255,255,255,0.1)';
                let badgeColor = 'inherit';
                if (currentWord.level === 'A1') { badgeBg = 'rgba(59, 130, 246, 0.2)'; badgeColor = '#3b82f6'; }
                if (currentWord.level === 'A2') { badgeBg = 'rgba(6, 182, 212, 0.2)'; badgeColor = '#06b6d4'; }
                if (currentWord.level === 'B1') { badgeBg = 'rgba(16, 185, 129, 0.2)'; badgeColor = '#10b981'; }
                if (currentWord.level === 'B2') { badgeBg = 'rgba(234, 179, 8, 0.2)'; badgeColor = '#eab308'; }
                if (currentWord.level === 'C1') { badgeBg = 'rgba(249, 115, 22, 0.2)'; badgeColor = '#f97316'; }
                if (currentWord.level === 'C2') { badgeBg = 'rgba(239, 68, 68, 0.2)'; badgeColor = '#ef4444'; }
                
                resultLevelBadge.style.background = badgeBg;
                resultLevelBadge.style.color = badgeColor;
                resultLevelBadge.style.fontWeight = '600';
            } else {
                resultLevelBadge.classList.add('hidden');
                resultLevelBadge.style.display = 'none';
            }
        }
        
        const userContainer = document.getElementById('result-user-container');
        const userEl = document.getElementById('result-user');
        if (userEl) {
            if (!userInput || !userInput.trim()) {
                userEl.textContent = '(vide)';
            } else {
                let cleanUser = userInput.trim();
                if (sessionState.currentPrefix) {
                    const prefixClean = sessionState.currentPrefix.trim();
                    if (cleanUser.toLowerCase().startsWith(prefixClean.toLowerCase())) {
                        cleanUser = cleanUser.substring(prefixClean.length).trim();
                    }
                    userEl.innerHTML = `<span style="color: var(--text-secondary); opacity: 0.55; font-weight: 500;">${sessionState.currentPrefix}</span>${cleanUser}`;
                } else {
                    userEl.textContent = cleanUser;
                }
            }
        }

        const expectedEl = document.getElementById('result-expected');
        if (expectedEl) {
            if (sessionState.currentPrefix && expected) {
                const prefixClean = sessionState.currentPrefix.trim();
                let cleanExp = expected.trim();
                if (cleanExp.toLowerCase().startsWith(prefixClean.toLowerCase())) {
                    cleanExp = cleanExp.substring(prefixClean.length).trim();
                }
                expectedEl.innerHTML = `<span style="color: var(--text-secondary); opacity: 0.55; font-weight: 500;">${sessionState.currentPrefix}</span>${cleanExp}`;
            } else {
                expectedEl.textContent = expected;
            }
        }
        
        // Configuration du bouton de prononciation
        const btnSpeak = document.getElementById('btn-speak-expected');
        if (btnSpeak) {
            btnSpeak.onclick = (e) => {
                e.stopPropagation();
                speakWord(expected, sessionState.langTarget);
            };
        }
        
        const resultSection = document.getElementById('drill-result');
        const statusBanner = document.getElementById('result-status');
        const dynamicHints = document.getElementById('dynamic-hints');

        resultSection.classList.remove('hidden');

        // Prononciation automatique si l'option est activée
        if (localStorage.getItem('drillflow_auto_speak') === 'on') {
            speakWord(expected, sessionState.langTarget);
        }
        
        const inputWrapperEl = document.getElementById('drill-input-wrapper');
        if (inputWrapperEl) {
            inputWrapperEl.style.display = 'none';
            inputWrapperEl.classList.remove('has-prefix');
        }
        const prefixEl = document.getElementById('drill-input-prefix');
        if (prefixEl) {
            prefixEl.style.display = 'none';
        }
        
        inputEl.disabled = true;
        inputEl.blur(); // Masque le clavier virtuel sur mobile
        sessionState.isWaitingAction = true;

        const wordWrapperEl = document.getElementById('drill-word-wrapper');
        if (wordWrapperEl) wordWrapperEl.style.display = 'none';
        
        // Cacher l'exemple durant la saisie
        const exampleSentenceEl = document.getElementById('drill-example-sentence');
        if (exampleSentenceEl) exampleSentenceEl.style.display = 'none';

        const badgeEl = document.getElementById('drill-word-type-badge');
        if (badgeEl) {
            badgeEl.classList.add('hidden');
            badgeEl.style.display = 'none';
        }
        const levelBadgeEl = document.getElementById('drill-word-level-badge');
        if (levelBadgeEl) {
            levelBadgeEl.classList.add('hidden');
            levelBadgeEl.style.display = 'none';
        }

        const isMobile = window.innerWidth <= 640;

        // Rendu visuel correct / faux selon CDC
        if (isCorrect) {
            statusBanner.textContent = translations[lang].status_correct;
            statusBanner.style.backgroundColor = 'var(--success-color)';
            statusBanner.style.color = '#fff';
            statusBanner.dataset.correct = "true";

            const spellingHintEl = document.getElementById('result-spelling-hint');
            if (spellingHintEl) {
                if (isTolerantMatch) {
                    const primaryExpected = expected.split('/')[0].trim();
                    const template = translations[lang]?.spelling_hint || translations['fr']?.spelling_hint || "Orthographe exacte : {word}";
                    spellingHintEl.innerHTML = `💡 ${template.replace('{word}', `<strong>${escapeHtml(primaryExpected)}</strong>`)}`;
                    spellingHintEl.style.display = 'inline-flex';
                } else {
                    spellingHintEl.style.display = 'none';
                }
            }

            const drillKeysEl = document.getElementById('drill-special-keys');
            if (drillKeysEl) drillKeysEl.style.display = 'none';
            const rewriteKeysEl = document.getElementById('rewrite-special-keys');
            if (rewriteKeysEl) rewriteKeysEl.style.display = 'none';
            
            const expectedContainer = document.getElementById('result-expected-container');
            if (expectedContainer) {
                expectedContainer.style.display = 'flex';
            }
            if (userContainer) {
                userContainer.style.display = 'none';
            }
            
            const rewriteLine = document.getElementById('rewrite-line');
            if (rewriteLine) {
                rewriteLine.style.display = 'none';
            }
            
            const exampleCorrectLine = document.getElementById('example-correct-line');
            const exampleCorrectText = document.getElementById('example-correct-text');
            renderComparisonExample(exampleCorrectLine, exampleCorrectText, currentWord);
            
            const iconCheck = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            const labelContinue = translations[lang].action_continue || "Continuer";
            
            dynamicHints.innerHTML = isMobile ? '' : `
                <button id="btn-next-auto" class="btn-drill-action btn-primary-action">
                    <kbd class="desktop-only">Entrée</kbd> <span style="display: flex; align-items: center; gap: 0.4rem;">${iconCheck} ${labelContinue}</span>
                </button>
            `;
            
            const btnAuto = document.getElementById('btn-next-auto');
            if (btnAuto) btnAuto.onclick = () => proceedNextWord('auto');
            
            if (isMobile) {
                const swipeIgnore = document.getElementById('mobile-swipe-ignore');
                const btnMobilePrimary = document.getElementById('btn-mobile-primary');
                
                if (swipeIgnore) {
                    swipeIgnore.style.display = 'none';
                }
                if (btnMobilePrimary) {
                    // Correct : Action unique = Continuer
                    btnMobilePrimary.innerHTML = `<span style="display: flex; align-items: center; justify-content: center; width: 100%; gap: 0.4rem;">${iconCheck} ${labelContinue}</span>`;
                    btnMobilePrimary.className = "btn-primary";
                    btnMobilePrimary.onclick = (e) => { e.stopPropagation(); proceedNextWord('auto'); };
                }
            }
        } else {
            statusBanner.textContent = translations[lang].status_incorrect;
            statusBanner.style.backgroundColor = 'var(--error-color)';
            statusBanner.style.color = '#fff';
            statusBanner.dataset.correct = "false";

            const spellingHintEl = document.getElementById('result-spelling-hint');
            if (spellingHintEl) spellingHintEl.style.display = 'none';

            const drillKeysEl = document.getElementById('drill-special-keys');
            if (drillKeysEl) drillKeysEl.style.display = 'none';
            
            const expectedContainer = document.getElementById('result-expected-container');
            if (expectedContainer) {
                expectedContainer.style.display = 'flex';
            }
            if (userContainer) {
                userContainer.style.display = 'flex';
            }
            
            const rewriteLine = document.getElementById('rewrite-line');
            const rewriteInput = document.getElementById('rewrite-input');
            const rewriteMirror = document.getElementById('rewrite-mirror');
            const rewritePrefix = document.getElementById('rewrite-prefix');
            const rewriteWrapper = document.getElementById('rewrite-wrapper');

            if (rewriteLine && rewriteInput && !isMobile) {
                rewriteLine.style.display = 'flex';
                renderSpecialKeysBar('rewrite-special-keys', 'rewrite-input');
                rewriteInput.value = '';
                rewriteInput.style.color = '';
                rewriteInput.style.caretColor = '#10b981';
                rewriteInput.classList.remove('correct');
                rewriteInput.disabled = false;
                if (rewriteMirror) rewriteMirror.innerHTML = '';
                if (rewriteWrapper) rewriteWrapper.style.borderBottomColor = '';
                
                rewriteInput.onkeydown = (e) => {
                    const key = e.key ? e.key.toLowerCase() : '';
                    if (key === 'enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13) {
                        e.preventDefault();
                        e.stopPropagation();
                        proceedNextWord('auto');
                    }
                };
                
                if (rewritePrefix) {
                    if (sessionState.currentPrefix) {
                        rewritePrefix.textContent = sessionState.currentPrefix;
                        rewritePrefix.style.display = 'inline';
                    } else {
                        rewritePrefix.textContent = '';
                        rewritePrefix.style.display = 'none';
                    }
                }
                
                rewriteInput.onscroll = () => {
                    if (rewriteMirror) rewriteMirror.scrollLeft = rewriteInput.scrollLeft;
                };

                rewriteInput.oninput = () => {
                    if (rewriteMirror) rewriteMirror.scrollLeft = rewriteInput.scrollLeft;
                    const val = rewriteInput.value;
                    if (!val) {
                        if (rewriteMirror) rewriteMirror.innerHTML = '';
                        rewriteInput.style.color = '';
                        rewriteInput.style.caretColor = '#10b981';
                        rewriteInput.classList.remove('correct');
                        if (rewriteWrapper) rewriteWrapper.style.borderBottomColor = '';
                        return;
                    }

                    // Calcul de la longueur de correspondance avec les options attendues
                    const matchLen = getRewriteMatchLength(val, expected);
                    const hasError = matchLen < val.length;

                    // Masquer le texte natif pour laisser transparaître le rendu bicolore
                    rewriteInput.style.color = 'transparent';
                    rewriteInput.style.caretColor = hasError ? 'var(--text-primary)' : '#10b981';

                    const matchedStr = escapeHtml(val.substring(0, matchLen));
                    const unmatchedStr = escapeHtml(val.substring(matchLen));

                    if (rewriteMirror) {
                        rewriteMirror.innerHTML = `<span style="color: #10b981;">${matchedStr}</span><span style="color: var(--text-primary);">${unmatchedStr}</span>`;
                    }

                    // Vérifier si la saisie est entièrement et exactement correcte
                    const normalizedInput = normalizeText(val);
                    let isRewriteCorrect = false;
                    expected.split('/').forEach(s => {
                        const normExp = normalizeText(s);
                        const normExpNoParens = normalizeText(s.replace(/\(.*?\)/g, ' '));
                        
                        let expOpts = [
                            ...getArticleAlternatives(normExp), 
                            ...getArticleAlternatives(normExpNoParens),
                            normExp.replace(/^(the |a |an |to )/i, '').trim()
                        ];
                        let inOpts = [
                            normalizedInput, 
                            ...getArticleAlternatives(normalizedInput)
                        ];

                        if (sessionState.currentPrefix && normalizedInput) {
                            const prefixClean = sessionState.currentPrefix.trim();
                            if (!normalizedInput.startsWith(prefixClean)) {
                                const combined = normalizeText(sessionState.currentPrefix + ' ' + normalizedInput);
                                inOpts.push(combined, ...getArticleAlternatives(combined));
                            }
                        }
                        
                        if (inOpts.some(io => expOpts.includes(io))) {
                            isRewriteCorrect = true;
                        }
                    });

                    // Si pas encore validé, vérifier avec tolérance si activée
                    if (!isRewriteCorrect && isAccentToleranceEnabled() && val.trim()) {
                        const tgtLang = (sessionState.langTarget || '').toLowerCase();
                        const tolerantInput = normalizeTolerant(val, tgtLang);
                        let tolerantInOpts = [tolerantInput, ...getArticleAlternatives(tolerantInput)];
                        if (sessionState.currentPrefix && tolerantInput) {
                            const combined = normalizeTolerant(sessionState.currentPrefix + ' ' + tolerantInput, tgtLang);
                            tolerantInOpts.push(combined, ...getArticleAlternatives(combined));
                        }
                        expected.split('/').forEach(s => {
                            const normExp = normalizeTolerant(s, tgtLang);
                            const normExpNoParens = normalizeTolerant(s.replace(/\(.*?\)/g, ' '), tgtLang);
                            let expOpts = [
                                ...getArticleAlternatives(normExp), 
                                ...getArticleAlternatives(normExpNoParens),
                                normExp.replace(/^(the |a |an |to )/i, '').trim()
                            ];
                            if (tolerantInOpts.some(io => expOpts.includes(io))) {
                                isRewriteCorrect = true;
                            }
                        });
                    }

                    if (isRewriteCorrect) {
                        rewriteInput.classList.add('correct');
                        if (rewriteWrapper) rewriteWrapper.style.borderBottomColor = '#10b981';
                    } else {
                        rewriteInput.classList.remove('correct');
                        if (rewriteWrapper) rewriteWrapper.style.borderBottomColor = hasError ? 'var(--border-color)' : '#10b981';
                    }
                };
                
                setTimeout(() => {
                    rewriteInput.focus();
                }, 50);
            } else if (rewriteLine) {
                // Sûr de masquer la ligne de réécriture sur mobile
                rewriteLine.style.display = 'none';
            }
            
            const exampleIncorrectLine = document.getElementById('example-incorrect-line');
            const exampleIncorrectText = document.getElementById('example-incorrect-text');
            renderComparisonExample(exampleIncorrectLine, exampleIncorrectText, currentWord);
            
            const iconRotate = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path></svg>`;
            const iconBan = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>`;
            
            const labelReview = translations[lang].action_review;
            const labelIgnore = translations[lang].action_ignore || "Ne plus me demander";
            
            dynamicHints.innerHTML = isMobile ? '' : `
                <button id="btn-next-ignore" class="btn-drill-action btn-secondary-action">
                    <kbd class="desktop-only">Alt + R</kbd> <span style="display: flex; align-items: center; gap: 0.4rem;">${iconBan} ${labelIgnore}</span>
                </button>
                <button id="btn-next-auto" class="btn-drill-action btn-primary-action">
                    <kbd class="desktop-only">Entrée</kbd> <span style="display: flex; align-items: center; gap: 0.4rem;">${iconRotate} ${labelReview}</span>
                </button>
            `;
            
            const btnAuto = document.getElementById('btn-next-auto');
            if (btnAuto) btnAuto.onclick = () => proceedNextWord('auto');
            
            const btnIgnore = document.getElementById('btn-next-ignore');
            if (btnIgnore) btnIgnore.onclick = () => proceedNextWord('ignore');
            
            if (isMobile) {
                const swipeIgnore = document.getElementById('mobile-swipe-ignore');
                const btnMobilePrimary = document.getElementById('btn-mobile-primary');
                
                if (btnMobilePrimary) {
                    // Incorrect : Action par défaut = À revoir (1-tap classique)
                    btnMobilePrimary.innerHTML = `<span style="display: flex; align-items: center; justify-content: center; width: 100%; gap: 0.4rem;">${iconRotate} ${labelReview}</span>`;
                    btnMobilePrimary.className = "btn-primary";
                    btnMobilePrimary.onclick = (e) => { e.stopPropagation(); proceedNextWord('keep'); };
                }
                
                if (swipeIgnore) {
                    swipeIgnore.style.display = 'block';
                    initSwipeToIgnore();
                }
            }
        }
    } catch (error) {
        alert("Erreur JS: " + error.message + "\nLigne: " + error.lineNumber);
        console.error(error);
    }
}

// Initialisation du geste Glisser pour confirmer (Slide to ignore) sur mobile
function initSwipeToIgnore() {
    const track = document.getElementById('swipe-ignore-track');
    const fill = document.getElementById('swipe-ignore-fill');
    const label = document.getElementById('swipe-ignore-label');
    const thumb = document.getElementById('swipe-ignore-thumb');
    if (!track || !fill || !label || !thumb) return;

    const lang = localStorage.getItem('drill_lang') || 'fr';
    const labelText = translations[lang]?.slide_to_ignore || "Glisser pour ne plus demander";
    label.innerHTML = `<span>${labelText}</span><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>`;

    // Réinitialisation de l'état visuel
    thumb.style.transition = 'none';
    fill.style.transition = 'none';
    label.style.transition = 'none';
    thumb.style.transform = 'translateX(0px)';
    fill.style.width = '0px';
    label.style.opacity = '1';

    let isDragging = false;
    let startX = 0;
    let currentX = 0;
    let maxDistance = 0;
    let completed = false;

    function handlePointerDown(e) {
        if (completed) return;
        isDragging = true;
        startX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
        
        const trackRect = track.getBoundingClientRect();
        const thumbRect = thumb.getBoundingClientRect();
        maxDistance = Math.max(0, trackRect.width - thumbRect.width - 6); // 3px padding de chaque côté

        thumb.style.transition = 'none';
        fill.style.transition = 'none';
        label.style.transition = 'none';

        if (thumb.setPointerCapture && e.pointerId !== undefined) {
            try { thumb.setPointerCapture(e.pointerId); } catch (err) {}
        }

        window.addEventListener('pointermove', handlePointerMove, { passive: false });
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerUp);
        
        // Support fallback pour anciens navigateurs touch
        window.addEventListener('touchmove', handlePointerMove, { passive: false });
        window.addEventListener('touchend', handlePointerUp);
        window.addEventListener('touchcancel', handlePointerUp);
    }

    function handlePointerMove(e) {
        if (!isDragging || completed) return;
        currentX = e.clientX || (e.touches && e.touches[0].clientX) || currentX;
        const deltaX = currentX - startX;
        const clampedX = Math.max(0, Math.min(deltaX, maxDistance));

        thumb.style.transform = `translateX(${clampedX}px)`;
        fill.style.width = `${clampedX + 20}px`;

        if (maxDistance > 0) {
            const progress = clampedX / maxDistance;
            label.style.opacity = `${Math.max(0, 1 - progress * 1.6)}`;
        }

        if (e.cancelable) e.preventDefault();
    }

    function handlePointerUp(e) {
        if (!isDragging || completed) return;
        isDragging = false;

        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        window.removeEventListener('pointercancel', handlePointerUp);
        window.removeEventListener('touchmove', handlePointerMove);
        window.removeEventListener('touchend', handlePointerUp);
        window.removeEventListener('touchcancel', handlePointerUp);

        currentX = e.clientX || (e.changedTouches && e.changedTouches[0].clientX) || currentX;
        const deltaX = currentX - startX;

        if (maxDistance > 0 && deltaX >= maxDistance * 0.75) {
            // Validation réussie du glissement !
            completed = true;
            thumb.style.transition = 'transform 0.15s ease-out';
            fill.style.transition = 'width 0.15s ease-out';
            thumb.style.transform = `translateX(${maxDistance}px)`;
            fill.style.width = '100%';

            const doneText = translations[lang]?.slide_ignored_done || "Ignoré !";
            label.innerHTML = `<span>${doneText}</span>`;
            label.style.opacity = '1';

            if (navigator.vibrate) {
                try { navigator.vibrate(40); } catch (err) {}
            }

            setTimeout(() => {
                proceedNextWord('ignore');
            }, 180);
        } else {
            // Retour élastique au début
            thumb.style.transition = 'transform 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)';
            fill.style.transition = 'width 0.25s cubic-bezier(0.2, 0.9, 0.3, 1)';
            label.style.transition = 'opacity 0.25s ease';

            thumb.style.transform = 'translateX(0px)';
            fill.style.width = '0px';
            label.style.opacity = '1';
        }
    }

    thumb.onpointerdown = handlePointerDown;
    thumb.ontouchstart = handlePointerDown;
}

// Action sur le mot (garder, retirer ou ignorer)
function proceedNextWord(action) {
    if (!sessionState.isWaitingAction || sessionState.words.length === 0) return;

    const currentWord = sessionState.words[sessionState.currentIndex];
    const statusBanner = document.getElementById('result-status');
    const wasCorrect = statusBanner.dataset.correct === "true";

    if (!sessionState.wordSessionAttempts) {
        sessionState.wordSessionAttempts = {};
    }
    const wordId = currentWord.id;
    const sessionTries = sessionState.wordSessionAttempts[wordId] || 0;

    let finalStatus = 'actif';
    let removeFromSession = false;
    let explicitAttempts = null;

    if (action === 'ignore') {
        finalStatus = 'ignoré';
        removeFromSession = true;
        explicitAttempts = 0;
    } else if (action === 'auto' || action === 'remove') {
        if (wasCorrect) {
            removeFromSession = true;
            if (sessionTries === 0) {
                // Réussi du premier coup dans cette session -> Validé avec 1 seule tentative !
                finalStatus = 'validé';
                explicitAttempts = 1;
            } else {
                // Réussi après une ou plusieurs erreurs dans ce même batch -> Reste actif (à consolider)
                finalStatus = 'actif';
                explicitAttempts = sessionTries + 1;
            }
        } else {
            // Erreur -> Reste dans la session et est réinséré plus loin
            sessionState.wordSessionAttempts[wordId] = sessionTries + 1;
            finalStatus = 'actif';
            removeFromSession = false;
            explicitAttempts = sessionState.wordSessionAttempts[wordId] + 1;
        }
    } else if (action === 'keep') {
        sessionState.wordSessionAttempts[wordId] = sessionTries + 1;
        finalStatus = 'actif';
        removeFromSession = false;
        explicitAttempts = sessionState.wordSessionAttempts[wordId] + 1;
    }

    setWordStatus(sessionState.langSource, sessionState.langTarget, currentWord.id, finalStatus, false, explicitAttempts);

    // Supprimer le mot de la session courante s'il est retiré ou réussi
    if (removeFromSession) {
        sessionState.words.splice(sessionState.currentIndex, 1);
        if (sessionState.currentIndex >= sessionState.words.length) {
            sessionState.currentIndex = 0; // Reboucler
        }
    } else {
        // Le mot reste dans la session (erreur ou forcé à garder).
        // On le réinsère plus loin (entre 6 et 9 positions plus tard, de façon aléatoire) 
        // pour qu'il réapparaisse après d'autres mots et éviter l'effet de boucle bloquée.
        if (sessionState.words.length > 1) {
            const [wordToMove] = sessionState.words.splice(sessionState.currentIndex, 1);
            const minDistance = parseInt(localStorage.getItem('drillflow_reinsert_min') || '6', 10);
            const maxDistance = parseInt(localStorage.getItem('drillflow_reinsert_max') || '9', 10);
            const offset = Math.floor(Math.random() * (Math.max(minDistance, maxDistance) - minDistance + 1)) + minDistance;
            const insertIndex = Math.min(sessionState.currentIndex + offset, sessionState.words.length);
            sessionState.words.splice(insertIndex, 0, wordToMove);
            
            // Pas besoin d'incrémenter l'index car le mot suivant a glissé à l'index courant
            if (sessionState.currentIndex >= sessionState.words.length) {
                sessionState.currentIndex = 0;
            }
        } else {
            // S'il n'y a qu'un mot, il reste à l'index 0
            sessionState.currentIndex = 0;
        }
    }

    if (sessionState.words.length === 0) {
        showEndSession();
        return;
    }

    renderCurrentWord();
}

function showEndSession() {
    const flashcard = document.querySelector('.flashcard');
    const headerSection = document.getElementById('drill-header-section');
    const endContainer = document.getElementById('end-session-container');
    
    if (flashcard) flashcard.style.display = 'none';
    if (headerSection) headerSection.style.display = 'none';
    const drillKeysEl = document.getElementById('drill-special-keys');
    if (drillKeysEl) drillKeysEl.style.display = 'none';
    const rewriteKeysEl = document.getElementById('rewrite-special-keys');
    if (rewriteKeysEl) rewriteKeysEl.style.display = 'none';
    const spellingHintEl = document.getElementById('result-spelling-hint');
    if (spellingHintEl) spellingHintEl.style.display = 'none';
    if (endContainer) {
        endContainer.style.display = 'flex';
        
        // Afficher la promo context-drill si des mots ont des exemples
        const promo = document.getElementById('context-drill-promo');
        const wordsWithExamples = sessionState.originalWords ? sessionState.originalWords.filter(w => w['ex_' + sessionState.langTarget]) : [];
        if (promo) {
            if (wordsWithExamples.length > 0) {
                promo.style.display = 'block';
            } else {
                promo.style.display = 'none';
            }
        }
        
        const btnStartContext = document.getElementById('btn-start-context-drill');
        if (btnStartContext) {
            btnStartContext.onclick = () => {
                if (window.startContextDrill) window.startContextDrill();
            };
        }

        const btnNewBatch = document.getElementById('btn-new-batch');
        if (btnNewBatch) {
            btnNewBatch.onclick = () => {
                // Pour déclencher la navigation, on simule un clic sur le bouton home du menu
                document.getElementById('nav-home').click();
            };
        }
    }
    
    // Déclenchement des confettis
    if (typeof confetti === 'function') {
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        function randomInRange(min, max) {
            return Math.random() * (max - min) + min;
        }

        const interval = setInterval(function() {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) {
                return clearInterval(interval);
            }
            const particleCount = 50 * (timeLeft / duration);
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
        }, 250);
    }
}

// Export pour brancher les events dans main.js
export function handleDrillKeydown(e) {
    const activeEl = document.activeElement;
    const drillInput = document.getElementById('drill-input');
    const rewriteInput = document.getElementById('rewrite-input');
    const isRewriteFocused = rewriteInput && activeEl === rewriteInput;
    const isDrillInputFocused = activeEl && (activeEl === drillInput || activeEl === rewriteInput);
    const isOtherInputFocused = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.tagName === 'SELECT' || 
        activeEl.isContentEditable
    ) && !isDrillInputFocused;

    if (isOtherInputFocused) {
        return;
    }

    const reportModal = document.getElementById('report-modal');
    const isReportModalOpen = reportModal && !reportModal.classList.contains('hidden');

    if (isReportModalOpen) {
        if (e.key === 'Escape') {
            e.preventDefault();
            reportModal.classList.add('hidden');
        }
        return;
    }

    const isEnterKey = e.key === 'Enter' || e.code === 'Enter' || e.code === 'NumpadEnter' || e.keyCode === 13;

    if (!sessionState.isWaitingAction) {
        // Mode saisie
        if (isEnterKey) {
            e.preventDefault();
            e.stopPropagation();
            handleValidation();
        }
    } else {
        // Mode résultat, attente d'action
        const key = e.key ? e.key.toLowerCase() : '';
        
        if (isRewriteFocused) {
            // Dans le champ de réécriture, on autorise Échap pour sortir du focus (blur), et Alt+R pour ignorer
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                rewriteInput.blur();
                return;
            }

            if (key === 'r' && e.altKey) {
                e.preventDefault();
                e.stopPropagation();
                proceedNextWord('ignore');
                return;
            }

            if (isEnterKey) {
                e.preventDefault();
                e.stopPropagation();
                proceedNextWord('auto');
            }
            return;
        }

        if (isEnterKey) {
            e.preventDefault();
            e.stopPropagation();
            proceedNextWord('auto');
        } else if (key === 'r') {
            e.preventDefault();
            e.stopPropagation();
            proceedNextWord('ignore');
        } else if (key === 'p' || key === 's') {
            e.preventDefault();
            e.stopPropagation();
            const currentWord = sessionState.words[sessionState.currentIndex];
            const expectedWord = currentWord[sessionState.langTarget];
            speakWord(expectedWord, sessionState.langTarget);
        }
    }
}

// Fonction de prononciation utilisant la synthese vocale du navigateur
function speakWord(text, lang) {
    if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel(); // Annule toute prononciation en cours
        // Nettoyage simple : on ignore ce qui est entre parentheses (ex: notes de contexte)
        const cleanText = text.split('(')[0].trim();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        const langMap = {
            'fr': 'fr-FR',
            'en': 'en-US',
            'de': 'de-DE',
            'es': 'es-ES'
        };
        utterance.lang = langMap[lang] || lang;
        window.speechSynthesis.speak(utterance);
    }
}



// --- CONTEXT DRILL LOGIC ---
let contextState = {
    pairs: [],
    matchesLeft: 0,
    selectedWordId: null
};

function startContextDrill() {
    const wordsWithExamples = sessionState.originalWords.filter(w => w['ex_' + sessionState.langTarget]);
    if (wordsWithExamples.length === 0) {
        document.getElementById('nav-home').click();
        return;
    }

    const endContainer = document.getElementById('end-session-container');
    if (endContainer) endContainer.style.display = 'none';

    const contextContainer = document.getElementById('context-drill-container');
    if (contextContainer) contextContainer.style.display = 'flex';

    contextState.pairs = wordsWithExamples.map(w => {
        const targetWord = w[sessionState.langTarget];
        const sentence = w['ex_' + sessionState.langTarget];
        let sentenceHtml = sentence;
        if (sentence.includes('*')) {
            sentenceHtml = sentence.replace(/\*([^*]+)\*/g, '<span class="context-dropzone" data-id="' + w.id + '"></span>');
        } else {
            const regex = buildTargetRegex(targetWord);
            let replaced = false;
            sentenceHtml = sentence.replace(regex, (match) => {
                if (!replaced) {
                    replaced = true;
                    return '<span class="context-dropzone" data-id="' + w.id + '"></span>';
                }
                return match;
            });
            if (!replaced) {
                sentenceHtml = highlightExampleSentence(sentence, targetWord, 'class="context-dropzone" data-id="' + w.id + '"');
            }
        }
        return {
            id: w.id,
            wordText: targetWord,
            sentenceHtml: sentenceHtml
        };
    });

    contextState.matchesLeft = contextState.pairs.length;
    contextState.selectedWordId = null;

    renderContextDrill();
}

function renderContextDrill() {
    const poolEl = document.getElementById('context-word-pool');
    const sentencesEl = document.getElementById('context-sentences-list');
    
    poolEl.innerHTML = '';
    sentencesEl.innerHTML = '';

    const shuffledWords = shuffle([...contextState.pairs]);
    const shuffledSentences = shuffle([...contextState.pairs]);

    shuffledWords.forEach(pair => {
        const btn = document.createElement('div');
        btn.className = 'context-word-btn';
        btn.textContent = pair.wordText;
        btn.dataset.id = pair.id;
        btn.draggable = true;

        // Desktop HTML5 Drag & Drop
        btn.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', pair.id);
            btn.classList.add('dragging');
        });
        btn.addEventListener('dragend', () => {
            btn.classList.remove('dragging');
        });

        // Mobile Touch Drag & Drop
        let touchClone = null;
        let activeDz = null;
        let touchMoved = false;
        let cachedDzRects = [];
        let cloneOffsetX = 0;
        let cloneOffsetY = 0;

        btn.addEventListener('touchstart', (e) => {
            touchMoved = false;
            const touch = e.touches[0];
            const rect = btn.getBoundingClientRect();
            
            cloneOffsetX = rect.width / 2;
            cloneOffsetY = rect.height / 2;

            // Pré-calculer les zones de dépôt pour éviter getBoundingClientRect et elementFromPoint en boucle
            cachedDzRects = Array.from(document.querySelectorAll('.context-dropzone:not(.success)')).map(dz => ({
                el: dz,
                rect: dz.getBoundingClientRect()
            }));

            touchClone = btn.cloneNode(true);
            touchClone.classList.add('touch-drag-clone');
            touchClone.style.position = 'fixed';
            touchClone.style.left = '0px';
            touchClone.style.top = '0px';
            touchClone.style.width = `${rect.width}px`;
            touchClone.style.height = `${rect.height}px`;
            touchClone.style.zIndex = '99999';
            touchClone.style.pointerEvents = 'none';
            touchClone.style.opacity = '0.92';
            touchClone.style.transform = `translate3d(${touch.clientX - cloneOffsetX}px, ${touch.clientY - cloneOffsetY}px, 0) scale(1.08)`;
            touchClone.style.willChange = 'transform';
            touchClone.style.boxShadow = '0 12px 28px rgba(0,0,0,0.35)';
            document.body.appendChild(touchClone);

            btn.classList.add('dragging');
        }, { passive: true });

        btn.addEventListener('touchmove', (e) => {
            if (!touchClone) return;
            touchMoved = true;
            const touch = e.touches[0];
            
            // Accélération matérielle (GPU) pour un mouvement ultra-fluide
            touchClone.style.transform = `translate3d(${touch.clientX - cloneOffsetX}px, ${touch.clientY - cloneOffsetY}px, 0) scale(1.08)`;

            // Détection de la dropzone via mathématiques rapides (évite les calculs DOM coûteux)
            let dzBelow = null;
            for (let i = 0; i < cachedDzRects.length; i++) {
                const dz = cachedDzRects[i];
                if (touch.clientX >= dz.rect.left && touch.clientX <= dz.rect.right &&
                    touch.clientY >= dz.rect.top && touch.clientY <= dz.rect.bottom) {
                    dzBelow = dz.el;
                    break;
                }
            }

            if (activeDz && activeDz !== dzBelow) {
                activeDz.classList.remove('drag-over');
            }
            if (dzBelow) {
                dzBelow.classList.add('drag-over');
                activeDz = dzBelow;
            } else {
                activeDz = null;
            }

            if (e.cancelable) e.preventDefault();
        }, { passive: false });

        btn.addEventListener('touchend', () => {
            btn.classList.remove('dragging');
            if (touchClone) {
                touchClone.remove();
                touchClone = null;
            }
            cachedDzRects = []; // Vider le cache

            if (activeDz) {
                activeDz.classList.remove('drag-over');
                const card = activeDz.closest('.context-sentence-card');
                handleContextMatch(pair.id, activeDz.dataset.id, activeDz, card);
                activeDz = null;
            }
        });

        btn.addEventListener('touchcancel', () => {
            btn.classList.remove('dragging');
            if (touchClone) {
                touchClone.remove();
                touchClone = null;
            }
            cachedDzRects = []; // Vider le cache
            if (activeDz) {
                activeDz.classList.remove('drag-over');
                activeDz = null;
            }
        });

        // Tap to select (compatible Desktop et Mobile)
        btn.addEventListener('click', (e) => {
            if (touchMoved) return;
            const isAlreadySelected = btn.classList.contains('selected');
            document.querySelectorAll('.context-word-btn').forEach(b => b.classList.remove('selected'));
            
            if (isAlreadySelected) {
                contextState.selectedWordId = null;
                document.querySelectorAll('.context-dropzone.selectable').forEach(dz => dz.classList.remove('selectable'));
            } else {
                btn.classList.add('selected');
                contextState.selectedWordId = pair.id;
                
                document.querySelectorAll('.context-dropzone').forEach(dz => {
                    if (!dz.classList.contains('success')) {
                        dz.classList.add('selectable');
                    }
                });
            }
        });

        poolEl.appendChild(btn);
    });

    shuffledSentences.forEach(pair => {
        const card = document.createElement('div');
        card.className = 'context-sentence-card';
        card.id = 'sentence-card-' + pair.id;
        
        const text = document.createElement('div');
        text.className = 'context-sentence-text';
        text.innerHTML = pair.sentenceHtml;

        card.appendChild(text);
        sentencesEl.appendChild(card);

        const dzs = card.querySelectorAll('.context-dropzone');
        dzs.forEach(dz => {
            dz.addEventListener('dragover', (e) => {
                e.preventDefault();
                dz.classList.add('drag-over');
            });
            dz.addEventListener('dragleave', () => {
                dz.classList.remove('drag-over');
            });
            dz.addEventListener('drop', (e) => {
                e.preventDefault();
                dz.classList.remove('drag-over');
                const draggedId = e.dataTransfer.getData('text/plain');
                handleContextMatch(draggedId, dz.dataset.id, dz, card);
            });

            dz.addEventListener('click', () => {
                if (contextState.selectedWordId && !dz.classList.contains('success')) {
                    handleContextMatch(contextState.selectedWordId, dz.dataset.id, dz, card);
                }
            });
        });
    });
}

function handleContextMatch(draggedId, targetId, dzEl, cardEl) {
    if (draggedId === targetId) {
        if (window.appSettings && window.appSettings.soundEnabled !== false) {
            const audio = new Audio('assets/sounds/correct.mp3');
            audio.volume = 0.5;
            audio.play().catch(e => console.log('Audio error:', e));
        }

        const btn = document.querySelector('.context-word-btn[data-id="' + draggedId + '"]');
        if (btn) {
            btn.classList.remove('selected');
            btn.classList.add('success-match');
            setTimeout(() => btn.style.display = 'none', 500);
        }

        dzEl.classList.remove('selectable');
        dzEl.classList.add('success');
        dzEl.textContent = btn ? btn.textContent : '...';

        cardEl.classList.add('matched');
        setTimeout(() => cardEl.style.display = 'none', 500);

        contextState.selectedWordId = null;
        document.querySelectorAll('.context-dropzone.selectable').forEach(d => d.classList.remove('selectable'));

        contextState.matchesLeft--;
        if (contextState.matchesLeft <= 0) {
            setTimeout(showContextEndSession, 600);
        }
    } else {
        if (window.appSettings && window.appSettings.soundEnabled !== false) {
            const audio = new Audio('assets/sounds/incorrect.mp3');
            audio.volume = 0.5;
            audio.play().catch(e => console.log('Audio error:', e));
        }
        dzEl.classList.add('error-shake');
        setTimeout(() => dzEl.classList.remove('error-shake'), 400);
    }
}

function showContextEndSession() {
    const contextContainer = document.getElementById('context-drill-container');
    if (contextContainer) contextContainer.style.display = 'none';
    
    const endContainer = document.getElementById('end-session-container');
    if (endContainer) {
        endContainer.style.display = 'flex';
        const promo = document.getElementById('context-drill-promo');
        if (promo) promo.style.display = 'none';
    }

    if (typeof confetti === 'function') {
        const duration = 2 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
        function randomInRange(min, max) { return Math.random() * (max - min) + min; }
        const interval = setInterval(function() {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) return clearInterval(interval);
            const particleCount = 50 * (timeLeft / duration);
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
        }, 250);
    }
}

window.startContextDrill = startContextDrill;

function setupReportButton(btnId, currentWord) {
    const btn = document.getElementById(btnId);
    if (!btn) return;

    if (sessionState.reportedWords && sessionState.reportedWords.has(currentWord.id)) {
        btn.classList.add('reported');
        btn.title = "Déjà signalé";
    } else {
        btn.classList.remove('reported');
        btn.title = "Signaler une erreur sur ce mot";
    }

    btn.onclick = (e) => {
        e.stopPropagation();
        openReportModal(currentWord, btn);
    };
}

function openReportModal(currentWord, btnEl) {
    const modal = document.getElementById('report-modal');
    const textEl = document.getElementById('report-modal-text');
    const commentInput = document.getElementById('report-comment');
    const charCounter = document.getElementById('report-comment-counter');
    const btnConfirm = document.getElementById('btn-report-confirm');
    const btnCancel = document.getElementById('btn-report-cancel');
    if (!modal) return;

    if (commentInput) {
        commentInput.value = '';
        if (charCounter) charCounter.textContent = '0 / 100';
        commentInput.oninput = () => {
            if (charCounter) {
                charCounter.textContent = `${commentInput.value.length} / 100`;
            }
        };
        commentInput.onkeydown = (e) => {
            e.stopPropagation();
            if (e.key === 'Escape') {
                e.preventDefault();
                modal.classList.add('hidden');
            }
        };
    }

    // Reset & handler pour les puces de motif
    const chips = modal.querySelectorAll('.report-chip');
    let selectedReason = 'Mauvaise traduction';
    chips.forEach((chip, index) => {
        if (index === 0) {
            chip.classList.add('active');
            chip.style.background = 'var(--primary-color)';
            chip.style.color = 'white';
            chip.style.borderColor = 'var(--primary-color)';
            chip.style.fontWeight = '600';
        } else {
            chip.classList.remove('active');
            chip.style.background = 'var(--bg-color)';
            chip.style.color = 'var(--text-secondary)';
            chip.style.borderColor = 'var(--border-color)';
            chip.style.fontWeight = '500';
        }
        chip.onclick = (e) => {
            e.stopPropagation();
            chips.forEach(c => {
                c.classList.remove('active');
                c.style.background = 'var(--bg-color)';
                c.style.color = 'var(--text-secondary)';
                c.style.borderColor = 'var(--border-color)';
                c.style.fontWeight = '500';
            });
            chip.classList.add('active');
            chip.style.background = 'var(--primary-color)';
            chip.style.color = 'white';
            chip.style.borderColor = 'var(--primary-color)';
            chip.style.fontWeight = '600';
            selectedReason = chip.dataset.reason || 'Mauvaise traduction';
        };
    });

    const wordName = currentWord[sessionState.langSource] || currentWord.fr || 'ce mot';
    textEl.innerHTML = `Signaler <strong>"${wordName}"</strong> comme mal traduit ou nécessitant une correction ?`;
    modal.classList.remove('hidden');

    // Mettre le focus sur la zone de texte après ouverture
    setTimeout(() => {
        if (commentInput) commentInput.focus();
    }, 50);

    const closeModal = () => {
        modal.classList.add('hidden');
        if (commentInput) commentInput.value = '';
    };

    btnCancel.onclick = closeModal;

    btnConfirm.onclick = async () => {
        const comment = commentInput ? commentInput.value.trim() : '';
        closeModal();
        if (!sessionState.reportedWords) sessionState.reportedWords = new Set();
        sessionState.reportedWords.add(currentWord.id);

        const btnMain = document.getElementById('btn-report-word');
        const btnResult = document.getElementById('btn-report-word-result');
        if (btnMain) btnMain.classList.add('reported');
        if (btnResult) btnResult.classList.add('reported');

        const langSource = (sessionState.langSource || 'fr').toUpperCase();
        const langTarget = (sessionState.langTarget || 'en').toUpperCase();
        const langPair = `${langSource} → ${langTarget}`;

        showToast("✓ Signalement enregistré. Merci !");
        await reportWordTranslation(currentWord, comment, langPair, selectedReason);
    };
}

function showToast(msg) {
    const toast = document.getElementById('report-toast');
    if (!toast) return;
    toast.innerHTML = `<span>${msg}</span>`;
    toast.classList.remove('hidden');
    setTimeout(() => {
        toast.classList.add('hidden');
    }, 2500);
}

function renderComparisonExample(containerLine, textEl, currentWord) {
    if (!containerLine || !textEl || !currentWord) return;
    const tgtKey = `ex_${sessionState.langTarget}`;
    const tgtSentence = currentWord[tgtKey];

    if (tgtSentence) {
        const targetWord = currentWord[sessionState.langTarget];
        const highlightedTgt = highlightExampleSentence(tgtSentence, targetWord, 'class="example-highlight"');
        textEl.innerHTML = `<div style="font-style: italic; font-size: 1.05rem; color: var(--text-secondary); font-family: var(--font-sans); white-space: normal; line-height: 1.4; text-align: left;">${highlightedTgt}</div>`;
        containerLine.style.display = 'flex';
    } else {
        containerLine.style.display = 'none';
    }
}
