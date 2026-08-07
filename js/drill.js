import { vocabulary } from './data/vocabulary.js?v=29';
import { getWordStatus, setWordStatus } from './storage.js?v=29';
import { translations } from './i18n.js?v=34';
import { examples } from './data/examples.js?v=2';

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

// Nettoyage simple (insensible à la casse et espaces en trop)
function normalizeText(text) {
    return text.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function initDrillSession(source, target, volume, levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']) {
    sessionState.langSource = source;
    sessionState.langTarget = target;
    
    // Filtrer les mots qui sont encore "actifs" pour cette paire et qui correspondent au niveau
    const availableWords = vocabulary.filter(w => {
        const isNotValidated = getWordStatus(source, target, w.id) !== 'validé';
        const matchesLevel = levels.includes(w.level);
        return isNotValidated && matchesLevel;
    });

    // Si on a moins de mots que le volume demandé, on prend tout ce qu'il reste
    const shuffled = shuffle([...availableWords]);
    sessionState.words = shuffled.slice(0, volume);
    sessionState.currentIndex = 0;
    sessionState.isWaitingAction = false;

    // Reset de l'UI si on vient d'une fin de session
    const flashcard = document.querySelector('.flashcard');
    const headerSection = document.getElementById('drill-header-section');
    const endContainer = document.getElementById('end-session-container');
    if (flashcard) flashcard.style.display = 'block';
    if (headerSection) headerSection.style.display = 'flex';
    if (endContainer) endContainer.style.display = 'none';

    renderCurrentWord();
}

// Change la langue source et cible à la volée
export function flipTranslation() {
    const temp = sessionState.langSource;
    sessionState.langSource = sessionState.langTarget;
    sessionState.langTarget = temp;
    renderCurrentWord();
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
    if (inputWrapperEl) inputWrapperEl.style.display = 'block';
    
    resultSection.classList.add('hidden');
    inputEl.value = '';
    inputEl.disabled = false;
    sessionState.isWaitingAction = false;

    const rewriteLine = document.getElementById('rewrite-line');
    const rewriteInput = document.getElementById('rewrite-input');
    if (rewriteLine && rewriteInput) {
        rewriteLine.style.display = 'none';
        rewriteInput.value = '';
        rewriteInput.classList.remove('correct');
        rewriteInput.disabled = true;
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
    wordSourceEl.textContent = currentWord[sessionState.langSource];
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
            if (currentWord.level === 'A2') { badgeBg = 'rgba(16, 185, 129, 0.2)'; badgeColor = '#10b981'; }
            if (currentWord.level === 'B1') { badgeBg = 'rgba(245, 158, 11, 0.2)'; badgeColor = '#f59e0b'; }
            if (currentWord.level === 'B2') { badgeBg = 'rgba(239, 68, 68, 0.2)'; badgeColor = '#ef4444'; }
            if (currentWord.level === 'C1') { badgeBg = 'rgba(139, 92, 246, 0.2)'; badgeColor = '#8b5cf6'; }
            if (currentWord.level === 'C2') { badgeBg = 'rgba(168, 85, 247, 0.2)'; badgeColor = '#a855f7'; }
            
            levelBadgeEl.style.background = badgeBg;
            levelBadgeEl.style.color = badgeColor;
            levelBadgeEl.style.fontWeight = '600';
        } else {
            levelBadgeEl.classList.add('hidden');
            levelBadgeEl.style.display = 'none';
        }
    }
    const suffix = translations[lang].words_remaining;
    counterEl.textContent = `${sessionState.words.length} ${suffix}`;
    
    inputEl.style.display = 'block';
    
    // On ne donne le focus à l'input que sur ordinateur pour éviter de forcer le clavier sur mobile
    const isMobile = window.innerWidth <= 640;
    if (!isMobile) {
        inputEl.focus();
    }

    // Bouton d'action mobile (phase Saisie)
    const btnMobileSecondary = document.getElementById('btn-mobile-secondary');
    const btnMobilePrimary = document.getElementById('btn-mobile-primary');
    
    if (btnMobileSecondary && btnMobilePrimary) {
        btnMobileSecondary.style.visibility = 'hidden';
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

        const isCorrect = normalizeText(userInput) === normalizeText(expected);

        // Affichage des résultats
        const asked = currentWord[sessionState.langSource];
        document.getElementById('result-asked').textContent = asked;
        
        const userContainer = document.getElementById('result-user-container');
        const userEl = document.getElementById('result-user');
        if (userEl) userEl.textContent = userInput || '(vide)';

        document.getElementById('result-expected').textContent = expected;
        
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
        
        const inputWrapperEl = document.getElementById('drill-input-wrapper');
        if (inputWrapperEl) inputWrapperEl.style.display = 'none';
        
        inputEl.disabled = true;
        inputEl.blur(); // Masque le clavier virtuel sur mobile
        sessionState.isWaitingAction = true;

        const wordWrapperEl = document.getElementById('drill-word-wrapper');
        if (wordWrapperEl) wordWrapperEl.style.display = 'none';
        
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
        const lang = getAppLanguage();
        if (isCorrect) {
            statusBanner.textContent = translations[lang].status_correct;
            statusBanner.style.backgroundColor = 'var(--success-color)';
            statusBanner.style.color = '#fff';
            statusBanner.dataset.correct = "true";
            
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
            if (exampleCorrectLine && exampleCorrectText && currentWord && examples[currentWord.id]) {
                const sentence = examples[currentWord.id][sessionState.langTarget];
                if (sentence) {
                    exampleCorrectText.innerHTML = sentence.replace(/\*([^*]+)\*/g, '<span class="example-highlight">$1</span>');
                    exampleCorrectLine.style.display = 'flex';
                } else {
                    exampleCorrectLine.style.display = 'none';
                }
            }
            
            const iconRotate = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path></svg>`;
            const iconCheck = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            
            const labelReview = translations[lang].action_review;
            const labelMastered = translations[lang].action_mastered;
            
            dynamicHints.innerHTML = isMobile ? '' : `
                <button id="btn-next-auto" class="btn-drill-action btn-primary-action">
                    <kbd class="desktop-only">Entree</kbd> <span style="display: flex; align-items: center; gap: 0.4rem;">${iconCheck} ${labelMastered}</span>
                </button>
                <button id="btn-next-keep" class="btn-drill-action btn-secondary-action">
                    <kbd class="desktop-only">G</kbd> <span style="display: flex; align-items: center; gap: 0.4rem;">${iconRotate} ${labelReview}</span>
                </button>
            `;
            
            const btnAuto = document.getElementById('btn-next-auto');
            if (btnAuto) btnAuto.onclick = () => proceedNextWord('auto');
            
            const btnKeep = document.getElementById('btn-next-keep');
            if (btnKeep) btnKeep.onclick = () => proceedNextWord('keep');
            
            if (isMobile) {
                const btnMobileSecondary = document.getElementById('btn-mobile-secondary');
                const btnMobilePrimary = document.getElementById('btn-mobile-primary');
                
                if (btnMobileSecondary && btnMobilePrimary) {
                    btnMobileSecondary.style.visibility = 'visible';
                    
                    // Correct : Action par défaut (en bas) = Acquis. Action secondaire (en haut) = À revoir
                    btnMobilePrimary.innerHTML = `<span style="display: flex; align-items: center; justify-content: center; width: 100%; gap: 0.4rem;">${iconCheck} ${labelMastered}</span>`;
                    btnMobilePrimary.className = "btn-primary";
                    
                    btnMobileSecondary.innerHTML = `<span style="display: flex; align-items: center; justify-content: center; width: 100%; gap: 0.4rem;">${iconRotate} ${labelReview}</span>`;
                    btnMobileSecondary.className = "btn-drill-action btn-secondary-action";
                    
                    btnMobilePrimary.onclick = (e) => { e.stopPropagation(); proceedNextWord('remove'); };
                    btnMobileSecondary.onclick = (e) => { e.stopPropagation(); proceedNextWord('keep'); };
                }
            }
        } else {
            statusBanner.textContent = translations[lang].status_incorrect;
            statusBanner.style.backgroundColor = 'var(--error-color)';
            statusBanner.style.color = '#fff';
            statusBanner.dataset.correct = "false";
            
            const expectedContainer = document.getElementById('result-expected-container');
            if (expectedContainer) {
                expectedContainer.style.display = 'flex';
            }
            if (userContainer) {
                userContainer.style.display = 'flex';
            }
            
            const rewriteLine = document.getElementById('rewrite-line');
            const rewriteInput = document.getElementById('rewrite-input');
            if (rewriteLine && rewriteInput && !isMobile) {
                rewriteLine.style.display = 'flex';
                rewriteInput.value = '';
                rewriteInput.classList.remove('correct');
                rewriteInput.disabled = false;
                
                rewriteInput.oninput = () => {
                    const normalizedInput = normalizeText(rewriteInput.value);
                    const normalizedExpected = normalizeText(expected);
                    if (normalizedInput === normalizedExpected) {
                        rewriteInput.classList.add('correct');
                    } else {
                        rewriteInput.classList.remove('correct');
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
            if (exampleIncorrectLine && exampleIncorrectText && currentWord && examples[currentWord.id]) {
                const sentence = examples[currentWord.id][sessionState.langTarget];
                if (sentence) {
                    exampleIncorrectText.innerHTML = sentence.replace(/\*([^*]+)\*/g, '<span class="example-highlight">$1</span>');
                    exampleIncorrectLine.style.display = 'flex';
                } else {
                    exampleIncorrectLine.style.display = 'none';
                }
            }
            
            const iconRotate = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path></svg>`;
            const iconCheck = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
            
            const labelReview = translations[lang].action_review;
            const labelMastered = translations[lang].action_mastered;
            
            dynamicHints.innerHTML = isMobile ? '' : `
                <button id="btn-next-auto" class="btn-drill-action btn-primary-action">
                    <kbd class="desktop-only">Entree</kbd> <span style="display: flex; align-items: center; gap: 0.4rem;">${iconRotate} ${labelReview}</span>
                </button>
                <button id="btn-next-remove" class="btn-drill-action btn-secondary-action">
                    <kbd class="desktop-only">Alt + R</kbd> <span style="display: flex; align-items: center; gap: 0.4rem;">${iconCheck} ${labelMastered}</span>
                </button>
            `;
            
            const btnAuto = document.getElementById('btn-next-auto');
            if (btnAuto) btnAuto.onclick = () => proceedNextWord('auto');
            
            const btnRemove = document.getElementById('btn-next-remove');
            if (btnRemove) btnRemove.onclick = () => proceedNextWord('remove');
            
            if (isMobile) {
                const btnMobileSecondary = document.getElementById('btn-mobile-secondary');
                const btnMobilePrimary = document.getElementById('btn-mobile-primary');
                
                if (btnMobileSecondary && btnMobilePrimary) {
                    btnMobileSecondary.style.visibility = 'visible';
                    
                    // Incorrect : Action par défaut (en bas) = À revoir. Action secondaire (en haut) = Acquis
                    btnMobilePrimary.innerHTML = `<span style="display: flex; align-items: center; justify-content: center; width: 100%; gap: 0.4rem;">${iconRotate} ${labelReview}</span>`;
                    btnMobilePrimary.className = "btn-primary";
                    
                    btnMobileSecondary.innerHTML = `<span style="display: flex; align-items: center; justify-content: center; width: 100%; gap: 0.4rem;">${iconCheck} ${labelMastered}</span>`;
                    btnMobileSecondary.className = "btn-drill-action btn-secondary-action";
                    
                    btnMobilePrimary.onclick = (e) => { e.stopPropagation(); proceedNextWord('keep'); };
                    btnMobileSecondary.onclick = (e) => { e.stopPropagation(); proceedNextWord('remove'); };
                }
            }
        }
    } catch (error) {
        alert("Erreur JS: " + error.message + "\nLigne: " + error.lineNumber);
        console.error(error);
    }
}

// Action sur le mot (garder ou retirer)
function proceedNextWord(action) {
    if (!sessionState.isWaitingAction || sessionState.words.length === 0) return;

    const currentWord = sessionState.words[sessionState.currentIndex];
    const statusBanner = document.getElementById('result-status');
    const wasCorrect = statusBanner.dataset.correct === "true";

    let finalStatus = 'actif'; // par défaut, on garde

    if (action === 'auto') {
        finalStatus = wasCorrect ? 'validé' : 'actif';
    } else if (action === 'keep') {
        finalStatus = 'actif'; // Forcé à garder
    } else if (action === 'remove') {
        finalStatus = 'validé'; // Forcé à retirer de la session (on le marque validé)
    }

    setWordStatus(sessionState.langSource, sessionState.langTarget, currentWord.id, finalStatus);

    // Supprimer le mot de la session courante s'il est validé
    if (finalStatus === 'validé') {
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
            const minDistance = 6;
            const maxDistance = 9;
            const offset = Math.floor(Math.random() * (maxDistance - minDistance + 1)) + minDistance;
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
    if (endContainer) {
        endContainer.style.display = 'flex';
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
    const rewriteInput = document.getElementById('rewrite-input');
    const isRewriteFocused = rewriteInput && document.activeElement === rewriteInput;

    if (!sessionState.isWaitingAction) {
        // Mode saisie
        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();
            handleValidation();
        }
    } else {
        // Mode résultat, attente d'action
        const key = e.key.toLowerCase();
        
        if (isRewriteFocused) {
            // Dans le champ de réécriture, on ignore les raccourcis direct G et R
            // mais on autorise Échap pour sortir du focus (blur), et Alt+R / Alt+G pour forcer l'action
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                rewriteInput.blur();
                return;
            }

            if (key === 'r' && e.altKey) {
                e.preventDefault();
                e.stopPropagation();
                proceedNextWord('remove');
                return;
            }

            if (key === 'g' && e.altKey) {
                e.preventDefault();
                e.stopPropagation();
                proceedNextWord('keep');
                return;
            }

            if (key === 'enter') {
                e.preventDefault();
                e.stopPropagation();
                proceedNextWord('auto');
            }
            return;
        }

        if (key === 'enter') {
            e.preventDefault();
            e.stopPropagation();
            proceedNextWord('auto');
        } else if (key === 'g') {
            e.preventDefault();
            e.stopPropagation();
            proceedNextWord('keep');
        } else if (key === 'r') {
            e.preventDefault();
            e.stopPropagation();
            proceedNextWord('remove');
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
