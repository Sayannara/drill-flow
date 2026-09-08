/**
 * Test de Niveau Adaptatif (Placement Test) pour drillFlow.
 * Évalue le niveau de l'apprenant de A1 à C2 avec échantillonnage configurable,
 * timer adaptatif (PC/mobile), seuil d'élimination (défaut 50%),
 * possibilité de passer un mot avec confirmation par double Enter,
 * attribution d'un 1/2 point pour une seule lettre fausse,
 * et délai allongé en cas d'erreur avec option de passage immédiat (Entrée / Continuer).
 */

import { vocabulary } from './data/vocabulary.js?v=180';
import { translations } from './i18n.js';
function getAppLanguage() {
    return localStorage.getItem('app_lang') || 'fr';
}
import { getTestWordsPerLevel, getTestTimerSeconds, getTestPassThreshold } from './config/app-config.js';
import { CEFR_CONFIG } from './config/cefr.js';
import { savePlacementTestResult, getPlacementTestData } from './storage.js';

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

const ICONS = {
    target: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>`,
    targetSmall: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="6"></circle><circle cx="12" cy="12" r="2"></circle></svg>`,
    bulb: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M12 2a7 7 0 0 0-7 7c0 2.5 1.5 4.5 3 6h8c1.5-1.5 3-3.5 3-6a7 7 0 0 0-7-7z"></path></svg>`,
    star: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>`,
    clock: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`,
    check: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    checkCircle: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="16 9 11 14 8 11"></polyline></svg>`,
    xCircle: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
    alert: `<svg xmlns="http://www.w3.org/2000/svg" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    close: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    skip: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"></polygon><line x1="19" y1="5" x2="19" y2="19"></line></svg>`,
    award: `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>`,
    retry: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"></polyline><polyline points="23 20 23 14 17 14"></polyline><path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"></path></svg>`,
    click: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 9 5 12 1.8-5.2L21 14Z"></path><path d="M7.2 2.2 8 5.1"></path><path d="m5.1 8-2.9-.8"></path><path d="M14 4.1 12 6"></path><path d="m6 12-1.9 2"></path></svg>`
};

let testState = {
    active: false,
    hasStarted: false,
    isFinished: false,
    srcLang: 'fr',
    tgtLang: 'en',
    currentLevelIdx: 0,
    wordsPerLevel: 12,
    timerSeconds: 20,
    passThreshold: 50,
    levelWords: [],
    currentWordIdx: 0,
    levelCorrectCount: 0,
    history: {}, // { A1: { total: 12, correct: 10, pct: 83, passed: true }, ... }
    timerInterval: null,
    advanceTimeout: null,
    cleanAdvanceListener: null,
    timeRemainingMs: 0,
    isWaitingNext: false,
    isAwaitingSkipConfirm: false,
    currentLevelQuestions: [],
    questionStartTime: 0,
    levelResponseTimes: []
};

function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag] || tag));
}

function normalizeText(text) {
    if (!text) return '';
    return text.trim().toLowerCase().replace(/\s+/g, ' ').replace(/œ/g, 'oe');
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

function isAccentToleranceEnabled() {
    return localStorage.getItem('drillflow_tolerate_accents') !== 'off';
}

function stripLeadingArticle(text) {
    if (!text) return '';
    return text.replace(/^(the |a |an |to |le |la |l'|les |un |une |des |du |d'|der |die |das |ein |eine |dem |den |el |la |los |las |un |una |unos |unas |al |del )/i, '').trim();
}

/**
 * Calcul de la distance d'édition de Damerau-Levenshtein
 * (comptabilise suppressions, insertions, substitutions et transpositions)
 */
function editDistance(a, b) {
    if (a === b) return 0;
    if (!a) return b.length;
    if (!b) return a.length;

    const la = a.length;
    const lb = b.length;
    const d = Array.from({ length: la + 1 }, () => new Array(lb + 1).fill(0));

    for (let i = 0; i <= la; i++) d[i][0] = i;
    for (let j = 0; j <= lb; j++) d[0][j] = j;

    for (let i = 1; i <= la; i++) {
        for (let j = 1; j <= lb; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            d[i][j] = Math.min(
                d[i - 1][j] + 1,       // suppression
                d[i][j - 1] + 1,       // insertion
                d[i - 1][j - 1] + cost // substitution
            );

            // Transposition (ex: "teh" -> "the")
            if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
                d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
            }
        }
    }
    return d[la][lb];
}

/**
 * Nettoie une chaîne pour le calcul de similarité (accents retirés, minuscules, sans articles, sans ponctuation).
 */
function cleanVariantForSimilarity(text) {
    if (!text) return '';
    let s = text.trim().toLowerCase().replace(/\s+/g, ' ');
    s = s.replace(/œ/g, 'oe').replace(/æ/g, 'ae').replace(/ß/g, 'ss');
    s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    s = s.replace(/^(the |a |an |to |le |la |l'|les |un |une |des |du |d'|der |die |das |ein |eine |dem |den |el |los |las |una |unos |unas |al |del )/i, '').trim();
    s = s.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    return s;
}

/**
 * Extrait les variantes d'un terme (séparées par / , ; ou parenthèses).
 */
function extractVariantsForSimilarity(text) {
    if (!text) return [];
    const parts = text.split(/[/,;]|\(.*?\)/);
    const result = [];
    for (const p of parts) {
        const cleaned = cleanVariantForSimilarity(p);
        if (cleaned) {
            result.push(cleaned);
        }
    }
    return result;
}

/**
 * Compare deux mots simples pour détecter s'ils se ressemblent trop (mots transparents / cognats).
 * Ex: restaurant vs restaurant, information vs information, accepter vs accept.
 */
function areSingleWordsSimilar(w1, w2) {
    if (w1 === w2) return true;

    const minL = Math.min(w1.length, w2.length);
    const maxL = Math.max(w1.length, w2.length);

    if (minL <= 2) {
        return w1 === w2;
    }

    if (minL === 3) {
        return w1[0] === w2[0] && editDistance(w1, w2) <= 1;
    }

    // Préfixe ou racine commune : l'un commence par l'autre (ex: accepter/accept, adulte/adult, problème/problem)
    if ((w1.startsWith(w2) || w2.startsWith(w1)) && minL >= 4) {
        return true;
    }

    // Préfixe commun d'au moins 4 caractères représentant >= 60% du mot le plus court (ex: musique/music, famille/family)
    let pLen = 0;
    while (pLen < minL && w1[pLen] === w2[pLen]) {
        pLen++;
    }
    if (pLen >= 4 && pLen >= minL * 0.6) {
        return true;
    }

    const dist = editDistance(w1, w2);
    // Distance d'édition <= 1 pour les mots >= 4 lettres (ex: train/train, groupe/group, minute/minute)
    if (dist <= 1 && minL >= 4) {
        return true;
    }

    // Distance d'édition <= 2 pour les mots >= 5 lettres (ex: théâtre/theater, centre/center)
    if (dist <= 2 && minL >= 5) {
        return true;
    }

    // Ratio de similarité de Levenshtein >= 58% (ex: intéressant/interesting)
    const sim = 1 - (dist / maxL);
    if (minL >= 5 && sim >= 0.58) {
        return true;
    }

    return false;
}

/**
 * Compare deux variantes (avec détection des sous-mots transparents pour expressions composées, ex: "carte de crédit" vs "credit card").
 */
function areVariantsSimilar(v1, v2) {
    if (areSingleWordsSimilar(v1, v2)) {
        return true;
    }

    const words1 = v1.split(' ').filter(w => w.length >= 4);
    const words2 = v2.split(' ').filter(w => w.length >= 4);

    for (const w1 of words1) {
        for (const w2 of words2) {
            if (areSingleWordsSimilar(w1, w2)) {
                return true;
            }
        }
    }

    return false;
}

/**
 * Détermine si le mot source ressemble au mot cible (ex: FR restaurant -> EN restaurant, information -> information).
 * Utilisé pour filtrer les mots transparents lors de la sélection du test de niveau.
 */
export function areWordsTooSimilar(srcText, tgtText) {
    const srcVars = extractVariantsForSimilarity(srcText);
    const tgtVars = extractVariantsForSimilarity(tgtText);

    for (const sv of srcVars) {
        for (const tv of tgtVars) {
            if (areVariantsSimilar(sv, tv)) {
                return true;
            }
        }
    }

    return false;
}

function shuffleArray(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function cleanText(text) {
    if (!text) return '';
    return text.replace(/^[\s\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u2B50⭐⏱⚠️✓✕🔄🎉\u2713\u2715\u2192]+/u, '')
               .replace(/[\s\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u2B50⭐⏱⚠️✓✕🔄🎉\u2713\u2715\u2192]+$/u, '')
               .trim();
}

function getTranslation(key, fallback) {
    const lang = getAppLanguage();
    const val = translations[lang]?.[key] || translations['fr']?.[key] || fallback;
    return cleanText(val);
}

function getLanguageLabel(code) {
    const lang = getAppLanguage();
    if (translations[lang] && translations[lang][`lang_${code}`]) {
        return translations[lang][`lang_${code}`];
    }
    const names = { fr: 'Français', en: 'Anglais', de: 'Allemand', es: 'Espagnol' };
    return names[code] || code;
}

function formatScore(n) {
    return (n % 1 !== 0) ? n.toFixed(1) : n.toString();
}

/**
 * Nettoie le timer de transition et l'écouteur clavier
 */
function clearScheduledAdvance() {
    if (testState.advanceTimeout) {
        clearTimeout(testState.advanceTimeout);
        testState.advanceTimeout = null;
    }
    if (testState.cleanAdvanceListener) {
        testState.cleanAdvanceListener();
    }
}

/**
 * Met à jour l'intitulé et le style de l'unique bouton d'action (Valider <-> Continuer)
 */
function setSubmitButtonState(isWaitingNext) {
    const btnSubmit = document.getElementById('btn-test-submit');
    if (!btnSubmit) return;
    if (isWaitingNext) {
        btnSubmit.innerHTML = `
            <kbd class="desktop-only">Entrée</kbd>
            <span style="display: flex; align-items: center; gap: 0.4rem;">
                ${ICONS.check}
                ${getTranslation('action_continue', 'Continuer')}
            </span>
        `;
    } else {
        btnSubmit.innerHTML = `
            <kbd class="desktop-only">Entrée</kbd>
            <span style="display: flex; align-items: center; gap: 0.4rem;">
                ${ICONS.check}
                ${getTranslation('test_btn_submit', 'Valider')}
            </span>
        `;
    }
}

/**
 * Planifie le passage au mot suivant avec délai confortable
 * et écoute de la touche Entrée pour avancer plus vite si souhaité
 */
function scheduleAdvance(delayMs, allowEarlyAdvance = false) {
    clearScheduledAdvance();

    const doAdvance = () => {
        clearScheduledAdvance();
        advanceToNextWord();
    };

    testState.advanceTimeout = setTimeout(doAdvance, delayMs);

    if (allowEarlyAdvance) {
        const onKeydown = (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                doAdvance();
            }
        };

        testState.cleanAdvanceListener = () => {
            document.removeEventListener('keydown', onKeydown);
            testState.cleanAdvanceListener = null;
        };

        document.addEventListener('keydown', onKeydown);

        const btnSubmit = document.getElementById('btn-test-submit');
        if (btnSubmit) {
            btnSubmit.onclick = (e) => {
                e.preventDefault();
                doAdvance();
            };
        }
    }
}

/**
 * Prépare et démarre le test de niveau
 */
export function startPlacementTest(srcLang, tgtLang, forceStart = false) {
    clearScheduledAdvance();
    const selectSrc = document.getElementById('select-lang-source');
    const selectTgt = document.getElementById('select-lang-target');
    testState.srcLang = srcLang || (selectSrc ? selectSrc.value : null) || localStorage.getItem('voc_last_src') || 'fr';
    testState.tgtLang = tgtLang || (selectTgt ? selectTgt.value : null) || localStorage.getItem('voc_last_tgt') || 'en';
    localStorage.setItem('voc_last_src', testState.srcLang);
    localStorage.setItem('voc_last_tgt', testState.tgtLang);
    testState.wordsPerLevel = getTestWordsPerLevel();
    testState.timerSeconds = getTestTimerSeconds();
    testState.passThreshold = getTestPassThreshold();
    testState.currentLevelIdx = 0;
    testState.history = {};
    testState.currentLevelQuestions = [];
    testState.active = true;
    testState.hasStarted = false;
    testState.isFinished = false;
    testState.isAwaitingSkipConfirm = false;

    const modal = document.getElementById('placement-test-modal');
    if (!modal) return;

    modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';

    import('./storage.js').then(async (module) => {
        console.log("Storage loaded in startPlacementTest!");
        if (!forceStart) {
            const ptData = await module.getPlacementTestData();
            console.log("ptData:", ptData);
            if (ptData && ptData.attempts_used >= 3) {
                showPastResults(ptData);
                return;
            }
        }
        renderIntroScreen(ptData ? (ptData.attempts_used + 1) : 1);
    }).catch((err) => { console.error('Error loading storage:', err); renderIntroScreen(1); });
}

/**
 * Ferme la modale du test
 */
export function closePlacementTest(force = false) {
    if (!force && testState.active && testState.hasStarted && !testState.isFinished) {
        const confirmMsg = getTranslation('test_confirm_quit', "Voulez-vous vraiment quitter le test de niveau en cours ?");
        if (!confirm(confirmMsg)) return;
    }

    if (testState.timerInterval) {
        clearInterval(testState.timerInterval);
        testState.timerInterval = null;
    }

    clearScheduledAdvance();

    testState.active = false;
    testState.hasStarted = false;
    testState.isAwaitingSkipConfirm = false;
    const modal = document.getElementById('placement-test-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    const detailModal = document.getElementById('placement-level-detail-modal');
    if (detailModal) {
        detailModal.style.display = 'none';
    }
    document.body.style.overflow = '';
}

/**
 * Écran d'accueil et consignes du test de niveau
 */

export function showPastResults(savedData) {
    testState.isFinished = true;
    testState.active = true;
    clearScheduledAdvance();
    const modal = document.getElementById('placement-test-modal');
    if (!modal) return;

    let certifiedLevel = null;
    if (savedData && savedData.history && savedData.history.length > 0) {
        const lastHist = savedData.history[savedData.history.length - 1];
        if (lastHist && lastHist.certified_level) {
            certifiedLevel = lastHist.certified_level;
        }
    }

    const certifiedLabel = certifiedLevel 
        ? `Niveau ${certifiedLevel}` 
        : getTranslation('test_level_below_a1', 'Débutant (Inférieur à A1)');

    const certifiedColor = certifiedLevel && CEFR_CONFIG.colors[certifiedLevel] 
        ? CEFR_CONFIG.colors[certifiedLevel].solid 
        : '#64748b';

    let prevalidationHtml = '';
    if (savedData && savedData.attempts_used <= 3 && savedData.attempts_used > 0) {
        prevalidationHtml = `
            <div style="width: 100%; border: 1.5px dashed rgba(59, 130, 246, 0.4); border-radius: 10px; padding: 1.1rem; background: rgba(59, 130, 246, 0.03); box-sizing: border-box;">
                <div style="font-size: 0.9rem; font-weight: bold; color: var(--text-primary); margin-bottom: 1rem; text-align: left; display: flex; align-items: center; gap: 0.5rem;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg> 
                    <span>Phase de pré-validation (Essai ${savedData.attempts_used}/3)</span>
                </div>
                <div id="preval-tabs-container" style="display: flex; align-items: flex-start; justify-content: space-between; max-width: 360px; margin: 0 auto; position: relative; user-select: none;">
                </div>
                <div id="preval-content-container" style="margin-top: 1.25rem; text-align: left; background: var(--surface-color); padding: 0.85rem 1rem; border-radius: 8px; border: 1px solid var(--border-color); min-height: 80px;">
                </div>
            </div>
        `;
    }

    modal.innerHTML = `
        <div class="card placement-test-card" style="max-width: 580px; width: 92%; max-height: calc(100vh - 2rem); max-height: calc(100dvh - 2rem); overflow-y: auto; padding: 1.3rem 1.6rem; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; background: var(--surface-color); border: 1px solid var(--border-color); position: relative; box-sizing: border-box; margin: auto;">
            <button type="button" id="btn-close-results-x" class="modal-close-btn" aria-label="Fermer" title="Fermer">${ICONS.close}</button>
            <h2 style="font-size: 1.35rem; font-family: var(--font-heading); color: var(--text-primary); margin: 0;">${getTranslation('test_results_title', 'Résultats du test de niveau')}</h2>
            <div style="background: rgba(59, 130, 246, 0.08); border: 1.5px solid ${certifiedColor}; border-radius: 10px; padding: 0.55rem 1.25rem; width: 100%; box-sizing: border-box; display: flex; align-items: center; justify-content: space-between;">
                <div style="font-size: 0.82rem; color: var(--text-secondary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; text-align: left;">Validation du niveau</div>
                <div style="font-size: 1.5rem; font-weight: 800; color: ${certifiedColor}; font-family: var(--font-heading); line-height: 1;">${certifiedLabel}</div>
            </div>
            ${prevalidationHtml}
            <p style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.35; margin: 0;">${getTranslation('test_summary_threshold_info', 'Seuil de passage : <strong>{threshold}%</strong>. Vous pouvez relancer cette évaluation diagnostique à tout moment.').replace('{threshold}', getTestPassThreshold())}</p>
            <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; width: 100%; margin-top: 0.2rem;">
                <button type="button" id="btn-test-retry" class="btn-primary btn-secondary-action" style="padding: 0.55rem 1.25rem; font-size: 0.88rem; width: auto; display: inline-flex; align-items: center; gap: 0.4rem;">${ICONS.retry} <span>${getTranslation('test_btn_retry', 'Refaire le test')}</span></button>
                <button type="button" id="btn-test-finish" class="btn-primary" style="padding: 0.55rem 1.8rem; font-size: 0.88rem; width: auto; display: inline-flex; align-items: center; gap: 0.4rem;">${ICONS.check} <span>${getTranslation('test_btn_close', 'Terminer')}</span></button>
            </div>
        </div>
    `;

    const btnRetry = document.getElementById('btn-test-retry');
    if (btnRetry) {
        btnRetry.onclick = (e) => {
            e.preventDefault();
            modal.style.display = 'none';
            document.body.style.overflow = '';
            setTimeout(() => {
                const selectSrc = document.getElementById('select-lang-source');
                const selectTgt = document.getElementById('select-lang-target');
                startPlacementTest(selectSrc ? selectSrc.value : null, selectTgt ? selectTgt.value : null, true);
            }, 300);
        };
    }

    const handleClose = (e) => {
        e.preventDefault();
        closePlacementTest(true);
    };
    
    document.getElementById('btn-test-finish')?.addEventListener('click', handleClose);
    document.getElementById('btn-close-results-x')?.addEventListener('click', handleClose);

    if (savedData && savedData.attempts_used <= 3 && savedData.attempts_used > 0) {
        const tabsContainer = document.getElementById('preval-tabs-container');
        const contentContainer = document.getElementById('preval-content-container');
        if (tabsContainer && contentContainer) {
            const historyData = savedData.history || [];
            const averagesData = savedData.averages || {};
            let currentTab = savedData.attempts_used === 3 ? 3 : (savedData.attempts_used - 1);
            const renderTabsAndContent = () => {
                let tabsHtml = '';
                const attempt = savedData.attempts_used;
                for (let i = 0; i <= 3; i++) {
                    const isDone = i < 3 ? (i < attempt) : (attempt === 3);
                    const isClickable = isDone;
                    const isActive = i === currentTab;
                    const bg = isActive ? 'var(--primary-color)' : (isDone ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-color)');
                    const color = isActive ? '#fff' : (isDone ? 'var(--primary-color)' : 'var(--text-secondary)');
                    const border = isActive ? 'none' : (isDone ? '1px solid var(--primary-color)' : '1px dashed var(--border-color)');
                    const cursor = isClickable ? 'pointer' : 'default';
                    const label = i < 3 ? `Essai ${i + 1}` : 'Moyenne';
                    const icon = i < 3 
                        ? (isDone ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : (i+1)) 
                        : '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>';
                    tabsHtml += `
                        <div class="preval-tab" data-index="${i}" style="display: flex; flex-direction: column; align-items: center; gap: 0.35rem; z-index: 1; cursor: ${cursor}; opacity: ${isClickable ? 1 : 0.4};">
                            <div style="width: 28px; height: 28px; border-radius: 50%; background: ${bg}; color: ${color}; border: ${border}; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: bold; transition: all 0.2s; box-shadow: ${isActive ? '0 0 0 3px rgba(59, 130, 246, 0.2)' : 'none'};">
                                ${icon}
                            </div>
                            <span style="font-size: 0.72rem; color: ${isActive ? 'var(--primary-color)' : 'var(--text-secondary)'}; font-weight: ${isActive ? 'bold' : 'normal'}; transition: all 0.2s;">${label}</span>
                        </div>
                    `;
                    if (i < 3) tabsHtml += `<div style="flex: 1; height: 2px; background: ${isDone ? 'var(--primary-color)' : 'var(--border-color)'}; margin-top: 14px; opacity: ${isClickable ? 1 : 0.4}; transition: all 0.2s;"></div>`;
                }
                tabsContainer.innerHTML = tabsHtml;

                let rowsHtml = '';
                let titleText = '';
                if (currentTab === 3) {
                    titleText = 'Moyennes finales des 3 essais :';
                    for (const lvl of LEVELS) {
                        if (averagesData[lvl]) {
                            const avg = averagesData[lvl];
                            rowsHtml += `
                                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem; border-bottom: 1px dashed var(--border-color); padding: 0.4rem 0;">
                                    <div><strong>${lvl}</strong><span style="font-size: 0.72rem; color: ${avg.passed_count > 0 ? 'var(--primary-color)' : 'var(--text-secondary)'}; font-weight: 600; margin-left: 0.4rem; background: ${avg.passed_count > 0 ? 'rgba(59, 130, 246, 0.1)' : 'transparent'}; padding: 0.15rem 0.35rem; border-radius: 4px;">(Atteint ${avg.passed_count || 0}/${avg.attempts_count || 0})</span></div>
                                    <span style="font-weight: 600; color: var(--text-primary);">Score : ${avg.avg_score_percent}% <span style="color: var(--text-secondary); font-weight: normal;">| ${avg.avg_time_sec}s</span></span>
                                </div>
                            `;
                        }
                    }
                } else {
                    titleText = `Résultats de l'Essai ${currentTab + 1} :`;
                    const hist = historyData[currentTab];
                    if (hist && hist.levels) {
                        for (const lvl of LEVELS) {
                            if (hist.levels[lvl]) {
                                const lData = hist.levels[lvl];
                                const scorePct = Math.round((lData.score / lData.total) * 100);
                                const passed = lData.passed;
                                rowsHtml += `
                                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem; border-bottom: 1px dashed var(--border-color); padding: 0.4rem 0;">
                                        <div><strong>${lvl}</strong><span style="font-size: 0.72rem; color: ${passed ? 'var(--primary-color)' : '#ef4444'}; font-weight: 600; margin-left: 0.4rem; background: ${passed ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; padding: 0.15rem 0.35rem; border-radius: 4px;">${passed ? 'Atteint <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 0.15rem; vertical-align: middle; margin-bottom: 2px;"><polyline points="20 6 9 17 4 12"></polyline></svg>' : 'Non atteint'}</span></div>
                                        <span style="font-weight: 600; color: var(--text-primary);">Score : ${scorePct}% <span style="color: var(--text-secondary); font-weight: normal;">| ${lData.avg_time_sec}s</span></span>
                                    </div>
                                `;
                            }
                        }
                    } else rowsHtml = `<div style="font-size: 0.8rem; color: var(--text-secondary); text-align: center; padding: 1rem 0;">Données indisponibles</div>`;
                }
                contentContainer.innerHTML = `<div style="font-size: 0.85rem; font-weight: bold; color: var(--text-primary); margin-bottom: 0.5rem;">${titleText}</div>${rowsHtml}`;

                tabsContainer.querySelectorAll('.preval-tab').forEach(tab => {
                    tab.addEventListener('click', () => {
                        const idx = parseInt(tab.getAttribute('data-index'), 10);
                        const isDone = idx < 3 ? (idx < attempt) : (attempt === 3);
                        if (isDone && idx !== currentTab) {
                            currentTab = idx;
                            renderTabsAndContent();
                        }
                    });
                });
            };
            renderTabsAndContent();
        }
    }
}
function renderIntroScreen(attemptNum = 1) {
const modal = document.getElementById('placement-test-modal');
    if (!modal) return;

    const timerSec = getTestTimerSeconds();
    const threshold = getTestPassThreshold();
    const wordsCount = getTestWordsPerLevel();
    const maxMinutes = Math.round((LEVELS.length * wordsCount * timerSec) / 60);

    testState.timerSeconds = timerSec;
    testState.passThreshold = threshold;
    testState.wordsPerLevel = wordsCount;

    modal.innerHTML = `
        <div class="card placement-test-card" style="max-width: 600px; width: 92%; padding: 2rem 2.25rem; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); display: flex; flex-direction: column; gap: 1.4rem; background: var(--surface-color); border: 1px solid var(--border-color); text-align: left; box-sizing: border-box; margin: auto;">
            
            <!-- En-tête -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.85rem;">
                <div>
                    <div style="display: flex; align-items: center; gap: 0.6rem; flex-wrap: wrap;">
                        <h2 style="font-size: 1.25rem; font-family: var(--font-heading); color: var(--text-primary); margin: 0;">
                            ${getTranslation('test_intro_title', 'Test de Niveau Adaptatif')}
                        </h2>
                        
                        <span style="display: inline-flex; align-items: center; background: rgba(245, 158, 11, 0.15); color: #f59e0b; padding: 0.15rem 0.45rem; border-radius: 6px; font-weight: 700; font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.05em; border: 1px solid rgba(245, 158, 11, 0.35); line-height: 1;">
                            Bêta
                        </span>
                        <span style="display: inline-flex; align-items: center; background: rgba(59, 130, 246, 0.12); color: var(--primary-color); padding: 0.15rem 0.55rem; border-radius: 6px; font-weight: 700; font-size: 0.78rem;">
                            ${getLanguageLabel(testState.srcLang)} ➔ ${getLanguageLabel(testState.tgtLang)}
                        </span>
                    </div>
                    
                </div>
                <button type="button" id="btn-close-placement-test" class="modal-close-btn" style="position: static; flex-shrink: 0;" aria-label="Fermer" title="Fermer">${ICONS.close}</button>
            </div>

            

            <!-- Boîte de conseils & consignes animée -->
            <div style="position: relative; display: flex; flex-direction: column; gap: 1.25rem; background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 12px; padding: 1.25rem 1.25rem 1.25rem 3rem;">
                <!-- Process Line -->
                <div style="position: absolute; left: 1.35rem; top: 1.75rem; bottom: 1.75rem; width: 2px; background: var(--border-color); border-radius: 2px;"></div>
                
                <div class="anim-hint" style="position: relative; animation-delay: 0.1s; display: flex; align-items: center; font-size: 0.88rem; color: var(--text-secondary); line-height: 1.45; font-weight: 400;">
                    <span style="position: absolute; left: -2.3rem; top: 50%; transform: translateY(-50%); color: #3b82f6; background: var(--bg-color); padding: 4px; display: inline-flex; z-index: 1;"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg></span>
                    <span><strong>${LEVELS.length} niveaux</strong> de ${LEVELS[0]} à ${LEVELS[LEVELS.length-1]}</span>
                </div>

                <div class="anim-hint" style="position: relative; animation-delay: 0.2s; display: flex; align-items: center; font-size: 0.88rem; color: var(--text-secondary); line-height: 1.45; font-weight: 400;">
                    <span style="position: absolute; left: -2.3rem; top: 50%; transform: translateY(-50%); color: #3b82f6; background: var(--bg-color); padding: 4px; display: inline-flex; z-index: 1;">${ICONS.targetSmall.replace('width="16"', 'width="18"').replace('height="16"', 'height="18"')}</span>
                    <span><strong>${wordsCount} questions</strong> par palier</span>
                </div>

                <div class="anim-hint" style="position: relative; animation-delay: 0.3s; display: flex; align-items: center; font-size: 0.88rem; color: var(--text-secondary); line-height: 1.45; font-weight: 400;">
                    <span style="position: absolute; left: -2.3rem; top: 50%; transform: translateY(-50%); color: #3b82f6; background: var(--bg-color); padding: 4px; display: inline-flex; z-index: 1;">${ICONS.clock.replace('width="16"', 'width="18"').replace('height="16"', 'height="18"')}</span>
                    <span><strong>${timerSec} secondes</strong> pour y répondre</span>
                </div>

                <div class="anim-hint" style="position: relative; animation-delay: 0.4s; display: flex; align-items: center; font-size: 0.88rem; color: var(--text-secondary); line-height: 1.45; font-weight: 400;">
                    <span style="position: absolute; left: -2.3rem; top: 50%; transform: translateY(-50%); color: #10b981; background: var(--bg-color); padding: 4px; display: inline-flex; z-index: 1;">${ICONS.check.replace('width="16"', 'width="18"').replace('height="16"', 'height="18"')}</span>
                    <span><strong>${threshold}%</strong> pour accéder au suivant</span>
                </div>

                <div class="anim-hint" style="position: relative; animation-delay: 0.5s; display: flex; align-items: center; font-size: 0.88rem; color: var(--text-secondary); line-height: 1.45; font-weight: 400;">
                    <span style="position: absolute; left: -2.3rem; top: 50%; transform: translateY(-50%); color: #f59e0b; background: var(--bg-color); padding: 4px; display: inline-flex; z-index: 1;">${ICONS.bulb.replace('width="16"', 'width="18"').replace('height="16"', 'height="18"')}</span>
                    <span>Le contexte vous aiguille sur la traduction</span>
                </div>

            </div>
            
            <style>
                .anim-hint {
                    opacity: 0;
                    transform: translateX(-10px);
                    animation: slideInHint 0.4s ease forwards;
                }
                @keyframes slideInHint {
                    to {
                        opacity: 1;
                        transform: translateX(0);
                    }
                }
            </style>

            <!-- Bouton Démarrer -->
            <div style="display: flex; justify-content: center; width: 100%; margin-top: 0.25rem;">
                <button type="button" id="btn-start-test-go" class="btn-primary" style="padding: 0.75rem 2.5rem; font-size: 1.05rem; font-weight: 700; width: 100%; max-width: 320px; height: 46px; display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;">
                    ${getTranslation('test_intro_btn_start', 'Commencer le test')}
                </button>
            </div>
        </div>
    `;

    const closeBtn = document.getElementById('btn-close-placement-test');
    if (closeBtn) closeBtn.onclick = () => closePlacementTest(true);

    const startBtn = document.getElementById('btn-start-test-go');
    if (startBtn) {
        startBtn.onclick = () => {
            testState.hasStarted = true;
            loadLevel(0);
        };
        startBtn.focus();
    }
}

/**
 * Charge les mots d'un niveau donné
 */
function loadLevel(levelIdx) {
    clearScheduledAdvance();
    testState.currentLevelIdx = levelIdx;
    testState.currentWordIdx = 0;
    testState.levelCorrectCount = 0;
    testState.currentLevelQuestions = [];
    testState.levelResponseTimes = [];
    testState.isWaitingNext = false;
    testState.isAwaitingSkipConfirm = false;

    const currentLevel = LEVELS[levelIdx];
    const src = testState.srcLang;
    const tgt = testState.tgtLang;

    // 1. Filtrer les mots disponibles pour ce niveau et cette paire
    const available = vocabulary.filter(w => {
        return w[src] && w[tgt] && (w.level || '').toUpperCase() === currentLevel;
    });

    if (available.length === 0) {
        console.warn(`Aucun mot disponible pour le niveau ${currentLevel} (${src} -> ${tgt})`);
        finishTest();
        return;
    }

    // 2. Exclure les mots trop similaires (cognats / mots transparents comme restaurant, information)
    const nonSimilar = available.filter(w => !areWordsTooSimilar(w[src], w[tgt]));

    // 3. Lire l'historique des mots déjà demandés récemment
    let askedIds = [];
    try {
        const stored = localStorage.getItem('drill_placement_asked_ids');
        if (stored) askedIds = JSON.parse(stored);
    } catch(e) {}
    if (!Array.isArray(askedIds)) askedIds = [];

    const neverAskedNonSimilar = nonSimilar.filter(w => !askedIds.includes(w.id));
    const askedNonSimilar = nonSimilar.filter(w => askedIds.includes(w.id));

    // 4. Échantillonner : privilégier les mots non similaires ET jamais vus
    const count = Math.min(testState.wordsPerLevel, available.length);
    let selected = [];

    if (neverAskedNonSimilar.length >= count) {
        selected = shuffleArray(neverAskedNonSimilar).slice(0, count);
    } else {
        const pool = shuffleArray(neverAskedNonSimilar).concat(shuffleArray(askedNonSimilar));
        if (pool.length >= count) {
            selected = pool.slice(0, count);
        } else {
            const remainder = available.filter(w => !nonSimilar.includes(w));
            selected = pool.concat(shuffleArray(remainder)).slice(0, count);
        }
    }

    // 5. Enregistrer
    const updatedIds = [...new Set([...askedIds, ...selected.map(w => w.id)])];
    if (updatedIds.length > 500) updatedIds.splice(0, updatedIds.length - 500);
    localStorage.setItem('drill_placement_asked_ids', JSON.stringify(updatedIds));

    testState.levelWords = selected;

    renderWordScreen();
}

/**
 * Formate et surligne le mot cible dans la phrase de contexte
 */
function formatExampleSentence(sentence, word) {
    if (!sentence) return '';
    if (sentence.includes('*')) {
        return sentence.replace(/\*([^\*]+)\*/g, '<strong style="color: var(--primary-color); font-weight: 700;">$1</strong>');
    }
    return sentence;
}

/**
 * Affiche l'écran du mot actuel
 */
function renderWordScreen() {
    clearScheduledAdvance();
    const modal = document.getElementById('placement-test-modal');
    if (!modal) return;

    const currentLevel = LEVELS[testState.currentLevelIdx];
    const wordItem = testState.levelWords[testState.currentWordIdx];
    if (!wordItem) {
        onLevelCompleted();
        return;
    }

    const currentNum = testState.currentWordIdx + 1;
    const totalNum = testState.levelWords.length;
    const srcText = wordItem[testState.srcLang] || '';
    const lang = getAppLanguage();

    // Type badge (même modèle que durant le drill)
    let typeBadgeHtml = '';
    if (wordItem.type) {
        const typeLabel = translations[lang]?.[`type_${wordItem.type}`] || translations['fr']?.[`type_${wordItem.type}`] || wordItem.type;
        typeBadgeHtml = `<span class="type-badge ${wordItem.type}">${typeLabel}</span>`;
    }

    // Level badge (même modèle que durant le drill)
    let levelBadgeHtml = '';
    const lvl = (wordItem.level || currentLevel).toUpperCase();
    if (lvl) {
        let badgeBg = 'rgba(255,255,255,0.1)';
        let badgeColor = 'inherit';
        if (lvl === 'A1') { badgeBg = 'rgba(59, 130, 246, 0.2)'; badgeColor = '#3b82f6'; }
        if (lvl === 'A2') { badgeBg = 'rgba(6, 182, 212, 0.2)'; badgeColor = '#06b6d4'; }
        if (lvl === 'B1') { badgeBg = 'rgba(16, 185, 129, 0.2)'; badgeColor = '#10b981'; }
        if (lvl === 'B2') { badgeBg = 'rgba(234, 179, 8, 0.2)'; badgeColor = '#eab308'; }
        if (lvl === 'C1') { badgeBg = 'rgba(249, 115, 22, 0.2)'; badgeColor = '#f97316'; }
        if (lvl === 'C2') { badgeBg = 'rgba(239, 68, 68, 0.2)'; badgeColor = '#ef4444'; }
        levelBadgeHtml = `<span class="type-badge" style="background: ${badgeBg}; color: ${badgeColor}; font-weight: 600;">${lvl}</span>`;
    }

    const srcSentence = wordItem[`ex_${testState.srcLang}`];
    const formattedSentence = srcSentence ? formatExampleSentence(srcSentence, srcText) : '';

    testState.isWaitingNext = false;
    testState.isAwaitingSkipConfirm = false;

    modal.innerHTML = `
        <div class="card placement-test-card" style="max-width: 620px; width: 92%; padding: 1.75rem 2rem; position: relative; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); display: flex; flex-direction: column; gap: 1.25rem; background: var(--surface-color); border: 1px solid var(--border-color); box-sizing: border-box; margin: auto;">
            
            <!-- En-tête : Titre & Bouton fermer -->
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color); padding-bottom: 0.85rem;">
                <div style="display: flex; align-items: center; gap: 0.65rem; flex-wrap: wrap;">
                    <strong style="font-size: 1rem; color: var(--text-primary);">${getTranslation('test_modal_title', "Test de Niveau Adaptatif")}</strong>
                    <span style="font-size: 0.78rem; background: rgba(59, 130, 246, 0.1); color: var(--primary-color); border: 1px solid var(--border-color); padding: 0.15rem 0.5rem; border-radius: 4px; font-weight: 600;">
                        ${getLanguageLabel(testState.srcLang)} ➔ ${getLanguageLabel(testState.tgtLang)}
                    </span>
                </div>
                <button type="button" id="btn-close-placement-test" class="modal-close-btn" style="position: static; flex-shrink: 0;" aria-label="Fermer" title="Fermer">${ICONS.close}</button>
            </div>

            <!-- Sous-entête : Progression & Seuil -->
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                <div style="font-size: 0.85rem; color: var(--text-secondary); font-weight: 500;">
                    ${getTranslation('test_word_counter', "Mot {current} / {total}").replace('{current}', currentNum).replace('{total}', totalNum)}
                </div>
                <div style="font-size: 0.78rem; color: var(--text-secondary); background: var(--bg-color); padding: 0.25rem 0.65rem; border-radius: 20px; border: 1px solid var(--border-color);">
                    ${getTranslation('test_target_threshold', "Objectif palier : {threshold}%").replace('{threshold}', testState.passThreshold)}
                </div>
            </div>

            <!-- Barre de Timer -->
            <div style="width: 100%; display: flex; flex-direction: column; gap: 0.35rem;">
                <div style="display: flex; justify-content: space-between; font-size: 0.75rem; font-weight: 600; color: var(--text-secondary);">
                    <span>Temps restant</span>
                    <span id="test-timer-digital" style="color: var(--primary-color);">${testState.timerSeconds}s</span>
                </div>
                <div style="width: 100%; height: 6px; background: var(--bg-color); border-radius: 3px; overflow: hidden; border: 1px solid var(--border-color);">
                    <div id="test-timer-bar" style="width: 100%; height: 100%; background: var(--primary-color); transition: width 0.1s linear, background-color 0.3s ease;"></div>
                </div>
            </div>

            <!-- Mot à traduire & Badges (Modèle identique au Drill) -->
            <div style="text-align: center; padding: 0.5rem 0.5rem 0.25rem 0.5rem;">
                <div class="drill-word-wrapper" style="display: flex; align-items: center; justify-content: center; gap: 0.6rem; flex-wrap: wrap; margin-bottom: 0.5rem;">
                    <div class="word-source" style="font-size: 2.2rem; font-family: var(--font-heading); font-weight: 700; margin-bottom: 0; text-align: center;">
                        ${srcText}
                    </div>
                    <div class="drill-word-badges" style="display: inline-flex; gap: 0.35rem; align-items: center; flex-shrink: 0; white-space: nowrap;">
                        ${typeBadgeHtml}
                        ${levelBadgeHtml}
                    </div>
                </div>
                
                ${formattedSentence ? `
                    <div style="text-align: center; color: var(--text-secondary); font-size: 1rem; line-height: 1.45; font-style: italic; margin-top: 0.4rem; margin-bottom: 0.25rem;">
                        ${formattedSentence}
                    </div>
                ` : ''}
            </div>

            <!-- Zone de feedback / résultat immédiat -->
            <div id="test-feedback-zone" style="min-height: 42px; display: flex; align-items: center; justify-content: center; text-align: center; font-weight: 600; font-size: 0.95rem; border-radius: 8px; padding: 0.35rem 0.75rem; box-sizing: border-box;"></div>

            <!-- Formulaire de saisie -->
            <form id="test-word-form" style="display: flex; gap: 0.75rem; width: 100%;">
                <input type="text" id="test-word-input" autocomplete="off" autocorrect="off" autocapitalize="off" spellcheck="false" placeholder="${getTranslation('test_placeholder', 'Tapez la traduction en {tgt}...').replace('{tgt}', getLanguageLabel(testState.tgtLang))}" style="flex: 1; height: 44px; padding: 0.5rem 0.9rem; font-size: 1rem; border-radius: 8px; border: 1px solid var(--border-color); background: var(--bg-color); color: var(--text-primary); outline: none; font-family: var(--font-sans);">
                <button type="submit" id="btn-test-submit" class="btn-drill-action btn-primary-action" style="height: 44px; padding: 0 1.15rem; font-size: 0.95rem; font-weight: 600; border-radius: 8px;">
                    <kbd class="desktop-only">Entrée</kbd>
                    <span style="display: flex; align-items: center; gap: 0.4rem;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        ${getTranslation('test_btn_submit', 'Valider')}
                    </span>
                </button>
            </form>
        </div>
    `;

    const closeBtn = document.getElementById('btn-close-placement-test');
    if (closeBtn) closeBtn.onclick = () => closePlacementTest();

    const form = document.getElementById('test-word-form');
    const input = document.getElementById('test-word-input');
    const btnSkip = document.getElementById('btn-test-skip');
    const feedbackZone = document.getElementById('test-feedback-zone');

    if (form && input) {
        form.onsubmit = (e) => {
            e.preventDefault();
            if (testState.isWaitingNext) {
                clearScheduledAdvance();
                advanceToNextWord();
                return;
            }
            const val = input.value.trim();
            if (!val) {
                // Entrée vide : gestion de la confirmation pour passer
                handleSkipTrigger();
            } else {
                handleWordSubmit();
            }
        };

        input.oninput = () => {
            if (testState.isAwaitingSkipConfirm) {
                testState.isAwaitingSkipConfirm = false;
                if (feedbackZone) {
                    feedbackZone.textContent = '';
                    feedbackZone.style.background = 'transparent';
                }
                if (btnSkip) {
                    btnSkip.textContent = `${getTranslation('test_btn_skip', 'Passer')} (Entrée)`;
                    btnSkip.style.borderColor = 'var(--border-color)';
                    btnSkip.style.color = 'var(--text-secondary)';
                }
            }
        };
    }

    if (btnSkip) {
        btnSkip.onclick = () => {
            handleSkipTrigger();
        };
    }

    if (input) {
        input.focus();
    }

    startWordTimer();
}

/**
 * Déclenchement de l'action passer avec confirmation par double validation
 */
function handleSkipTrigger() {
    if (testState.isWaitingNext) return;

    const btnSkip = document.getElementById('btn-test-skip');
    const feedbackZone = document.getElementById('test-feedback-zone');
    const input = document.getElementById('test-word-input');

    if (!testState.isAwaitingSkipConfirm) {
        // Première demande : afficher avertissement et attendre la 2e validation
        testState.isAwaitingSkipConfirm = true;
        if (input) input.value = '';

        if (feedbackZone) {
            feedbackZone.style.background = 'rgba(245, 158, 11, 0.15)';
            feedbackZone.style.color = '#f59e0b';
            feedbackZone.innerHTML = `<span style="display: inline-flex; align-items: center; gap: 0.45rem;">${ICONS.alert} <span>${getTranslation('test_confirm_skip_hint', 'Appuyez à nouveau sur Entrée pour passer ce mot.')}</span></span>`;
        }

        if (btnSkip) {
            btnSkip.textContent = getTranslation('test_btn_skip_confirm', 'Confirmer passer (Entrée)');
            btnSkip.style.borderColor = '#f59e0b';
            btnSkip.style.color = '#f59e0b';
        }

        if (input) input.focus();
    } else {
        // Deuxième validation : passer effectivement le mot
        executeSkip();
    }
}

/**
 * Exécute le saut de mot
 */
function executeSkip() {
    clearScheduledAdvance();
    testState.isWaitingNext = true;
    testState.isAwaitingSkipConfirm = false;

    const input = document.getElementById('test-word-input');
    if (input) input.disabled = true;

    const wordItem = testState.levelWords[testState.currentWordIdx];
    const expectedStr = wordItem[testState.tgtLang] || '';

    const elapsedSec = Math.min(testState.timerSeconds, Math.max(0.1, (Date.now() - (testState.questionStartTime || Date.now())) / 1000));
    if (!testState.levelResponseTimes) testState.levelResponseTimes = [];
    testState.levelResponseTimes.push(elapsedSec);

    if (!testState.currentLevelQuestions) testState.currentLevelQuestions = [];
    testState.currentLevelQuestions.push({
        wordId: wordItem.id,
        srcWord: wordItem[testState.srcLang] || '',
        expected: expectedStr,
        userAnswer: '',
        score: 0.0,
        status: 'skipped',
        type: wordItem.type || '',
        timeSec: Math.round(elapsedSec * 10) / 10
    });

    if (testState.timerInterval) {
        clearInterval(testState.timerInterval);
        testState.timerInterval = null;
    }

    const feedbackZone = document.getElementById('test-feedback-zone');
    if (feedbackZone) {
        feedbackZone.style.background = 'rgba(100, 116, 139, 0.15)';
        feedbackZone.style.color = 'var(--text-secondary)';
        feedbackZone.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 0.45rem;">
                <span style="color: var(--text-secondary); display: inline-flex;">${ICONS.xCircle}</span>
                <span>${getTranslation('test_skipped', 'Mot passé (0 pt)')} &bull; ${getTranslation('test_expected', 'Attendu :')} <strong style="color: var(--text-primary); font-size: 1.05rem;">${expectedStr}</strong></span>
            </div>
        `;
    }

    setSubmitButtonState(true);

    // 3 secondes avec passage rapide possible
    scheduleAdvance(3000, true);
}

/**
 * Lance le compte à rebours pour le mot courant
 */
function startWordTimer() {
    if (testState.timerInterval) {
        clearInterval(testState.timerInterval);
    }

    const totalMs = testState.timerSeconds * 1000;
    let remainingMs = totalMs;
    const stepMs = 100;
    testState.questionStartTime = Date.now();

    const timerBar = document.getElementById('test-timer-bar');
    const timerDigital = document.getElementById('test-timer-digital');

    testState.timerInterval = setInterval(() => {
        remainingMs -= stepMs;
        if (remainingMs <= 0) {
            remainingMs = 0;
            clearInterval(testState.timerInterval);
            testState.timerInterval = null;
            handleWordTimeout();
            return;
        }

        const pct = (remainingMs / totalMs) * 100;
        const secs = Math.ceil(remainingMs / 1000);

        if (timerBar) {
            timerBar.style.width = `${pct}%`;
            if (remainingMs <= 3000) {
                timerBar.style.backgroundColor = '#ef4444';
            } else if (remainingMs <= 5000) {
                timerBar.style.backgroundColor = '#f59e0b';
            } else {
                timerBar.style.backgroundColor = 'var(--primary-color)';
            }
        }

        if (timerDigital) {
            timerDigital.textContent = `${secs}s`;
            if (remainingMs <= 3000) {
                timerDigital.style.color = '#ef4444';
            } else {
                timerDigital.style.color = 'var(--primary-color)';
            }
        }
    }, stepMs);
}

function getAnswerCandidates(str) {
    if (!str) return [];
    const norm = normalizeText(str);
    const noParens = normalizeText(str.replace(/\(.*?\)/g, ' '));
    const set = new Set([norm, noParens]);

    if (norm.includes('.')) {
        set.add(normalizeText(norm.replace(/\.{2,}/g, ' ')));
    }
    if (noParens.includes('.')) {
        set.add(normalizeText(noParens.replace(/\.{2,}/g, ' ')));
    }

    const currentArray = Array.from(set);
    currentArray.forEach(item => {
        const itemNoArt = stripLeadingArticle(item);
        if (itemNoArt) set.add(itemNoArt);
    });

    return Array.from(set).filter(Boolean);
}

/**
 * Évalue la réponse de l'utilisateur :
 * - 1.0 : Réponse exacte (avec ou sans article, avec ou sans parenthèses, tolérance aux accents)
 * - 0.5 : Une seule lettre fausse (distance d'édition = 1)
 * - 0.0 : Incorrect
 */
function evaluateAnswer(userInput, expectedStr, tgtLang) {
    const cleanUser = normalizeText(userInput);
    if (!cleanUser) return { score: 0.0, reason: 'empty' };

    const expectedVariants = expectedStr.split(/[/,]/).map(s => s.trim()).filter(Boolean);
    const tolerate = isAccentToleranceEnabled();

    // Génération de toutes les variantes candidates pour la saisie utilisateur
    const userCandidates = getAnswerCandidates(userInput);

    // 1. Correspondance exacte (1.0 point)
    for (const exp of expectedVariants) {
        const expCandidates = getAnswerCandidates(exp);

        // Correspondance stricte (avec ou sans article / parenthèses)
        for (const uCand of userCandidates) {
            if (expCandidates.includes(uCand)) {
                return { score: 1.0, reason: 'exact' };
            }
        }

        // Correspondance avec tolérance des accents
        if (tolerate) {
            const tolUserCandidates = userCandidates.map(c => normalizeTolerant(c, tgtLang));
            const tolExpCandidates = expCandidates.map(c => normalizeTolerant(c, tgtLang));
            for (const tu of tolUserCandidates) {
                if (tolExpCandidates.includes(tu)) {
                    return { score: 1.0, reason: 'exact_tolerant' };
                }
            }
        }
    }

    // 2. Erreur mineure ou forme proche (0.5 point)
    for (const exp of expectedVariants) {
        const expCandidates = getAnswerCandidates(exp);
        for (const uCand of userCandidates) {
            for (const eCand of expCandidates) {
                let tu = uCand, te = eCand;
                if (tolerate) {
                    tu = normalizeTolerant(uCand, tgtLang);
                    te = normalizeTolerant(eCand, tgtLang);
                }
                const d = editDistance(tu, te);
                const maxLen = Math.max(tu.length, te.length);
                
                // 1 faute si >= 2 chars, 2 fautes si >= 5 chars
                if ((d === 1 && maxLen >= 2) || (d === 2 && maxLen >= 5)) {
                    return { score: 0.5, reason: 'near' };
                }
                
                // Prefix/Suffix match like record/recording or fight/fighting
                if (maxLen >= 5 && Math.abs(tu.length - te.length) <= 4) {
                    if (te.startsWith(tu) || tu.startsWith(te)) {
                        return { score: 0.5, reason: 'near_prefix' };
                    }
                }
            }
        }
    }

    return { score: 0.0, reason: 'incorrect' };
}

/**
 * Gestion de la soumission par l'utilisateur
 */
function handleWordSubmit() {
    if (testState.isWaitingNext) return;

    const input = document.getElementById('test-word-input');
    if (!input) return;

    const userVal = input.value.trim();
    if (!userVal) {
        handleSkipTrigger();
        return;
    }

    if (testState.timerInterval) {
        clearInterval(testState.timerInterval);
        testState.timerInterval = null;
    }

    testState.isWaitingNext = true;
    testState.isAwaitingSkipConfirm = false;
    input.disabled = true;

    const wordItem = testState.levelWords[testState.currentWordIdx];
    const expectedStr = wordItem[testState.tgtLang] || '';
    const evalResult = evaluateAnswer(userVal, expectedStr, testState.tgtLang);

    const elapsedSec = Math.min(testState.timerSeconds, Math.max(0.1, (Date.now() - (testState.questionStartTime || Date.now())) / 1000));
    if (!testState.levelResponseTimes) testState.levelResponseTimes = [];
    testState.levelResponseTimes.push(elapsedSec);

    if (!testState.currentLevelQuestions) testState.currentLevelQuestions = [];
    testState.currentLevelQuestions.push({
        wordId: wordItem.id,
        srcWord: wordItem[testState.srcLang] || '',
        expected: expectedStr,
        userAnswer: userVal,
        score: evalResult.score,
        status: evalResult.score === 1.0 ? 'correct' : (evalResult.score === 0.5 ? 'near' : 'incorrect'),
        type: wordItem.type || '',
        timeSec: Math.round(elapsedSec * 10) / 10
    });

    const feedbackZone = document.getElementById('test-feedback-zone');

    if (evalResult.score === 1.0) {
        testState.levelCorrectCount += 1.0;
        if (feedbackZone) {
            feedbackZone.style.background = 'rgba(16, 185, 129, 0.15)';
            feedbackZone.style.color = '#10b981';
            feedbackZone.innerHTML = `<div style="display: flex; align-items: center; gap: 0.45rem;"><span style="display: inline-flex; color: #10b981;">${ICONS.checkCircle}</span> <span>${getTranslation('test_correct', 'Correct !')} (+1 pt)</span></div>`;
        }
        scheduleAdvance(600, false);
    } else if (evalResult.score === 0.5) {
        testState.levelCorrectCount += 0.5;
        if (feedbackZone) {
            feedbackZone.style.background = 'rgba(245, 158, 11, 0.18)';
            feedbackZone.style.color = '#f59e0b';
            feedbackZone.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; gap: 0.45rem;">
                    <span style="color: #f59e0b; display: inline-flex;">${ICONS.alert}</span>
                    <span>${getTranslation('test_near_correct', 'Presque ! 1 lettre d\'écart (+0.5 pt)')} &bull; ${getTranslation('test_expected', 'Attendu :')} <strong style="color: var(--text-primary); font-size: 1.05rem;">${expectedStr}</strong></span>
                </div>
            `;
        }
        setSubmitButtonState(true);
        // 3.5 secondes pour lire, ou avancement immédiat via Entrée / Continuer
        scheduleAdvance(3500, true);
    } else {
        if (feedbackZone) {
            feedbackZone.style.background = 'rgba(239, 68, 68, 0.15)';
            feedbackZone.style.color = '#ef4444';
            feedbackZone.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; gap: 0.45rem;">
                    <span style="color: #ef4444; display: inline-flex;">${ICONS.xCircle}</span>
                    <span>${getTranslation('test_incorrect', 'Incorrect')} (0 pt) &bull; ${getTranslation('test_expected', 'Attendu :')} <strong style="color: var(--text-primary); font-size: 1.05rem;">${expectedStr}</strong></span>
                </div>
            `;
        }
        setSubmitButtonState(true);
        // 4 secondes pour avoir le temps de bien lire la correction
        scheduleAdvance(4000, true);
    }
}

/**
 * Gestion du temps écoulé
 */
function handleWordTimeout() {
    if (testState.isWaitingNext) return;

    testState.isWaitingNext = true;
    testState.isAwaitingSkipConfirm = false;
    const input = document.getElementById('test-word-input');
    if (input) input.disabled = true;

    const wordItem = testState.levelWords[testState.currentWordIdx];
    const expectedStr = wordItem[testState.tgtLang] || '';

    const elapsedSec = testState.timerSeconds;
    if (!testState.levelResponseTimes) testState.levelResponseTimes = [];
    testState.levelResponseTimes.push(elapsedSec);

    if (!testState.currentLevelQuestions) testState.currentLevelQuestions = [];
    testState.currentLevelQuestions.push({
        wordId: wordItem.id,
        srcWord: wordItem[testState.srcLang] || '',
        expected: expectedStr,
        userAnswer: '',
        score: 0.0,
        status: 'timeout',
        type: wordItem.type || '',
        timeSec: elapsedSec
    });

    const feedbackZone = document.getElementById('test-feedback-zone');
    if (feedbackZone) {
        feedbackZone.style.background = 'rgba(245, 158, 11, 0.15)';
        feedbackZone.style.color = '#f59e0b';
        feedbackZone.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; gap: 0.45rem;">
                <span style="color: #f59e0b; display: inline-flex;">${ICONS.clock}</span>
                <span>${getTranslation('test_timeout', 'Temps écoulé !')} (0 pt) &bull; ${getTranslation('test_expected', 'Attendu :')} <strong style="color: var(--text-primary); font-size: 1.05rem;">${expectedStr}</strong></span>
            </div>
        `;
    }

    setSubmitButtonState(true);

    // 4 secondes pour lire la réponse attendue après un timeout
    scheduleAdvance(4000, true);
}

/**
 * Passe au mot suivant ou termine le palier
 */
function advanceToNextWord() {
    clearScheduledAdvance();
    testState.currentWordIdx++;
    if (testState.currentWordIdx < testState.levelWords.length) {
        renderWordScreen();
    } else {
        onLevelCompleted();
    }
}

/**
 * Appelé lorsque tous les mots d'un niveau ont été répondus
 */
function onLevelCompleted() {
    if (testState.timerInterval) {
        clearInterval(testState.timerInterval);
        testState.timerInterval = null;
    }
    clearScheduledAdvance();

    const currentLevel = LEVELS[testState.currentLevelIdx];
    const total = testState.levelWords.length;
    const correct = testState.levelCorrectCount;
    const pct = total > 0 ? Math.round((correct / total) * 100) : 0;
    const passed = pct >= testState.passThreshold;

    const times = testState.levelResponseTimes || [];
    const avgTime = times.length > 0
        ? Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 10) / 10
        : 0;

    testState.history[currentLevel] = {
        total,
        correct,
        pct,
        passed,
        avgTime,
        questions: [...(testState.currentLevelQuestions || [])]
    };

    if (passed && testState.currentLevelIdx < LEVELS.length - 1) {
        renderLevelPassedScreen(currentLevel, correct, total, pct);
    } else {
        finishTest();
    }
}

/**
 * Écran intermédiaire de transition quand un niveau est réussi
 */
function renderLevelPassedScreen(level, correct, total, pct) {
    const modal = document.getElementById('placement-test-modal');
    if (!modal) return;

    const nextLevel = LEVELS[testState.currentLevelIdx + 1];
    const threshold = getTestPassThreshold();

    modal.innerHTML = `
        <div class="card placement-test-card" style="max-width: 540px; width: 92%; padding: 2.25rem 2rem; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); text-align: center; display: flex; flex-direction: column; align-items: center; gap: 1.25rem; background: var(--surface-color); border: 1px solid var(--border-color); box-sizing: border-box; margin: auto;">
            <div style="display: inline-flex; align-items: center; justify-content: center; width: 68px; height: 68px; border-radius: 50%; background: rgba(16, 185, 129, 0.15); color: #10b981; margin-bottom: 0.25rem;">
                ${ICONS.award}
            </div>
            <h2 style="font-size: 1.5rem; font-family: var(--font-heading); color: var(--text-primary); margin: 0;">
                ${getTranslation('test_level_success', 'Palier {level} validé • {score}/{total} - {percent}% !')
                    .replace('{level}', level)
                    .replace('{score}', formatScore(correct))
                    .replace('{total}', total)
                    .replace('{percent}', pct)}
            </h2>
            <p style="color: var(--text-secondary); font-size: 0.95rem; line-height: 1.5; margin: 0;">
                ${getTranslation('test_level_success_threshold', 'Félicitations ! Vous dépassez le seuil requis de <strong>{threshold}%</strong>. Passons aux questions du niveau supérieur <strong>{nextLevel}</strong>.')
                    .replace('{threshold}', threshold)
                    .replace('{nextLevel}', nextLevel)}
            </p>
            <button type="button" id="btn-next-level" class="btn-primary" style="margin-top: 0.75rem; padding: 0.75rem 2rem; font-size: 1rem; font-weight: 600; width: auto;">
                ${getTranslation('test_btn_next_level', 'Passer au palier {nextLevel}').replace('{nextLevel}', nextLevel)}
            </button>
        </div>
    `;

    const btnNext = document.getElementById('btn-next-level');
    if (btnNext) {
        btnNext.onclick = () => loadLevel(testState.currentLevelIdx + 1);
        btnNext.focus();
    }
}

/**
 * Génère le rendu HTML de la liste des mots pour un niveau
 */
function generateLevelQuestionsHtml(questions) {
    if (!questions || questions.length === 0) {
        return `<div style="text-align: center; color: var(--text-secondary); font-size: 0.9rem; padding: 1.5rem 0.5rem;">${getTranslation('test_no_word_details', 'Aucun détail disponible pour ce niveau.')}</div>`;
    }

    return questions.map((q) => {
        let statusBadge = '';
        let userAnswerFormatted = '';
        let answerColorStyle = '';

        if (q.status === 'correct') {
            statusBadge = `<span style="display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.28rem 0.65rem; border-radius: 6px; background: rgba(16, 185, 129, 0.15); color: #10b981; font-weight: 700; font-size: 0.8rem; white-space: nowrap;">${ICONS.check} +1 pt</span>`;
            userAnswerFormatted = escapeHtml(q.userAnswer);
            answerColorStyle = 'color: #10b981;';
        } else if (q.status === 'near') {
            statusBadge = `<span style="display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.28rem 0.65rem; border-radius: 6px; background: rgba(245, 158, 11, 0.18); color: #f59e0b; font-weight: 700; font-size: 0.8rem; white-space: nowrap;">${ICONS.alert} +0.5 pt</span>`;
            userAnswerFormatted = escapeHtml(q.userAnswer);
            answerColorStyle = 'color: #f59e0b;';
        } else if (q.status === 'timeout') {
            statusBadge = `<span style="display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.28rem 0.65rem; border-radius: 6px; background: rgba(245, 158, 11, 0.15); color: #f59e0b; font-weight: 600; font-size: 0.8rem; white-space: nowrap;">${ICONS.clock} ${getTranslation('test_timeout_short', 'Expiré')} (0 pt)</span>`;
            userAnswerFormatted = `<span style="color: var(--text-secondary); opacity: 0.7; font-style: italic;">(${getTranslation('test_no_answer', 'Non répondu')})</span>`;
            answerColorStyle = 'color: var(--text-secondary);';
        } else if (q.status === 'skipped') {
            statusBadge = `<span style="display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.28rem 0.65rem; border-radius: 6px; background: rgba(100, 116, 139, 0.15); color: var(--text-secondary); font-weight: 600; font-size: 0.8rem; white-space: nowrap;">${ICONS.skip} ${getTranslation('test_skipped_short', 'Passé')} (0 pt)</span>`;
            userAnswerFormatted = `<span style="color: var(--text-secondary); opacity: 0.7; font-style: italic;">(${getTranslation('test_skipped_short', 'Passé')})</span>`;
            answerColorStyle = 'color: var(--text-secondary);';
        } else {
            statusBadge = `<span style="display: inline-flex; align-items: center; gap: 0.3rem; padding: 0.28rem 0.65rem; border-radius: 6px; background: rgba(239, 68, 68, 0.15); color: #ef4444; font-weight: 700; font-size: 0.8rem; white-space: nowrap;">${ICONS.close} 0 pt</span>`;
            userAnswerFormatted = q.userAnswer ? `<span style="text-decoration: line-through;">${escapeHtml(q.userAnswer)}</span>` : `<span style="color: var(--text-secondary); opacity: 0.7; font-style: italic;">(${getTranslation('test_no_answer', 'Non répondu')})</span>`;
            answerColorStyle = 'color: #ef4444;';
        }

        const typeBadge = q.type ? `<span style="font-size: 0.72rem; padding: 0.1rem 0.4rem; border-radius: 4px; background: var(--bg-color); color: var(--text-secondary); border: 1px solid var(--border-color); font-weight: normal;">${escapeHtml(q.type)}</span>` : '';

        return `
            <div class="placement-question-row" style="display: grid; grid-template-columns: minmax(110px, 1.1fr) minmax(130px, 1.3fr) minmax(130px, 1.3fr) 95px; align-items: center; padding: 0.7rem 1.05rem; border-radius: 10px; background: var(--surface-color); border: 1px solid var(--border-color); font-size: 0.88rem; gap: 0.75rem;">
                <!-- Colonne 1 : Mot source et nature -->
                <div style="display: flex; align-items: center; gap: 0.45rem; min-width: 0;">
                    <strong style="color: var(--text-primary); font-size: 1rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(q.srcWord)}">${escapeHtml(q.srcWord)}</strong>
                    ${typeBadge}
                </div>

                <!-- Colonne 2 : Attendu -->
                <div class="col-expected" style="font-size: 0.84rem; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(q.expected)}">
                    <span>${getTranslation('test_expected', 'Attendu :')}</span> <strong style="color: var(--primary-color); font-weight: 600;">${escapeHtml(q.expected)}</strong>
                </div>

                <!-- Colonne 3 : Votre réponse -->
                <div class="col-user" style="font-size: 0.84rem; color: var(--text-secondary); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    <span>${getTranslation('test_your_answer', 'Votre réponse :')}</span> <strong style="${answerColorStyle}; font-weight: 600;">${userAnswerFormatted}</strong>
                </div>

                <!-- Colonne 4 : Badge statut fixe -->
                <div style="display: flex; justify-content: flex-end; align-items: center;">
                    ${statusBadge}
                </div>
            </div>
        `;
    }).join('');
}

/**
 * Ouvre la modal pop-up dédiée au détail des mots d'un niveau (au-dessus des résultats)
 */
function openLevelDetailModal(level, res) {
    let detailModal = document.getElementById('placement-level-detail-modal');
    if (!detailModal) {
        detailModal = document.createElement('div');
        detailModal.id = 'placement-level-detail-modal';
        detailModal.className = 'modal-overlay';
        detailModal.style.cssText = 'display: none; z-index: 10020; align-items: center; justify-content: center; position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0, 0, 0, 0.75); backdrop-filter: blur(4px);';
        document.body.appendChild(detailModal);
    }

    const badgeColor = CEFR_CONFIG.colors[level] || { solid: '#3b82f6' };
    const statusBadge = res.passed 
        ? `<span style="display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.28rem 0.75rem; border-radius: 9999px; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); color: #10b981; font-weight: 700; font-size: 0.82rem; white-space: nowrap;">${ICONS.check} ${getTranslation('test_status_passed', 'Validé')}</span>` 
        : `<span style="display: inline-flex; align-items: center; gap: 0.4rem; padding: 0.28rem 0.75rem; border-radius: 9999px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #ef4444; font-weight: 700; font-size: 0.82rem; white-space: nowrap;">${ICONS.close} ${getTranslation('test_status_failed', 'Non atteint')}</span>`;

    detailModal.innerHTML = `
        <div class="card placement-level-detail-card" style="max-width: 660px; width: 94%; max-height: 84vh; border-radius: 16px; box-shadow: 0 25px 50px rgba(0,0,0,0.6); display: flex; flex-direction: column; background: var(--surface-color); border: 1px solid var(--border-color); overflow: hidden; padding: 0;">
            <!-- Header -->
            <div style="padding: 1.15rem 1.4rem; border-bottom: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between; gap: 1rem; background: var(--bg-color);">
                <div style="display: flex; align-items: center; gap: 0.75rem; min-width: 0;">
                    <span style="background: ${badgeColor.solid}; color: #ffffff; padding: 0.25rem 0.7rem; border-radius: 6px; font-weight: 800; font-size: 1rem; flex-shrink: 0;">${level}</span>
                    <div style="min-width: 0;">
                        <h3 style="margin: 0; font-size: 1.15rem; font-family: var(--font-heading); color: var(--text-primary); text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                            ${getTranslation('test_detail_modal_title', 'Détail du Palier')} ${level}
                        </h3>
                        <div style="font-size: 0.82rem; color: var(--text-secondary); text-align: left; margin-top: 0.15rem;">
                            Score : <strong>${formatScore(res.correct)} / ${res.total}</strong> (${res.pct}%)${res.avgTime !== undefined ? ` &bull; ${getTranslation('test_summary_header_time', 'Temps moy.')} : <strong>${res.avgTime}s</strong>` : ''}
                        </div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 0.75rem; flex-shrink: 0;">
                    ${statusBadge}
                    <button type="button" id="btn-close-level-detail-x" class="modal-close-btn" style="position: static; flex-shrink: 0;" aria-label="Fermer" title="Fermer">${ICONS.close}</button>
                </div>
            </div>

            <!-- Body (Scrollable) -->
            <div style="padding: 1.25rem; overflow-y: auto; display: flex; flex-direction: column; gap: 0.65rem; flex: 1;">
                ${generateLevelQuestionsHtml(res.questions)}
            </div>

            <!-- Footer -->
            <div style="padding: 0.85rem 1.25rem; border-top: 1px solid var(--border-color); display: flex; justify-content: flex-end; background: var(--bg-color);">
                <button type="button" id="btn-close-level-detail-footer" class="btn-primary" style="padding: 0.5rem 1.5rem; font-size: 0.9rem; width: auto;">
                    ${getTranslation('test_btn_close_detail', 'Fermer')}
                </button>
            </div>
        </div>
    `;

    const closeDetail = () => {
        detailModal.style.display = 'none';
    };

    const btnX = document.getElementById('btn-close-level-detail-x');
    if (btnX) btnX.onclick = closeDetail;

    const btnFooter = document.getElementById('btn-close-level-detail-footer');
    if (btnFooter) btnFooter.onclick = closeDetail;

    // Fermer en cliquant sur le fond sombre (en dehors de la carte)
    detailModal.onclick = (e) => {
        if (e.target === detailModal) {
            closeDetail();
        }
    };

    detailModal.style.display = 'flex';
}

/**
 * Écran final des résultats
 */
async function finishTest() {
    testState.isFinished = true;
    clearScheduledAdvance();
    const modal = document.getElementById('placement-test-modal');
    if (!modal) return;
    let certifiedLevel = null;
    for (const lvl of LEVELS) {
        if (testState.history[lvl] && testState.history[lvl].passed) certifiedLevel = lvl;
        else break;
    }
    const certifiedLabel = certifiedLevel ? `Niveau ${certifiedLevel}` : getTranslation('test_level_below_a1', 'Débutant (Inférieur à A1)');
    const certifiedColor = certifiedLevel && CEFR_CONFIG.colors[certifiedLevel] ? CEFR_CONFIG.colors[certifiedLevel].solid : '#64748b';
    const levelStats = {};
    for (const lvl of LEVELS) {
        const res = testState.history[lvl];
        if (res) levelStats[lvl] = { score: res.correct, total: res.total, avg_time_sec: res.avgTime, passed: res.passed };
    }
    const savedData = await savePlacementTestResult(certifiedLevel, levelStats);

    let prevalidationHtml = '';
    if (savedData && savedData.attempts_used <= 3 && savedData.attempts_used > 0) {
        prevalidationHtml = `
            <div style="width: 100%; border: 1.5px dashed rgba(59, 130, 246, 0.4); border-radius: 10px; padding: 1.1rem; background: rgba(59, 130, 246, 0.03); box-sizing: border-box;">
                <div style="font-size: 0.9rem; font-weight: bold; color: var(--text-primary); margin-bottom: 1rem; text-align: left; display: flex; align-items: center; gap: 0.5rem;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 12 20 22 4 22 4 12"></polyline><rect x="2" y="7" width="20" height="5"></rect><line x1="12" y1="22" x2="12" y2="7"></line><path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z"></path><path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z"></path></svg> 
                    <span>Phase de pré-validation (Essai ${savedData.attempts_used}/3)</span>
                </div>
                <div id="preval-tabs-container" style="display: flex; align-items: flex-start; justify-content: space-between; max-width: 360px; margin: 0 auto; position: relative; user-select: none;">
                </div>
                <div id="preval-content-container" style="margin-top: 1.25rem; text-align: left; background: var(--surface-color); padding: 0.85rem 1rem; border-radius: 8px; border: 1px solid var(--border-color); min-height: 80px;">
                </div>
            </div>
        `;
    }
    let tableRowsHtml = '';
    for (const lvl of LEVELS) {
        const res = testState.history[lvl];
        if (!res) continue;
        const badgeColor = CEFR_CONFIG.colors[lvl] || { solid: '#3b82f6' };
        const statusText = res.passed ? `<span style="display: inline-flex; align-items: center; gap: 0.35rem; color: #10b981; font-weight: 600;">${ICONS.check} ${getTranslation('test_status_passed', 'Validé')}</span>` : `<span style="display: inline-flex; align-items: center; gap: 0.35rem; color: #ef4444; font-weight: 600;">${ICONS.close} ${getTranslation('test_status_failed', 'Non atteint')}</span>`;
        tableRowsHtml += `
            <tr class="placement-level-row" data-level="${lvl}" style="border-bottom: 1px solid var(--border-color); cursor: pointer; user-select: none; transition: background 0.15s ease;" title="${getTranslation('test_row_click_hint', 'Cliquer pour voir le détail des mots de ce niveau')}">
                <td style="padding: 0.45rem 0.85rem; text-align: left;">
                    <div style="display: inline-flex; align-items: center; gap: 0.65rem;">
                        <span style="background: ${badgeColor.solid}; color: #ffffff; padding: 0.15rem 0.55rem; border-radius: 4px; font-weight: 700; font-size: 0.82rem;">${lvl}</span>
                        <span style="font-size: 0.78rem; color: var(--primary-color); font-weight: 600; display: inline-flex; align-items: center; gap: 0.25rem;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                            <span>${getTranslation('test_view_words', 'Voir les mots')}</span>
                        </span>
                    </div>
                </td>
                <td style="padding: 0.45rem 0.85rem; text-align: center; font-weight: 600; font-size: 0.88rem;">
                    ${formatScore(res.correct)} / ${res.total} <span style="font-size: 0.78rem; color: var(--text-secondary); font-weight: normal;">(${res.pct}%)</span>
                </td>
                <td style="padding: 0.45rem 0.85rem; text-align: center; font-weight: 600; font-size: 0.88rem; color: var(--text-secondary);">
                    ${res.avgTime !== undefined ? `${res.avgTime}s` : '-'}
                </td>
                <td style="padding: 0.45rem 0.85rem; text-align: right; font-size: 0.85rem;">
                    ${statusText}
                </td>
            </tr>
        `;
    }
    
    modal.innerHTML = `
        <div class="card placement-test-card" style="max-width: 580px; width: 92%; max-height: calc(100vh - 2rem); max-height: calc(100dvh - 2rem); overflow-y: auto; padding: 1.3rem 1.6rem; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); text-align: center; display: flex; flex-direction: column; align-items: center; gap: 0.75rem; background: var(--surface-color); border: 1px solid var(--border-color); position: relative; box-sizing: border-box; margin: auto;">
            <button type="button" id="btn-close-results-x" class="modal-close-btn" aria-label="Fermer" title="Fermer">${ICONS.close}</button>
            <h2 style="font-size: 1.35rem; font-family: var(--font-heading); color: var(--text-primary); margin: 0;">${getTranslation('test_results_title', 'Résultats du test de niveau')}</h2>
            <div style="background: rgba(59, 130, 246, 0.08); border: 1.5px solid ${certifiedColor}; border-radius: 10px; padding: 0.55rem 1.25rem; width: 100%; box-sizing: border-box; display: flex; align-items: center; justify-content: space-between;">
                <div style="font-size: 0.82rem; color: var(--text-secondary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; text-align: left;">Validation du niveau</div>
                <div style="font-size: 1.5rem; font-weight: 800; color: ${certifiedColor}; font-family: var(--font-heading); line-height: 1;">${certifiedLabel}</div>
            </div>
            <div style="width: 100%; overflow-x: auto; background: var(--bg-color); border-radius: 10px; border: 1px solid var(--border-color);">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.88rem;">
                    <thead>
                        <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-secondary); font-size: 0.75rem; text-transform: uppercase;">
                            <th style="padding: 0.45rem 0.85rem; text-align: left;">${getTranslation('test_summary_header_level', 'Niveau')}</th>
                            <th style="padding: 0.45rem 0.85rem; text-align: center;">${getTranslation('test_summary_header_score', 'Score')}</th>
                            <th style="padding: 0.45rem 0.85rem; text-align: center;">${getTranslation('test_summary_header_time', 'Temps moy.')}</th>
                            <th style="padding: 0.45rem 0.85rem; text-align: right;">${getTranslation('test_summary_header_status', 'Statut')}</th>
                        </tr>
                    </thead>
                    <tbody>${tableRowsHtml}</tbody>
                </table>
            </div>
            ${prevalidationHtml}
            <p style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.35; margin: 0;">${getTranslation('test_summary_threshold_info', 'Seuil de passage : <strong>{threshold}%</strong>. Vous pouvez relancer cette évaluation diagnostique à tout moment.').replace('{threshold}', getTestPassThreshold())}</p>
            <div style="display: flex; gap: 0.75rem; justify-content: center; flex-wrap: wrap; width: 100%; margin-top: 0.2rem;">
                <button type="button" id="btn-test-retry" class="btn-primary btn-secondary-action" style="padding: 0.55rem 1.25rem; font-size: 0.88rem; width: auto; display: inline-flex; align-items: center; gap: 0.4rem;">${ICONS.retry} <span>${getTranslation('test_btn_retry', 'Refaire le test')}</span></button>
                <button type="button" id="btn-test-finish" class="btn-primary" style="padding: 0.55rem 1.8rem; font-size: 0.88rem; width: auto; display: inline-flex; align-items: center; gap: 0.4rem;">${ICONS.check} <span>${getTranslation('test_btn_close', 'Terminer')}</span></button>
            </div>
        </div>
    `;

    const btnRetry = document.getElementById('btn-test-retry');
    if (btnRetry) {
        btnRetry.onclick = (e) => {
            e.preventDefault();
            modal.style.display = 'none';
            document.body.style.overflow = '';
            setTimeout(() => {
                testState.isFinished = false;
                testState.history = {};
                const selectSrc = document.getElementById('select-lang-source');
                const selectTgt = document.getElementById('select-lang-target');
                startPlacementTest(selectSrc ? selectSrc.value : null, selectTgt ? selectTgt.value : null, true);
            }, 300);
        };
    }
    const handleClose = (e) => {
        e.preventDefault();
        closePlacementTest(true);
        if (typeof onPlacementTestFinished === 'function') onPlacementTestFinished(testState.srcLang, testState.tgtLang, certifiedLevel);
    };
    const btnFinish = document.getElementById('btn-test-finish');
    if (btnFinish) btnFinish.onclick = handleClose;
    const btnCloseResults = document.getElementById('btn-close-results-x');
    if (btnCloseResults) btnCloseResults.onclick = handleClose;

    if (savedData && savedData.attempts_used <= 3 && savedData.attempts_used > 0) {
        const tabsContainer = document.getElementById('preval-tabs-container');
        const contentContainer = document.getElementById('preval-content-container');
        if (tabsContainer && contentContainer) {
            const historyData = savedData.history || [];
            const averagesData = savedData.averages || {};
            let currentTab = savedData.attempts_used === 3 ? 3 : (savedData.attempts_used - 1);
            const renderTabsAndContent = () => {
                let tabsHtml = '';
                const attempt = savedData.attempts_used;
                for (let i = 0; i <= 3; i++) {
                    const isDone = i < 3 ? (i < attempt) : (attempt === 3);
                    const isClickable = isDone;
                    const isActive = i === currentTab;
                    const bg = isActive ? 'var(--primary-color)' : (isDone ? 'rgba(59, 130, 246, 0.12)' : 'var(--bg-color)');
                    const color = isActive ? '#fff' : (isDone ? 'var(--primary-color)' : 'var(--text-secondary)');
                    const border = isActive ? 'none' : (isDone ? '1px solid var(--primary-color)' : '1px dashed var(--border-color)');
                    const cursor = isClickable ? 'pointer' : 'default';
                    const label = i < 3 ? `Essai ${i + 1}` : 'Moyenne';
                    const icon = i < 3 
                        ? (isDone ? '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : (i+1)) 
                        : '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>';
                    tabsHtml += `
                        <div class="preval-tab" data-index="${i}" style="display: flex; flex-direction: column; align-items: center; gap: 0.35rem; z-index: 1; cursor: ${cursor}; opacity: ${isClickable ? 1 : 0.4};">
                            <div style="width: 28px; height: 28px; border-radius: 50%; background: ${bg}; color: ${color}; border: ${border}; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: bold; transition: all 0.2s; box-shadow: ${isActive ? '0 0 0 3px rgba(59, 130, 246, 0.2)' : 'none'};">
                                ${icon}
                            </div>
                            <span style="font-size: 0.72rem; color: ${isActive ? 'var(--primary-color)' : 'var(--text-secondary)'}; font-weight: ${isActive ? 'bold' : 'normal'}; transition: all 0.2s;">${label}</span>
                        </div>
                    `;
                    if (i < 3) tabsHtml += `<div style="flex: 1; height: 2px; background: ${isDone ? 'var(--primary-color)' : 'var(--border-color)'}; margin-top: 14px; opacity: ${isClickable ? 1 : 0.4}; transition: all 0.2s;"></div>`;
                }
                tabsContainer.innerHTML = tabsHtml;

                let rowsHtml = '';
                let titleText = '';
                if (currentTab === 3) {
                    titleText = 'Moyennes finales des 3 essais :';
                    for (const lvl of LEVELS) {
                        if (averagesData[lvl]) {
                            const avg = averagesData[lvl];
                            rowsHtml += `
                                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem; border-bottom: 1px dashed var(--border-color); padding: 0.4rem 0;">
                                    <div><strong>${lvl}</strong><span style="font-size: 0.72rem; color: ${avg.passed_count > 0 ? 'var(--primary-color)' : 'var(--text-secondary)'}; font-weight: 600; margin-left: 0.4rem; background: ${avg.passed_count > 0 ? 'rgba(59, 130, 246, 0.1)' : 'transparent'}; padding: 0.15rem 0.35rem; border-radius: 4px;">(Atteint ${avg.passed_count || 0}/${avg.attempts_count || 0})</span></div>
                                    <span style="font-weight: 600; color: var(--text-primary);">Score : ${avg.avg_score_percent}% <span style="color: var(--text-secondary); font-weight: normal;">| ${avg.avg_time_sec}s</span></span>
                                </div>
                            `;
                        }
                    }
                } else {
                    titleText = `Résultats de l'Essai ${currentTab + 1} :`;
                    const hist = historyData[currentTab];
                    if (hist && hist.levels) {
                        for (const lvl of LEVELS) {
                            if (hist.levels[lvl]) {
                                const lData = hist.levels[lvl];
                                const scorePct = Math.round((lData.score / lData.total) * 100);
                                const passed = lData.passed;
                                rowsHtml += `
                                    <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem; border-bottom: 1px dashed var(--border-color); padding: 0.4rem 0;">
                                        <div><strong>${lvl}</strong><span style="font-size: 0.72rem; color: ${passed ? 'var(--primary-color)' : '#ef4444'}; font-weight: 600; margin-left: 0.4rem; background: ${passed ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; padding: 0.15rem 0.35rem; border-radius: 4px;">${passed ? 'Atteint <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="margin-left: 0.15rem; vertical-align: middle; margin-bottom: 2px;"><polyline points="20 6 9 17 4 12"></polyline></svg>' : 'Non atteint'}</span></div>
                                        <span style="font-weight: 600; color: var(--text-primary);">Score : ${scorePct}% <span style="color: var(--text-secondary); font-weight: normal;">| ${lData.avg_time_sec}s</span></span>
                                    </div>
                                `;
                            }
                        }
                    } else rowsHtml = `<div style="font-size: 0.8rem; color: var(--text-secondary); text-align: center; padding: 1rem 0;">Données indisponibles</div>`;
                }
                contentContainer.innerHTML = `<div style="font-size: 0.85rem; font-weight: bold; color: var(--text-primary); margin-bottom: 0.5rem;">${titleText}</div>${rowsHtml}`;

                tabsContainer.querySelectorAll('.preval-tab').forEach(tab => {
                    tab.addEventListener('click', () => {
                        const idx = parseInt(tab.getAttribute('data-index'), 10);
                        const isDone = idx < 3 ? (idx < attempt) : (attempt === 3);
                        if (isDone && idx !== currentTab) {
                            currentTab = idx;
                            renderTabsAndContent();
                        }
                    });
                });
            };
            renderTabsAndContent();
        }
    }
}
