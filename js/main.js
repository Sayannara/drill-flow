import { vocabulary } from './data/vocabulary.js?v=129';
import { initDrillSession, handleDrillKeydown } from './drill.js?v=129';
import { loadProgress, setWordStatus, getWordStatus, getWordStats, resetPairProgress, saveUserProfile, getOrGenerateCertificateId } from './storage.js';
import { translations } from './i18n.js';
import { authenticateUser, loginUser, signUpUser, resetPassword, getCurrentUser, updateAuthUI } from './auth.js';
import { CEFR_CONFIG, calculateCefrPoints, getPointsBreakdownByLevel, getCefrLevelFromPoints, getCefrProgressDetails } from './config/cefr.js';
import { APP_CONFIG, getCertNameLockDays } from './config/app-config.js';
import { startPlacementTest } from './placement-test.js?v=129';

// --- Gestion des Langues (Internationalisation) ---
export function getAppLanguage() {
    return localStorage.getItem('app_lang') || 'fr';
}

export function setAppLanguage(lang) {
    localStorage.setItem('app_lang', lang);
}

export function getLangName(langCode) {
    const appLang = getAppLanguage();
    const key = `lang_${langCode}`;
    return translations[appLang]?.[key] || translations['fr']?.[key] || langCode.toUpperCase();
}

export function formatValidatedCount(count, lang = getAppLanguage()) {
    const isPlural = count > 1;
    switch (lang) {
        case 'en':
            return `${count} validated word${isPlural ? 's' : ''}`;
        case 'de':
            return `${count} validierte${count === 1 ? 's' : ''} Wort${isPlural ? 'er' : ''}`;
        case 'es':
            return `${count} palabra${isPlural ? 's' : ''} validada${isPlural ? 's' : ''}`;
        case 'fr':
        default:
            return `${count} mot${isPlural ? 's' : ''} validé${isPlural ? 's' : ''}`;
    }
}

export function formatFilteredCount(count, lang = getAppLanguage()) {
    const isPlural = count > 1;
    const formattedNum = count.toLocaleString(lang === 'fr' ? 'fr-FR' : (lang === 'de' ? 'de-DE' : (lang === 'es' ? 'es-ES' : 'en-US')));
    let suffix = 'mots';
    switch (lang) {
        case 'en':
            suffix = `word${isPlural ? 's' : ''}`;
            break;
        case 'de':
            suffix = isPlural ? 'Wörter' : 'Wort';
            break;
        case 'es':
            suffix = `palabra${isPlural ? 's' : ''}`;
            break;
        case 'fr':
        default:
            suffix = `mot${isPlural ? 's' : ''}`;
            break;
    }
    return `<strong style="color: var(--text-primary); font-weight: 700;">${formattedNum}</strong> ${suffix}`;
}

export function getPossibleVolumes() {
    const raw = localStorage.getItem('drillflow_possible_volumes');
    if (!raw) return [5, 10, 15, 20];
    const parsed = raw.split(',')
        .map(v => parseInt(v.trim(), 10))
        .filter(n => !isNaN(n) && n > 0);
    return parsed.length > 0 ? Array.from(new Set(parsed)).sort((a, b) => a - b) : [5, 10, 15, 20];
}

export function getValidatedCount(src, tgt) {
    let count = 0;
    for (let i = 0; i < vocabulary.length; i++) {
        if (getWordStatus(src, tgt, vocabulary[i].id) === 'validé') {
            count++;
        }
    }
    return count;
}

export function translateElement(element, lang) {
    const keys = element.querySelectorAll('[data-i18n]');
    keys.forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key] !== undefined) {
            el.innerHTML = translations[lang][key];
        }
    });
    
    const placeholders = element.querySelectorAll('[data-i18n-placeholder]');
    placeholders.forEach(el => {
        const key = el.getAttribute('data-i18n-placeholder');
        if (translations[lang] && translations[lang][key] !== undefined) {
            el.setAttribute('placeholder', translations[lang][key]);
        }
    });

    const titles = element.querySelectorAll('[data-i18n-title]');
    titles.forEach(el => {
        const key = el.getAttribute('data-i18n-title');
        if (translations[lang] && translations[lang][key] !== undefined) {
            el.setAttribute('title', translations[lang][key]);
            el.setAttribute('aria-label', translations[lang][key]);
        }
    });
}

export function translatePage() {
    const lang = getAppLanguage();
    translateElement(document.body, lang);
    if (typeof updateAuthUI === 'function') {
        updateAuthUI(getCurrentUser());
    }
}

// --- Gestion du Thème (Clair / Sombre) ---
const htmlEl = document.documentElement;

export function applyTheme(theme) {
    htmlEl.setAttribute('data-theme', theme);
    localStorage.setItem('drillflow_theme', theme);
    updateThemeButtonsUI(theme);
}

function updateThemeButtonsUI(theme) {
    const btnDark = document.getElementById('theme-opt-dark');
    const btnLight = document.getElementById('theme-opt-light');
    if (btnDark && btnLight) {
        if (theme === 'dark') {
            btnDark.classList.add('active');
            btnLight.classList.remove('active');
        } else {
            btnLight.classList.add('active');
            btnDark.classList.remove('active');
        }
    }
}

// Détection automatique du thème ou récupération du choix utilisateur
const savedTheme = localStorage.getItem('drillflow_theme');
const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

let initialTheme = 'dark';
if (savedTheme) {
    initialTheme = savedTheme;
} else if (!systemPrefersDark) {
    initialTheme = 'light';
}

htmlEl.setAttribute('data-theme', initialTheme);

// Écouter les changements du système (ex: passage au mode nuit automatique sur le téléphone)
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    if (!localStorage.getItem('drillflow_theme')) { // Seulement si l'utilisateur n'a pas forcé un thème
        const newTheme = event.matches ? 'dark' : 'light';
        applyTheme(newTheme);
    }
});

// Initialisation de la modale Options
function initOptionsModal() {
    const optionsBtn = document.getElementById('options-btn');
    const optionsModal = document.getElementById('options-modal');
    const closeBtn = document.getElementById('btn-close-options');
    const btnDark = document.getElementById('theme-opt-dark');
    const btnLight = document.getElementById('theme-opt-light');
    const btnAudioOff = document.getElementById('audio-opt-off');
    const btnAudioOn = document.getElementById('audio-opt-on');
    const btnAccentsOn = document.getElementById('accents-opt-on');
    const btnAccentsOff = document.getElementById('accents-opt-off');
    const pairSelect = document.getElementById('options-reset-pair');
    const btnReset = document.getElementById('btn-reset-pair');

    if (!optionsModal) return;

    function updateAudioButtonsUI(enabled) {
        if (btnAudioOff && btnAudioOn) {
            if (enabled) {
                btnAudioOn.classList.add('active');
                btnAudioOff.classList.remove('active');
            } else {
                btnAudioOff.classList.add('active');
                btnAudioOn.classList.remove('active');
            }
        }
    }

    function updateAccentsButtonsUI(enabled) {
        if (btnAccentsOff && btnAccentsOn) {
            if (enabled) {
                btnAccentsOn.classList.add('active');
                btnAccentsOff.classList.remove('active');
            } else {
                btnAccentsOff.classList.add('active');
                btnAccentsOn.classList.remove('active');
            }
        }
    }

    function openOptions() {
        const currentTheme = htmlEl.getAttribute('data-theme') || 'dark';
        updateThemeButtonsUI(currentTheme);
        const isAutoSpeak = localStorage.getItem('drillflow_auto_speak') === 'on';
        updateAudioButtonsUI(isAutoSpeak);
        const isAccentsTolerant = localStorage.getItem('drillflow_tolerate_accents') !== 'off';
        updateAccentsButtonsUI(isAccentsTolerant);
        populateOptionsPairSelect();
        optionsModal.classList.remove('hidden');
    }

    function closeOptions() {
        optionsModal.classList.add('hidden');
    }

    function populateOptionsPairSelect() {
        if (!pairSelect) return;
        pairSelect.innerHTML = '';
        const progress = loadProgress();
        const lang = getAppLanguage();

        // Récupérer UNIQUEMENT les paires de langues qui contiennent des mots enregistrés
        const usedPairs = Object.keys(progress).filter(key => {
            return progress[key] && typeof progress[key] === 'object' && Object.keys(progress[key]).length > 0;
        });

        if (usedPairs.length === 0) {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = translations[lang]?.options_no_progress || translations['fr'].options_no_progress || 'Aucune progression enregistrée';
            opt.disabled = true;
            opt.selected = true;
            pairSelect.appendChild(opt);
            pairSelect.disabled = true;
            if (btnReset) {
                btnReset.disabled = true;
                btnReset.style.opacity = '0.5';
                btnReset.style.cursor = 'not-allowed';
            }
            return;
        }

        pairSelect.disabled = false;
        if (btnReset) {
            btnReset.disabled = true;
            btnReset.style.opacity = '0.5';
            btnReset.style.cursor = 'not-allowed';
        }

        // Option vide par défaut (aucune pré-sélection)
        const placeholderOpt = document.createElement('option');
        placeholderOpt.value = '';
        placeholderOpt.textContent = translations[lang]?.options_select_placeholder || '-- Choisir une paire --';
        placeholderOpt.selected = true;
        placeholderOpt.disabled = true;
        pairSelect.appendChild(placeholderOpt);

        usedPairs.forEach(pair => {
            const [src, tgt] = pair.split('-');
            const opt = document.createElement('option');
            opt.value = pair;
            const validatedCount = getValidatedCount(src, tgt);
            opt.textContent = `${getLangName(src)} ➔ ${getLangName(tgt)} (${formatValidatedCount(validatedCount, lang)})`;
            pairSelect.appendChild(opt);
        });

        pairSelect.value = '';
    }

    if (pairSelect) {
        pairSelect.onchange = () => {
            if (btnReset) {
                if (pairSelect.value) {
                    btnReset.disabled = false;
                    btnReset.style.opacity = '1';
                    btnReset.style.cursor = 'pointer';
                } else {
                    btnReset.disabled = true;
                    btnReset.style.opacity = '0.5';
                    btnReset.style.cursor = 'not-allowed';
                }
            }
        };
    }

    if (optionsBtn) {
        optionsBtn.onclick = openOptions;
    }
    if (closeBtn) {
        closeBtn.onclick = closeOptions;
    }
    optionsModal.onclick = (e) => {
        if (e.target === optionsModal) closeOptions();
    };

    if (btnDark) {
        btnDark.onclick = () => applyTheme('dark');
    }
    if (btnLight) {
        btnLight.onclick = () => applyTheme('light');
    }

    if (btnAudioOff) {
        btnAudioOff.onclick = () => {
            localStorage.setItem('drillflow_auto_speak', 'off');
            updateAudioButtonsUI(false);
        };
    }
    if (btnAudioOn) {
        btnAudioOn.onclick = () => {
            localStorage.setItem('drillflow_auto_speak', 'on');
            updateAudioButtonsUI(true);
        };
    }

    if (btnAccentsOn) {
        btnAccentsOn.onclick = () => {
            localStorage.setItem('drillflow_tolerate_accents', 'on');
            updateAccentsButtonsUI(true);
        };
    }
    if (btnAccentsOff) {
        btnAccentsOff.onclick = () => {
            localStorage.setItem('drillflow_tolerate_accents', 'off');
            updateAccentsButtonsUI(false);
        };
    }

    if (btnReset && pairSelect) {
        btnReset.onclick = async () => {
            const pair = pairSelect.value;
            if (!pair) return;
            const [src, tgt] = pair.split('-');
            const lang = getAppLanguage();
            const pairName = `${getLangName(src)} ➔ ${getLangName(tgt)}`;
            const confirmTemplate = translations[lang]?.options_reset_confirm || translations['fr'].options_reset_confirm;
            const confirmMsg = confirmTemplate.replace('{pair}', pairName);

            if (confirm(confirmMsg)) {
                btnReset.disabled = true;
                btnReset.style.opacity = '0.5';
                await resetPairProgress(src, tgt);
                btnReset.disabled = false;
                btnReset.style.opacity = '1';

                const successTemplate = translations[lang]?.options_reset_success || translations['fr'].options_reset_success;
                alert(successTemplate.replace('{pair}', pairName));
                closeOptions();

                // Rafraîchir la vue active si c'est "progress" ou "stats"
                const activeBtn = document.querySelector('.nav-btn.active');
                if (activeBtn) {
                    const viewId = activeBtn.id.replace('nav-', '');
                    if (viewId === 'progress' || viewId === 'stats') {
                        renderView(viewId, false);
                    }
                }
            }
        };
    }

    window.addEventListener('auth-changed', () => {
        populateOptionsPairSelect();
    });
}

// --- Routeur SPA ---
const appContainer = document.getElementById('app-container');
const navButtons = document.querySelectorAll('.nav-btn');

function renderView(viewId) {
    // Vider le conteneur principal
    appContainer.innerHTML = '';
    
    // Récupérer le template correspondant
    const template = document.getElementById(`view-${viewId}`);
    if (template) {
        // Cloner et injecter le contenu
        const content = template.content.cloneNode(true);
        
        // Appliquer la traduction sur le contenu clone
        const lang = getAppLanguage();
        translateElement(content, lang);
        
        appContainer.appendChild(content);
    } else {
        appContainer.innerHTML = '<p>Vue introuvable.</p>';
    }

    // Mettre à jour l'état actif dans le menu
    navButtons.forEach(btn => btn.classList.remove('active'));
    const activeBtn = document.getElementById(`nav-${viewId}`);
    if (activeBtn) activeBtn.classList.add('active');

    // Masquer le footer durant le drill et ajuster le padding du conteneur
    const appFooter = document.getElementById('app-footer-version');
    if (appFooter) {
        appFooter.style.display = (viewId === 'drill') ? 'none' : '';
    }
    if (appContainer) {
        appContainer.classList.toggle('in-drill-mode', viewId === 'drill');
    }
}

// Écouteurs pour la navigation
document.getElementById('nav-home').addEventListener('click', () => renderView('home'));
document.getElementById('nav-progress').addEventListener('click', () => renderView('progress'));
document.getElementById('nav-stats').addEventListener('click', () => renderView('stats'));
document.getElementById('nav-certs').addEventListener('click', () => renderView('certs'));
document.getElementById('nav-about').addEventListener('click', () => renderView('about'));

const logoEl = document.getElementById('app-logo');
if (logoEl) {
    logoEl.addEventListener('click', () => renderView('home'));
}

// Initialisation des boutons par vue
function attachViewEvents(viewId) {
    document.onkeydown = null;

    if (viewId === 'home') {
        const btnStart = document.getElementById('btn-start-session');
        const inputVol = document.getElementById('input-volume');
        const volDisp = document.getElementById('volume-display');
        
        // Charger les dernières préférences
        const lastSrc = localStorage.getItem('voc_last_src') || 'fr';
        const lastTgt = localStorage.getItem('voc_last_tgt') || 'en';
        const lastVol = localStorage.getItem('voc_last_vol') || '20';
        const lastMode = localStorage.getItem('voc_last_mode') || 'smart';
        
        const savedLevelsStr = localStorage.getItem('drill_levels');
        const savedLevels = savedLevelsStr ? JSON.parse(savedLevelsStr) : ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

        const selectSrc = document.getElementById('select-lang-source');
        const selectTgt = document.getElementById('select-lang-target');
        
        function updateTargetOptions() {
            if (!selectSrc || !selectTgt) return;
            const srcVal = selectSrc.value;
            const prevTgtVal = selectTgt.value;
            
            selectTgt.innerHTML = '';
            
            const langs = [
                { value: 'fr', text: 'Français' },
                { value: 'en', text: 'Anglais' },
                { value: 'de', text: 'Allemand' },
                { value: 'es', text: 'Espagnol' }
            ];
            
            langs.forEach(lang => {
                if (lang.value !== srcVal) {
                    const opt = document.createElement('option');
                    opt.value = lang.value;
                    opt.textContent = getLangName(lang.value);
                    selectTgt.appendChild(opt);
                }
            });
            
            if (prevTgtVal !== srcVal) {
                selectTgt.value = prevTgtVal;
            } else {
                const fallback = langs.find(l => l.value !== srcVal);
                if (fallback) selectTgt.value = fallback.value;
            }
        }

        if (selectSrc) {
            selectSrc.value = lastSrc;
            selectSrc.addEventListener('change', () => {
                updateTargetOptions();
                localStorage.setItem('voc_last_src', selectSrc.value);
                if (selectTgt) localStorage.setItem('voc_last_tgt', selectTgt.value);
            });
        }
        updateTargetOptions();
        if (selectTgt) {
            if (lastTgt !== lastSrc) {
                selectTgt.value = lastTgt;
            }
            selectTgt.addEventListener('change', () => {
                localStorage.setItem('voc_last_tgt', selectTgt.value);
            });
        }
        
        const cbA1 = document.getElementById('drill-level-a1');
        const cbA2 = document.getElementById('drill-level-a2');
        const cbB1 = document.getElementById('drill-level-b1');
        const cbB2 = document.getElementById('drill-level-b2');
        const cbC1 = document.getElementById('drill-level-c1');
        const cbC2 = document.getElementById('drill-level-c2');
        if (cbA1) cbA1.checked = savedLevels.includes('A1');
        if (cbA2) cbA2.checked = savedLevels.includes('A2');
        if (cbB1) cbB1.checked = savedLevels.includes('B1');
        if (cbB2) cbB2.checked = savedLevels.includes('B2');
        if (cbC1) cbC1.checked = savedLevels.includes('C1');
        if (cbC2) cbC2.checked = savedLevels.includes('C2');
        
        if (inputVol && volDisp) {
            const possibleVolumes = getPossibleVolumes();
            const minVol = possibleVolumes[0];
            const maxVol = possibleVolumes[possibleVolumes.length - 1];
            
            let isUniformStep = true;
            const firstDiff = possibleVolumes.length > 1 ? possibleVolumes[1] - possibleVolumes[0] : 1;
            for (let i = 1; i < possibleVolumes.length; i++) {
                if (possibleVolumes[i] - possibleVolumes[i - 1] !== firstDiff) {
                    isUniformStep = false;
                    break;
                }
            }

            inputVol.min = minVol;
            inputVol.max = maxVol;
            inputVol.step = isUniformStep ? firstDiff : 1;

            let targetVol = parseInt(lastVol, 10);
            if (isNaN(targetVol) || !possibleVolumes.includes(targetVol)) {
                targetVol = possibleVolumes.includes(20) ? 20 : maxVol;
            }
            inputVol.value = targetVol;
            inputVol.dataset.val = targetVol;

            const updateVolText = (v) => {
                const lang = getAppLanguage();
                const suffix = lang === 'fr' ? 'mots' : (lang === 'es' ? 'palabras' : (lang === 'de' ? 'Wörter' : 'words'));
                volDisp.textContent = `${v} ${suffix}`;
            };
            updateVolText(targetVol);
            
            inputVol.addEventListener('input', (e) => {
                let chosen = parseInt(e.target.value, 10);
                if (!isUniformStep) {
                    chosen = possibleVolumes.reduce((prev, curr) => 
                        Math.abs(curr - chosen) < Math.abs(prev - chosen) ? curr : prev
                    );
                    inputVol.value = chosen;
                }
                inputVol.dataset.val = chosen;
                updateVolText(chosen);
                localStorage.setItem('voc_last_vol', chosen.toString());
            });
        }

        // Mode d'entraînement & Mise à jour dynamique de la description
        const savedModeRadio = document.querySelector(`input[name="drill-mode"][value="${lastMode}"]`);
        if (savedModeRadio) {
            savedModeRadio.checked = true;
        }

        function updateModeDescription() {
            const modeChecked = document.querySelector('input[name="drill-mode"]:checked');
            const modeDescEl = document.getElementById('mode-description');
            if (!modeChecked || !modeDescEl) return;
            const mode = modeChecked.value;
            const lang = getAppLanguage();
            const descKey = `mode_desc_${mode}`;
            if (translations[lang] && translations[lang][descKey]) {
                modeDescEl.textContent = translations[lang][descKey];
            }
        }

        const modeRadios = document.querySelectorAll('input[name="drill-mode"]');
        modeRadios.forEach(radio => {
            radio.addEventListener('change', () => {
                updateModeDescription();
                localStorage.setItem('voc_last_mode', radio.value);
            });
        });
        updateModeDescription();

        if (btnStart) {
            function updateAvailableCount() {
                const src = selectSrc ? selectSrc.value : 'fr';
                const tgt = selectTgt ? selectTgt.value : 'en';
                const introEl = document.getElementById('home-intro-text');
                const remainingEl = document.getElementById('home-remaining-text');
                if (!introEl || !remainingEl) return;
                
                const lang = getAppLanguage();
                
                // 1. Sentence with total count
                const totalText = translations[lang].subtitle_home_intro
                    .replace('{total}', `<span style="font-weight: bold; color: var(--primary-color);">${vocabulary.length}</span>`);
                introEl.innerHTML = totalText;
                
                // 2. Sentence with remaining count depending on language pair selection
                if (src === tgt) {
                    remainingEl.innerHTML = '';
                    return;
                }
                
                let count = 0;
                const getSelectedLevels = () => {
                    const levels = [];
                    if (document.getElementById('drill-level-a1')?.checked) levels.push('A1');
                    if (document.getElementById('drill-level-a2')?.checked) levels.push('A2');
                    if (document.getElementById('drill-level-b1')?.checked) levels.push('B1');
                    if (document.getElementById('drill-level-b2')?.checked) levels.push('B2');
                    if (document.getElementById('drill-level-c1')?.checked) levels.push('C1');
                    if (document.getElementById('drill-level-c2')?.checked) levels.push('C2');
                    return levels.length > 0 ? levels : ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
                };
                const selectedLevels = getSelectedLevels();
                
                vocabulary.forEach(w => {
                    const status = getWordStatus(src, tgt, w.id);
                    if (status !== 'validé' && status !== 'ignoré' && selectedLevels.includes(w.level)) count++;
                });
                
                const remainingText = translations[lang].subtitle_home_remaining
                    .replace('{remaining}', `<span style="font-weight: bold; color: var(--primary-color);">${count}</span>`);
                remainingEl.innerHTML = remainingText;
            }

            if (selectSrc) selectSrc.addEventListener('change', updateAvailableCount);
            if (selectTgt) selectTgt.addEventListener('change', updateAvailableCount);
            if (document.getElementById('drill-level-a1')) document.getElementById('drill-level-a1').addEventListener('change', updateAvailableCount);
            if (document.getElementById('drill-level-a2')) document.getElementById('drill-level-a2').addEventListener('change', updateAvailableCount);
            if (document.getElementById('drill-level-b1')) document.getElementById('drill-level-b1').addEventListener('change', updateAvailableCount);
            if (document.getElementById('drill-level-b2')) document.getElementById('drill-level-b2').addEventListener('change', updateAvailableCount);
            if (document.getElementById('drill-level-c1')) document.getElementById('drill-level-c1').addEventListener('change', updateAvailableCount);
            if (document.getElementById('drill-level-c2')) document.getElementById('drill-level-c2').addEventListener('change', updateAvailableCount);
            updateAvailableCount();

            // Empêcher les doublons d'écouteurs si la vue est rechargée
            const newBtn = btnStart.cloneNode(true);
            btnStart.parentNode.replaceChild(newBtn, btnStart);
            
            newBtn.addEventListener('click', () => {
                const src = document.getElementById('select-lang-source').value;
                const tgt = document.getElementById('select-lang-target').value;
                const vol = parseInt(document.getElementById('input-volume').dataset.val || document.getElementById('input-volume').value, 10);
                const modeChecked = document.querySelector('input[name="drill-mode"]:checked');
                const mode = modeChecked ? modeChecked.value : 'smart';
                
                const selectedLevels = [];
                if (document.getElementById('drill-level-a1')?.checked) selectedLevels.push('A1');
                if (document.getElementById('drill-level-a2')?.checked) selectedLevels.push('A2');
                if (document.getElementById('drill-level-b1')?.checked) selectedLevels.push('B1');
                if (document.getElementById('drill-level-b2')?.checked) selectedLevels.push('B2');
                if (document.getElementById('drill-level-c1')?.checked) selectedLevels.push('C1');
                if (document.getElementById('drill-level-c2')?.checked) selectedLevels.push('C2');
                if (selectedLevels.length === 0) selectedLevels.push('A1', 'A2', 'B1', 'B2', 'C1', 'C2');
                
                if (src === tgt) {
                    alert("Les deux langues doivent être différentes.");
                    return;
                }

                // Sauvegarder les langues sélectionnées
                localStorage.setItem('voc_last_src', src);
                localStorage.setItem('voc_last_tgt', tgt);
                localStorage.setItem('voc_last_vol', vol);
                localStorage.setItem('voc_last_mode', mode);
                localStorage.setItem('drill_levels', JSON.stringify(selectedLevels));

                renderView('drill');
                initDrillSession(src, tgt, vol, selectedLevels, mode);
            });
        }

        const btnPlacementTest = document.getElementById('btn-open-placement-test');
        if (btnPlacementTest) {
            btnPlacementTest.onclick = () => {
                const selectSrc = document.getElementById('select-lang-source');
                const selectTgt = document.getElementById('select-lang-target');
                const src = selectSrc ? selectSrc.value : (localStorage.getItem('voc_last_src') || 'fr');
                const tgt = selectTgt ? selectTgt.value : (localStorage.getItem('voc_last_tgt') || 'en');
                localStorage.setItem('voc_last_src', src);
                localStorage.setItem('voc_last_tgt', tgt);
                startPlacementTest(src, tgt);
            };
        }
    } else if (viewId === 'drill') {
        const inputEl = document.getElementById('drill-input');
        const btnFlip = document.getElementById('btn-flip-lang');
        const btnQuit = document.getElementById('btn-quit-session');
        const flashcard = document.querySelector('.flashcard');

        if (inputEl) {
            inputEl.addEventListener('keydown', handleDrillKeydown);
            
            document.onkeydown = (e) => {
                handleDrillKeydown(e);
            };
        }
        
        if (flashcard) {
            flashcard.onclick = (e) => {
                // Sur mobile, le clic simule Entrée pour avancer à un doigt
                const isMobile = window.innerWidth <= 640;
                if (!isMobile) return;

                // Ne pas intercepter les clics sur les inputs ou boutons d'actions
                if (e.target.closest('input') || e.target.closest('button') || e.target.closest('.btn-drill-action')) {
                    return;
                }
                
                const fakeEvent = {
                    key: 'Enter',
                    preventDefault: () => {},
                    stopPropagation: () => {}
                };
                handleDrillKeydown(fakeEvent);
            };
        }
        
        if (btnQuit) {
            btnQuit.addEventListener('click', () => renderView('home'));
        }
    } else if (viewId === 'progress') {
        initProgressView();
    } else if (viewId === 'stats') {
        initStatsView();
    } else if (viewId === 'certs') {
        initCertsView();
    }
}

// --- Gestion de la vue Progression ---
let currentProgPair = '';
let currentStatsPair = '';
let currentSortCol = 'source';
let currentSortAsc = true;

const PROG_FILTERS_KEY = 'drillflow_prog_filters';

function getSavedProgressFilters() {
    try {
        const raw = localStorage.getItem(PROG_FILTERS_KEY);
        if (raw) return JSON.parse(raw);
    } catch (e) {}
    return null;
}

function saveProgressFilters() {
    const types = ['nom', 'verbe', 'adjectif', 'adverbe', 'conjonction'];
    const levels = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];
    const statuses = ['valide', 'actif', 'ignore'];

    const data = {
        types: {},
        levels: {},
        statuses: {}
    };

    types.forEach(t => {
        const el = document.getElementById(`filter-type-${t}`);
        if (el) data.types[t] = el.checked;
    });
    levels.forEach(l => {
        const el = document.getElementById(`filter-level-${l}`);
        if (el) data.levels[l] = el.checked;
    });
    statuses.forEach(s => {
        const el = document.getElementById(`filter-status-${s}`);
        if (el) data.statuses[s] = el.checked;
    });

    try {
        localStorage.setItem(PROG_FILTERS_KEY, JSON.stringify(data));
    } catch (e) {}
}

function initProgressView() {
    const gatedState = document.getElementById('progress-gated-state');
    const emptyState = document.getElementById('progress-empty-state');
    const content = document.getElementById('progress-content');
    
    // Gating check
    if (!getCurrentUser()) {
        gatedState.style.display = 'flex';
        emptyState.style.display = 'none';
        content.style.display = 'none';
        
        // Wire auth buttons
        document.querySelectorAll('.btn-open-auth-modal').forEach(btn => {
            btn.onclick = () => document.getElementById('auth-modal')?.classList.remove('hidden');
        });
        return;
    }
    
    gatedState.style.display = 'none';
    content.style.display = 'block';
    const progress = loadProgress();
    const usedPairs = Object.keys(progress).filter(key => {
        return progress[key] && typeof progress[key] === 'object' && Object.keys(progress[key]).length > 0;
    });

    if (usedPairs.length === 0) {
        if (emptyState) emptyState.style.display = 'flex';
        if (content) content.style.display = 'none';
        
        const btnGo = document.getElementById('btn-go-to-training');
        if (btnGo) {
            btnGo.onclick = () => renderView('home');
        }
        return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (content) content.style.display = 'block';

    const pairSelect = document.getElementById('prog-lang-pair');
    if (pairSelect) {
        pairSelect.innerHTML = '';
        const lang = getAppLanguage();
        usedPairs.forEach(pair => {
            const [src, tgt] = pair.split('-');
            const opt = document.createElement('option');
            opt.value = pair;
            const validatedCount = getValidatedCount(src, tgt);
            opt.textContent = `${getLangName(src)} ➔ ${getLangName(tgt)} (${formatValidatedCount(validatedCount, lang)})`;
            pairSelect.appendChild(opt);
        });

        // Définir la paire sélectionnée par défaut sur la dernière paire enregistrée ou dernière session ou fr-en
        const savedProgPair = localStorage.getItem('prog_last_pair');
        const lastSrc = localStorage.getItem('voc_last_src') || 'fr';
        const lastTgt = localStorage.getItem('voc_last_tgt') || 'en';
        const defaultPair = `${lastSrc}-${lastTgt}`;

        if (savedProgPair && usedPairs.includes(savedProgPair)) {
            currentProgPair = savedProgPair;
            pairSelect.value = currentProgPair;
        } else if (usedPairs.includes(currentProgPair)) {
            pairSelect.value = currentProgPair;
        } else if (usedPairs.includes(defaultPair)) {
            currentProgPair = defaultPair;
            pairSelect.value = currentProgPair;
        } else {
            currentProgPair = usedPairs[0];
            pairSelect.value = currentProgPair;
        }

        pairSelect.onchange = (e) => {
            currentProgPair = e.target.value;
            localStorage.setItem('prog_last_pair', currentProgPair);
            renderProgressTable();
        };
    }

    // Attacher les events de tri
    const sortHeaders = document.querySelectorAll('.sortable');
    sortHeaders.forEach(th => {
        th.onclick = () => {
            const sortKey = th.dataset.sort;
            if (currentSortCol === sortKey) {
                currentSortAsc = !currentSortAsc;
            } else {
                currentSortCol = sortKey;
                currentSortAsc = true;
            }
            renderProgressTable();
        };
    });

    const searchInput = document.getElementById('prog-search');
    if (searchInput) {
        searchInput.value = '';
        searchInput.oninput = () => {
            renderProgressTable();
        };
    }

    // Gestion des popovers multi-select
    const filterDropdowns = [
        { btnId: 'btn-filter-types', popId: 'popover-filter-types' },
        { btnId: 'btn-filter-levels', popId: 'popover-filter-levels' },
        { btnId: 'btn-filter-statuses', popId: 'popover-filter-statuses' }
    ];

    filterDropdowns.forEach(({ btnId, popId }) => {
        const btnEl = document.getElementById(btnId);
        const popEl = document.getElementById(popId);
        if (btnEl && popEl) {
            btnEl.onclick = (e) => {
                e.stopPropagation();
                const willOpen = popEl.classList.contains('hidden');
                // Fermer les autres popovers
                filterDropdowns.forEach(d => {
                    document.getElementById(d.popId)?.classList.add('hidden');
                    document.getElementById(d.btnId)?.classList.remove('active');
                });
                if (willOpen) {
                    popEl.classList.remove('hidden');
                    btnEl.classList.add('active');
                }
            };
            popEl.onclick = (e) => {
                e.stopPropagation(); // Éviter la fermeture au clic dans la boîte
            };
        }
    });

    // Fermer les dropdowns lors d'un clic en dehors
    document.addEventListener('click', () => {
        filterDropdowns.forEach(d => {
            document.getElementById(d.popId)?.classList.add('hidden');
            document.getElementById(d.btnId)?.classList.remove('active');
        });
    });

    function updateFilterCounts() {
        const types = ['nom', 'verbe', 'adjectif', 'adverbe', 'conjonction'];
        const levels = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];
        const statuses = ['valide', 'actif', 'ignore'];

        const checkedTypes = types.filter(t => document.getElementById(`filter-type-${t}`)?.checked).length;
        const checkedLevels = levels.filter(l => document.getElementById(`filter-level-${l}`)?.checked).length;
        const checkedStatuses = statuses.filter(s => document.getElementById(`filter-status-${s}`)?.checked).length;

        const countTypesEl = document.getElementById('count-filter-types');
        const countLevelsEl = document.getElementById('count-filter-levels');
        const countStatusesEl = document.getElementById('count-filter-statuses');

        if (countTypesEl) countTypesEl.textContent = checkedTypes === types.length ? `${types.length}` : `${checkedTypes}/${types.length}`;
        if (countLevelsEl) countLevelsEl.textContent = checkedLevels === levels.length ? `${levels.length}` : `${checkedLevels}/${levels.length}`;
        if (countStatusesEl) countStatusesEl.textContent = checkedStatuses === statuses.length ? `${statuses.length}` : `${checkedStatuses}/${statuses.length}`;
    }

    const savedFilters = getSavedProgressFilters();

    ['nom', 'verbe', 'adjectif', 'adverbe', 'conjonction'].forEach(type => {
        const cb = document.getElementById(`filter-type-${type}`);
        if (cb) {
            if (savedFilters?.types && savedFilters.types[type] !== undefined) {
                cb.checked = !!savedFilters.types[type];
            } else {
                cb.checked = true;
            }
            cb.onchange = () => {
                saveProgressFilters();
                updateFilterCounts();
                renderProgressTable();
            };
        }
    });

    // Attach listeners for word level filters
    ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'].forEach(level => {
        const checkbox = document.getElementById(`filter-level-${level}`);
        if (checkbox) {
            if (savedFilters?.levels && savedFilters.levels[level] !== undefined) {
                checkbox.checked = !!savedFilters.levels[level];
            } else {
                checkbox.checked = true;
            }
            checkbox.onchange = () => {
                saveProgressFilters();
                updateFilterCounts();
                renderProgressTable();
            };
        }
    });

    // Attach listeners for word status filters
    ['valide', 'actif', 'ignore'].forEach(statusKey => {
        const checkbox = document.getElementById(`filter-status-${statusKey}`);
        if (checkbox) {
            if (savedFilters?.statuses && savedFilters.statuses[statusKey] !== undefined) {
                checkbox.checked = !!savedFilters.statuses[statusKey];
            } else {
                checkbox.checked = true;
            }
            checkbox.onchange = () => {
                saveProgressFilters();
                updateFilterCounts();
                renderProgressTable();
            };
        }
    });

    updateFilterCounts();
    renderProgressTable();
}

function renderProgressTable() {
    const tableBody = document.getElementById('prog-table-body');
    if (!tableBody || !currentProgPair) return;

    const [src, tgt] = currentProgPair.split('-');
    const searchInput = document.getElementById('prog-search');
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

    tableBody.innerHTML = '';

    const filterNom = document.getElementById('filter-type-nom') ? document.getElementById('filter-type-nom').checked : true;
    const filterVerbe = document.getElementById('filter-type-verbe') ? document.getElementById('filter-type-verbe').checked : true;
    const filterAdjectif = document.getElementById('filter-type-adjectif') ? document.getElementById('filter-type-adjectif').checked : true;
    const filterAdverbe = document.getElementById('filter-type-adverbe') ? document.getElementById('filter-type-adverbe').checked : true;
    const filterConjonction = document.getElementById('filter-type-conjonction') ? document.getElementById('filter-type-conjonction').checked : true;

    const filterA1 = document.getElementById('filter-level-a1') ? document.getElementById('filter-level-a1').checked : true;
    const filterA2 = document.getElementById('filter-level-a2') ? document.getElementById('filter-level-a2').checked : true;
    const filterB1 = document.getElementById('filter-level-b1') ? document.getElementById('filter-level-b1').checked : true;
    const filterB2 = document.getElementById('filter-level-b2') ? document.getElementById('filter-level-b2').checked : true;
    const filterC1 = document.getElementById('filter-level-c1') ? document.getElementById('filter-level-c1').checked : true;
    const filterC2 = document.getElementById('filter-level-c2') ? document.getElementById('filter-level-c2').checked : true;

    const filterStatusValide = document.getElementById('filter-status-valide') ? document.getElementById('filter-status-valide').checked : true;
    const filterStatusActif = document.getElementById('filter-status-actif') ? document.getElementById('filter-status-actif').checked : true;
    const filterStatusIgnore = document.getElementById('filter-status-ignore') ? document.getElementById('filter-status-ignore').checked : true;

    const filtered = vocabulary.filter(word => {
        const stats = getWordStats(src, tgt, word.id);
        const status = getWordStatus(src, tgt, word.id);
        if ((!stats || !stats.attempts || stats.attempts === 0) && status !== 'ignoré') return false;

        // Status filters
        if (status === 'validé' && !filterStatusValide) return false;
        if (status === 'actif' && !filterStatusActif) return false;
        if (status === 'ignoré' && !filterStatusIgnore) return false;

        if (word.type === 'nom' && !filterNom) return false;
        if (word.type === 'verbe' && !filterVerbe) return false;
        if (word.type === 'adjectif' && !filterAdjectif) return false;
        if (word.type === 'adverbe' && !filterAdverbe) return false;
        if (word.type === 'conjonction' && !filterConjonction) return false;
        
        if (word.level === 'A1' && !filterA1) return false;
        if (word.level === 'A2' && !filterA2) return false;
        if (word.level === 'B1' && !filterB1) return false;
        if (word.level === 'B2' && !filterB2) return false;
        if (word.level === 'C1' && !filterC1) return false;
        if (word.level === 'C2' && !filterC2) return false;

        const srcText = (word[src] || '').toLowerCase();
        const tgtText = (word[tgt] || '').toLowerCase();
        return srcText.includes(query) || tgtText.includes(query);
    });

    // Tri des données
    filtered.sort((a, b) => {
        let valA, valB;
        if (currentSortCol === 'source') { valA = (a[src]||'').toLowerCase(); valB = (b[src]||'').toLowerCase(); }
        else if (currentSortCol === 'target') { valA = (a[tgt]||'').toLowerCase(); valB = (b[tgt]||'').toLowerCase(); }
        else if (currentSortCol === 'type') { valA = a.type || ''; valB = b.type || ''; }
        else if (currentSortCol === 'level') { valA = a.level || ''; valB = b.level || ''; }
        else if (currentSortCol === 'attempts') { 
            valA = getWordStats(src, tgt, a.id).attempts || 0; 
            valB = getWordStats(src, tgt, b.id).attempts || 0; 
        }
        else if (currentSortCol === 'status') { 
            valA = getWordStatus(src, tgt, a.id); 
            valB = getWordStatus(src, tgt, b.id); 
        }
        
        if (valA < valB) return currentSortAsc ? -1 : 1;
        if (valA > valB) return currentSortAsc ? 1 : -1;
        return 0;
    });

    // Mise à jour des icônes de tri
    document.querySelectorAll('.sortable').forEach(th => {
        const icon = th.querySelector('.sort-icon');
        if (icon) {
            if (th.dataset.sort === currentSortCol) {
                icon.textContent = currentSortAsc ? ' ▲' : ' ▼';
            } else {
                icon.textContent = '';
            }
        }
    });

    // Mise à jour du compteur de mots selon filtres
    const countEl = document.getElementById('prog-filtered-count');
    if (countEl) {
        const lang = getAppLanguage();
        countEl.innerHTML = formatFilteredCount(filtered.length, lang);
    }

    if (filtered.length === 0) {
        const lang = getAppLanguage();
        const emptyMsg = translations[lang].search_no_results;
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-secondary); padding: 2rem;">${emptyMsg}</td></tr>`;
        return;
    }

    const btnToggleAll = document.getElementById('btn-toggle-all-visible');
    if (btnToggleAll) {
        btnToggleAll.onclick = () => {
            const lang = getAppLanguage();
            const confirmMsg = translations[lang].confirm_reset_all;
            if (confirm(confirmMsg)) {
                filtered.forEach(word => {
                    setWordStatus(src, tgt, word.id, 'actif');
                });
                renderProgressTable();
            }
        };
    }

    filtered.forEach(word => {
        const tr = document.createElement('tr');
        const lang = getAppLanguage();
        const stats = getWordStats(src, tgt, word.id);
        const status = getWordStatus(src, tgt, word.id);
        const attempts = stats.attempts || 0;
        const attemptsText = status === 'ignoré' ? '-' : (attempts > 0 ? attempts : '-');
        const typeLabel = word.type ? (translations[lang][`type_${word.type}`] || word.type) : '-';
        const ignoreLabel = translations[lang].status_ignored || 'Ignoré';

        let badgeBg = 'rgba(255,255,255,0.1)';
        let badgeColor = 'inherit';
        if (word.level === 'A1') { badgeBg = 'rgba(59, 130, 246, 0.2)'; badgeColor = '#3b82f6'; }
        if (word.level === 'A2') { badgeBg = 'rgba(6, 182, 212, 0.2)'; badgeColor = '#06b6d4'; }
        if (word.level === 'B1') { badgeBg = 'rgba(16, 185, 129, 0.2)'; badgeColor = '#10b981'; }
        if (word.level === 'B2') { badgeBg = 'rgba(234, 179, 8, 0.2)'; badgeColor = '#eab308'; }
        if (word.level === 'C1') { badgeBg = 'rgba(249, 115, 22, 0.2)'; badgeColor = '#f97316'; }
        if (word.level === 'C2') { badgeBg = 'rgba(168, 85, 247, 0.2)'; badgeColor = '#a855f7'; }

        // --- 1. Cellules Desktop (Tableau standard 6 colonnes pour écrans larges) ---
        const tdSrc = document.createElement('td');
        tdSrc.className = 'col-desktop col-source';
        tdSrc.textContent = word[src];
        tdSrc.style.fontWeight = '600';
        tr.appendChild(tdSrc);

        const tdTgt = document.createElement('td');
        tdTgt.className = 'col-desktop col-target';
        tdTgt.textContent = word[tgt];
        tr.appendChild(tdTgt);

        const tdType = document.createElement('td');
        tdType.className = 'col-desktop col-type';
        if (word.type) {
            tdType.innerHTML = `<span class="type-badge ${word.type}" style="font-size: 0.65rem; padding: 0.15rem 0.5rem; text-transform: uppercase;">${typeLabel}</span>`;
        } else {
            tdType.textContent = '-';
        }
        tr.appendChild(tdType);

        const tdLevel = document.createElement('td');
        tdLevel.className = 'col-desktop col-level';
        tdLevel.style.textAlign = 'center';
        if (word.level) {
            tdLevel.innerHTML = `<span class="type-badge" style="font-size: 0.65rem; padding: 0.15rem 0.45rem; background: ${badgeBg}; color: ${badgeColor}; font-weight: 600;">${word.level}</span>`;
        } else {
            tdLevel.textContent = '-';
        }
        tr.appendChild(tdLevel);

        const tdAttempts = document.createElement('td');
        tdAttempts.className = 'col-desktop col-attempts';
        tdAttempts.style.textAlign = 'center';
        tdAttempts.style.fontWeight = '600';
        tdAttempts.style.color = 'var(--text-secondary)';
        tdAttempts.textContent = attemptsText;
        tr.appendChild(tdAttempts);

        const tdStatus = document.createElement('td');
        tdStatus.className = `col-desktop status-cell ${status === 'validé' ? 'valide' : (status === 'actif' ? 'actif' : '')}`;
        if (status === 'validé') {
            tdStatus.textContent = '✓';
        } else if (status === 'ignoré') {
            tdStatus.innerHTML = `<span style="font-size: 0.7rem; padding: 0.15rem 0.45rem; border-radius: 4px; background: rgba(255,255,255,0.08); color: var(--text-secondary); font-weight: 500;">${ignoreLabel}</span>`;
        } else {
            tdStatus.textContent = '\u00A0';
        }
        tr.appendChild(tdStatus);

        // --- 2. Cellule Mobile (Approche A : Format Carte à 2 étages, zéro troncature) ---
        const tdMobile = document.createElement('td');
        tdMobile.className = 'col-mobile';
        tdMobile.setAttribute('colspan', '6');

        let statusMobileBadge = '';
        if (status === 'validé') {
            statusMobileBadge = `<span style="color: var(--success-color); font-weight: 800; font-size: 1.25rem; line-height: 1;">✓</span>`;
        } else if (status === 'ignoré') {
            statusMobileBadge = `<span style="font-size: 0.7rem; padding: 0.15rem 0.45rem; border-radius: 4px; background: rgba(255,255,255,0.08); color: var(--text-secondary); font-weight: 500;">${ignoreLabel}</span>`;
        }

        const attemptsLabel = attempts > 0 ? `${attempts} ${translations[lang].th_attempts ? translations[lang].th_attempts.toLowerCase() : 'tentatives'}` : '';

        tdMobile.innerHTML = `
            <div class="mobile-card-top">
                <div class="mobile-card-words">
                    <div class="mobile-word-source">${word[src]}</div>
                    <div class="mobile-word-target">${word[tgt]}</div>
                </div>
                <div class="mobile-card-status">${statusMobileBadge}</div>
            </div>
            <div class="mobile-card-bottom">
                ${word.type ? `<span class="type-badge ${word.type}" style="font-size: 0.65rem; padding: 0.15rem 0.45rem; text-transform: uppercase;">${typeLabel}</span>` : ''}
                ${word.level ? `<span class="type-badge" style="font-size: 0.65rem; padding: 0.15rem 0.45rem; background: ${badgeBg}; color: ${badgeColor}; font-weight: 600;">${word.level}</span>` : ''}
                ${attemptsLabel ? `<span class="mobile-attempts">${attemptsLabel}</span>` : ''}
            </div>
        `;
        tr.appendChild(tdMobile);

        tableBody.appendChild(tr);
    });
}

// --- Gestion de la vue Statistiques ---
function initStatsView() {
    const gatedState = document.getElementById('stats-gated-state');
    const emptyState = document.getElementById('stats-empty-state');
    const content = document.getElementById('stats-content');
    const pairSelect = document.getElementById('stats-lang-pair');
    
    // Gating check
    if (!getCurrentUser()) {
        if (gatedState) gatedState.style.display = 'flex';
        if (emptyState) emptyState.style.display = 'none';
        if (content) content.style.display = 'none';
        
        // Wire auth buttons
        document.querySelectorAll('.btn-open-auth-modal').forEach(btn => {
            btn.onclick = () => document.getElementById('auth-modal')?.classList.remove('hidden');
        });
        return;
    }
    
    if (gatedState) gatedState.style.display = 'none';
    const progress = loadProgress();
    const usedPairs = Object.keys(progress).filter(key => {
        return progress[key] && typeof progress[key] === 'object' && Object.keys(progress[key]).length > 0;
    });

    if (usedPairs.length === 0) {
        if (emptyState) emptyState.style.display = 'flex';
        if (content) content.style.display = 'none';

        const btnGo = document.getElementById('btn-stats-go-to-training');
        if (btnGo) {
            btnGo.onclick = () => renderView('home');
        }
        return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (content) content.style.display = 'block';

    // Remplir le sélecteur de paire de langues
    if (pairSelect) {
        pairSelect.innerHTML = '';
        const lang = getAppLanguage();
        usedPairs.forEach(pair => {
            const [src, tgt] = pair.split('-');
            const opt = document.createElement('option');
            opt.value = pair;
            const validatedCount = getValidatedCount(src, tgt);
            opt.textContent = `${getLangName(src)} ➔ ${getLangName(tgt)} (${formatValidatedCount(validatedCount, lang)})`;
            pairSelect.appendChild(opt);
        });

        // Définir la paire sélectionnée par défaut
        const lastSrc = localStorage.getItem('voc_last_src') || 'fr';
        const lastTgt = localStorage.getItem('voc_last_tgt') || 'en';
        const defaultPair = `${lastSrc}-${lastTgt}`;

        if (usedPairs.includes(defaultPair)) {
            currentStatsPair = defaultPair;
            pairSelect.value = currentStatsPair;
        } else if (currentStatsPair && usedPairs.includes(currentStatsPair)) {
            pairSelect.value = currentStatsPair;
        } else if (currentProgPair && usedPairs.includes(currentProgPair)) {
            currentStatsPair = currentProgPair;
            pairSelect.value = currentStatsPair;
        } else {
            currentStatsPair = usedPairs[0];
            pairSelect.value = currentStatsPair;
        }

        pairSelect.onchange = (e) => {
            currentStatsPair = e.target.value;
            renderSelectedPairStats(currentStatsPair);
        };
    }

    renderSelectedPairStats(currentStatsPair);
}

function getCefrTrackFillPct(pts) {
    const levels = CEFR_CONFIG.levels;
    const thresholds = CEFR_CONFIG.thresholds;
    if (pts >= thresholds.C2) return 100;
    if (pts <= thresholds.A1) {
        // Avant ou à A1, la barre commence à la bulle A1 (0%)
        return 0;
    }
    for (let i = 0; i < levels.length - 1; i++) {
        const currentT = thresholds[levels[i]];
        const nextT = thresholds[levels[i + 1]];
        if (pts >= currentT && pts < nextT) {
            const fraction = (pts - currentT) / (nextT - currentT);
            return (i * 20) + (fraction * 20);
        }
    }
    return 100;
}

function animatePointsCounter(elem, startVal, endVal, duration = 2000, onProgress = null, onComplete = null) {
    if (!elem) return;
    const startTime = performance.now();
    elem.classList.add('points-counter-animating');

    function step(now) {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / duration);
        // Easing fluide et progressif permettant d'apprécier chaque incrément
        const ease = 1 - Math.pow(1 - progress, 2);
        const currentVal = Math.round(startVal + (endVal - startVal) * ease);
        elem.textContent = currentVal.toLocaleString();
        if (onProgress) onProgress(currentVal);

        if (progress < 1) {
            requestAnimationFrame(step);
        } else {
            elem.textContent = endVal.toLocaleString();
            elem.classList.remove('points-counter-animating');
            if (onComplete) onComplete();
        }
    }
    requestAnimationFrame(step);
}

function renderSelectedPairStats(pair) {
    const container = document.getElementById('stats-container');
    if (!container || !pair) return;

    const [src, tgt] = pair.split('-');
    let validated = 0;
    const validatedByLevel = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
    const totalByLevel = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };

    vocabulary.forEach(word => {
        const status = getWordStatus(src, tgt, word.id);
        if (status === 'ignoré') return;
        if (totalByLevel[word.level] !== undefined) {
            totalByLevel[word.level]++;
        }
        if (status === 'validé') {
            validated++;
            if (validatedByLevel[word.level] !== undefined) {
                validatedByLevel[word.level]++;
            }
        }
    });

    const total = Object.values(totalByLevel).reduce((a, b) => a + b, 0);
    const restant = total - validated;
    const percentage = total > 0 ? Math.round((validated / total) * 100) : 0;

    const lang = getAppLanguage();
    const points = calculateCefrPoints(validatedByLevel);
    const progDetails = getCefrProgressDetails(points);
    const pointsBreakdown = getPointsBreakdownByLevel(validatedByLevel);

    // Détection de l'augmentation du score depuis la dernière consultation
    const storageKey = `drillflow_prev_cefr_points_${pair}`;
    const prevPointsRaw = localStorage.getItem(storageKey);
    let hasIncreased = false;
    let startPoints = points;

    if (prevPointsRaw !== null) {
        const prevPoints = parseInt(prevPointsRaw, 10);
        if (!isNaN(prevPoints) && points > prevPoints) {
            hasIncreased = true;
            startPoints = prevPoints;
        }
    } else {
        // Première visite : on enregistre le score actuel comme point de référence
        localStorage.setItem(storageKey, points.toString());
    }

    const levelColors = CEFR_CONFIG.colors;
    const currentLvl = progDetails.currentLevel;
    const currentLvlColor = levelColors[currentLvl] || { bg: 'rgba(99,102,241,0.15)', text: '#6366f1', border: '#6366f1' };
    const levelDescKey = `cefr_desc_${currentLvl}`;
    const levelDesc = (translations[lang] && translations[lang][levelDescKey]) || '';

    // Calcul du pourcentage de remplissage continu pour le stepper
    const levels = CEFR_CONFIG.levels;
    const thresholds = CEFR_CONFIG.thresholds;
    const trackFillPct = Math.min(100, Math.max(0, Math.round(getCefrTrackFillPct(points))));
    const targetFillStyleWidth = trackFillPct > 0 ? `calc(${trackFillPct}% + 18px)` : '0%';

    const startTrackFillPct = hasIncreased ? Math.min(100, Math.max(0, Math.round(getCefrTrackFillPct(startPoints)))) : 0;
    const startFillStyleWidth = startTrackFillPct > 0 ? `calc(${startTrackFillPct}% + 18px)` : '0%';

    // Calcul du pourcentage du palier en cours
    const prevTierPoints = startPoints - progDetails.prevThreshold;
    const tierRange = Math.max(1, progDetails.nextThreshold - progDetails.prevThreshold);
    const startTierPct = hasIncreased
        ? (progDetails.isMax ? 100 : Math.min(100, Math.max(0, Math.round((prevTierPoints / tierRange) * 100))))
        : 0;

    // Texte d'objectif prochain palier
    let nextMilestoneHtml = '';
    if (progDetails.isMax) {
        nextMilestoneHtml = `<span style="color: var(--success-color); font-weight: 700;">${translations[lang].stat_cefr_max}</span>`;
    } else {
        const startNeeded = hasIncreased ? Math.max(0, progDetails.nextThreshold - startPoints) : progDetails.pointsNeeded;
        const toGoText = (translations[lang].stat_cefr_to_go || '{points} pts restants pour {level}')
            .replace('{points}', `<strong id="cefr-points-needed">${startNeeded}</strong>`)
            .replace('{level}', `<strong>${progDetails.nextLevel}</strong>`);
        nextMilestoneHtml = `<span style="color: var(--text-secondary);">${translations[lang].stat_cefr_next || 'Objectif :'} <span style="color: var(--text-primary); font-weight: 600;">${progDetails.nextLevel} (${progDetails.nextThreshold} pts)</span> &bull; ${toGoText}</span>`;
    }

    // Bulles des paliers
    const stepsHtml = levels.map((lvl) => {
        const thresh = thresholds[lvl];
        const isCompleted = points >= thresh;
        const wasCompleted = startPoints >= thresh;
        const isNewlyCompleted = hasIncreased && isCompleted && !wasCompleted;
        const isActive = !isCompleted && (progDetails.nextLevel === lvl);
        const stateClass = isCompleted ? (isNewlyCompleted ? 'completed newly-completed' : 'completed') : (isActive ? 'active' : '');
        const badgeContent = isCompleted ? `${lvl} ✓` : lvl;

        return `
            <div class="cefr-step-item ${stateClass}">
                <div class="cefr-step-bubble">${badgeContent}</div>
                <span class="cefr-step-label">${lvl}</span>
                <span class="cefr-step-threshold">${thresh} pts</span>
            </div>
        `;
    }).join('');

    // Lignes détaillées par niveau CECRL
    const levelRowsHtml = levels.map(lvl => {
        const valLvl = validatedByLevel[lvl];
        const totLvl = totalByLevel[lvl];
        const pctLvl = totLvl > 0 ? Math.round((valLvl / totLvl) * 100) : 0;
        const ptsLvl = pointsBreakdown[lvl];
        const mult = CEFR_CONFIG.multipliers[lvl];
        const color = levelColors[lvl];

        return `
            <div style="background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 10px; padding: 0.9rem 1.1rem; display: flex; flex-direction: column; gap: 0.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.6rem;">
                        <span class="type-badge" style="background: ${color.bg}; color: ${color.text}; font-weight: 800; font-size: 0.85rem; padding: 0.2rem 0.6rem; border-radius: 6px;">${lvl}</span>
                        <span style="font-weight: 600; font-size: 0.95rem; color: var(--text-primary);">${translations[lang][`cefr_desc_${lvl}`] || lvl}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <span style="font-size: 0.85rem; font-weight: 700; color: var(--primary-color); background: rgba(99, 102, 241, 0.08); padding: 0.2rem 0.55rem; border-radius: 6px;">
                            +${ptsLvl} ${translations[lang].stat_points_unit || 'pts'}
                        </span>
                        <span style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary);">${valLvl} / ${totLvl}</span>
                        <span style="color: var(--success-color); font-weight: 700; font-size: 0.85rem; min-width: 40px; text-align: right;">${pctLvl}%</span>
                    </div>
                </div>
                <div class="stat-progress-container" style="margin-top: 0.1rem; height: 6px;">
                    <div class="stat-progress-bar" data-target-width="${pctLvl}%" style="width: 0%; background: ${color.solid};"></div>
                </div>
                <div style="font-size: 0.75rem; color: var(--text-secondary); display: flex; justify-content: space-between;">
                    <span>${valLvl} mots &times; ${mult} pts/mot</span>
                    <span>${totLvl - valLvl} mots restants</span>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = `
        <!-- 1. CARTE DE PROGRESSION CECRL (GAMIFIÉE) -->
        <div class="cefr-card">
            <div class="cefr-header">
                <div>
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.25rem;">
                        <span class="cefr-level-badge-large" style="background: ${currentLvlColor.bg}; color: ${currentLvlColor.text}; border: 1px solid ${currentLvlColor.border};">
                            ${currentLvl}
                        </span>
                        <div>
                            <h2 style="margin: 0; font-size: 1.25rem; font-weight: 700; font-family: var(--font-heading); color: var(--text-primary);">
                                ${levelDesc || currentLvl}
                            </h2>
                            <div style="font-size: 0.82rem; color: var(--text-secondary);">
                                ${translations[lang].stat_cefr_current || 'Niveau atteint :'} <strong style="color: var(--text-primary);">${currentLvl}</strong>
                            </div>
                        </div>
                    </div>
                </div>
                <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; justify-content: center;">
                    <div style="display: inline-flex; align-items: baseline; justify-content: flex-end; gap: 0.35rem; position: relative;">
                        <div id="cefr-total-points" style="font-size: 1.85rem; font-weight: 800; font-family: var(--font-heading); color: var(--primary-color); line-height: 1.1;">
                            ${hasIncreased ? startPoints : 0}
                        </div>
                        <span style="font-size: 0.95rem; font-weight: 600; color: var(--text-secondary);">${translations[lang].stat_points_unit || 'pts'}</span>
                        ${hasIncreased ? `
                            <span class="points-gain-badge" id="cefr-points-gain-badge">
                                +${points - startPoints}
                            </span>
                        ` : ''}
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary); font-weight: 500; margin-top: 0.15rem;">
                        ${translations[lang].stat_cefr_points || 'Points de maîtrise'}
                    </div>
                </div>
            </div>

            <!-- Stepper Paliers A1 à C2 -->
            <div class="cefr-stepper-container">
                <div class="cefr-stepper-track-bg">
                    <div class="cefr-stepper-track-fill" style="width: ${startFillStyleWidth};"></div>
                </div>
                <div class="cefr-stepper-steps">
                    ${stepsHtml}
                </div>
            </div>

            <!-- Jauge de progression du palier en cours -->
            <div style="margin-top: 0.85rem; padding: 0.85rem 1.1rem; background: var(--bg-color); border: 1px solid var(--border-color); border-radius: 12px; display: flex; flex-direction: column; gap: 0.45rem;">
                <div style="display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; flex-wrap: wrap; gap: 0.4rem;">
                    <div>${nextMilestoneHtml}</div>
                    <div style="font-weight: 800; font-size: 0.9rem; color: ${currentLvlColor.text};">
                        ${progDetails.pctInTier}%
                    </div>
                </div>
                <div style="width: 100%; height: 9px; background: rgba(100, 116, 139, 0.18); border-radius: 999px; overflow: hidden;">
                    <div class="tier-progress-fill" style="width: ${startTierPct}%; height: 100%; background: linear-gradient(90deg, #3b82f6, #10b981); border-radius: 999px;"></div>
                </div>
            </div>

            <!-- Multiplicateurs info -->
            <div style="display: flex; justify-content: flex-end; align-items: center; padding-top: 0.5rem; border-top: 1px solid var(--border-color); font-size: 0.85rem;">
                <div style="font-size: 0.75rem; color: var(--text-secondary); background: rgba(0,0,0,0.03); padding: 0.35rem 0.65rem; border-radius: 6px;">
                    ${translations[lang].stat_cefr_multipliers_hint}
                </div>
            </div>
        </div>

        <!-- 2. CARTE DÉTAILLÉE DU VOCABULAIRE POUR LA PAIRE -->
        <div class="stat-card">
            <div class="stat-card-header">
                <div>
                    <span class="stat-pair-name">${getLangName(src)} ➔ ${getLangName(tgt)}</span>
                    <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.2rem;">
                        ${validated} / ${total} mots validés (${percentage}%) &bull; ${restant} restants
                    </div>
                </div>
                <span class="stat-percentage-badge">${percentage}%</span>
            </div>
            
            <div class="stat-body" style="gap: 0.75rem; margin-top: 0.5rem;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 0.75rem;">
                    ${levelRowsHtml}
                </div>
            </div>
        </div>
    `;

    // Déclencher les animations des jauges et compteurs
    const animStartVal = hasIncreased ? startPoints : 0;
    const animEndVal = points;
    const pointsDiff = Math.abs(animEndVal - animStartVal);
    const animDuration = hasIncreased
        ? Math.max(1800, Math.min(3000, 1600 + pointsDiff * 150))
        : 1400;

    requestAnimationFrame(() => {
        setTimeout(() => {
            const fillElem = container.querySelector('.cefr-stepper-track-fill');
            if (fillElem) {
                fillElem.style.transition = `width ${animDuration}ms cubic-bezier(0.25, 1, 0.5, 1)`;
                fillElem.style.width = targetFillStyleWidth;
            }
            const tierFill = container.querySelector('.tier-progress-fill');
            if (tierFill) {
                tierFill.style.transition = `width ${animDuration}ms cubic-bezier(0.25, 1, 0.5, 1)`;
                tierFill.style.width = `${progDetails.pctInTier}%`;
            }
            const levelBars = container.querySelectorAll('.stat-progress-bar[data-target-width]');
            levelBars.forEach(bar => {
                bar.style.transition = `width ${animDuration}ms cubic-bezier(0.25, 1, 0.5, 1)`;
                bar.style.width = bar.getAttribute('data-target-width');
            });
        }, 60);
    });

    const pointsElem = container.querySelector('#cefr-total-points');
    const neededElem = container.querySelector('#cefr-points-needed');
    if (pointsElem) {
        if (animEndVal > 0) {
            animatePointsCounter(pointsElem, animStartVal, animEndVal, animDuration, (currentVal) => {
                if (neededElem && !progDetails.isMax) {
                    neededElem.textContent = Math.max(0, progDetails.nextThreshold - currentVal);
                }
            }, () => {
                localStorage.setItem(storageKey, points.toString());

                if (hasIncreased) {
                    const prevLvl = getCefrLevelFromPoints(startPoints);
                    const newLvl = getCefrLevelFromPoints(points);
                    if (prevLvl !== newLvl && typeof confetti === 'function') {
                        confetti({
                            particleCount: 50,
                            spread: 70,
                            origin: { y: 0.35 }
                        });
                    }
                }
            });
        } else {
            pointsElem.textContent = '0';
            localStorage.setItem(storageKey, '0');
        }
    }
}

// Override renderView pour attacher les events et synchroniser le hash d'URL
const originalRenderView = renderView;
const VALID_VIEWS = ['home', 'progress', 'stats', 'certs', 'about'];

renderView = function(viewId, updateHash = true) {
    originalRenderView(viewId);
    attachViewEvents(viewId);
    if (updateHash && VALID_VIEWS.includes(viewId)) {
        if (window.location.hash !== `#${viewId}`) {
            history.pushState(null, '', `#${viewId}`);
        }
    }
};

// Initialisation au chargement de la page
window.addEventListener('DOMContentLoaded', () => {
    // Interception des actions d'authentification Firebase (Validation email / Réinitialisation mot de passe)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('mode') && urlParams.has('oobCode')) {
        window.location.href = `auth-action.html${window.location.search}`;
        return;
    }

    // Écouter les changements d'authentification pour rafraîchir la vue (ex: enlever les cadenas)
    window.addEventListener('auth-changed', () => {
        const currentActiveBtn = document.querySelector('.nav-btn.active');
        if (currentActiveBtn) {
            const viewId = currentActiveBtn.id.replace('nav-', '');
            renderView(viewId, false);
        }
    });

    // Appliquer la traduction initiale sur la page globale
    translatePage();

    // Déterminer la vue initiale depuis le hash de l'URL (permet de rester sur la page active après un F5)
    const currentHash = window.location.hash.replace('#', '').trim();
    const initialView = VALID_VIEWS.includes(currentHash) ? currentHash : 'home';

    // Afficher la vue initiale
    renderView(initialView, false);
    console.log(`Dictionnaire chargé avec ${vocabulary.length} mots. Vue initiale: ${initialView}`);

    // Initialiser les options
    initOptionsModal();

    // Support de la navigation par l'historique (boutons Précédent / Suivant du navigateur)
    window.addEventListener('popstate', () => {
        const hash = window.location.hash.replace('#', '').trim();
        const targetView = VALID_VIEWS.includes(hash) ? hash : 'home';
        const currentActiveBtn = document.querySelector('.nav-btn.active');
        const currentView = currentActiveBtn ? currentActiveBtn.id.replace('nav-', '') : '';
        if (currentView !== targetView) {
            renderView(targetView, false);
        }
    });

    // Menu mobile flottant (Dropdown)
    const menuToggle = document.getElementById('menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    if (menuToggle && navMenu) {
        menuToggle.onclick = (e) => {
            e.stopPropagation();
            navMenu.classList.toggle('open');
        };
        
        document.addEventListener('click', (e) => {
            if (!navMenu.contains(e.target) && e.target !== menuToggle) {
                navMenu.classList.remove('open');
            }
        });
        
        const navBtns = navMenu.querySelectorAll('.nav-btn');
        navBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                navMenu.classList.remove('open');
            });
        });
    }

    // Custom Dropdown Language
    const langToggleBtn = document.getElementById('lang-toggle-btn');
    const langMenu = document.getElementById('lang-dropdown-menu');
    const currentLangText = document.getElementById('current-lang-text');
    
    if (langToggleBtn && langMenu) {
        const currentLang = getAppLanguage();
        if (currentLangText) currentLangText.textContent = currentLang.toUpperCase();
        
        // Mettre en évidence l'option active
        document.querySelectorAll('.lang-option').forEach(opt => {
            if (opt.dataset.val === currentLang) {
                opt.style.background = 'var(--primary-color)';
                opt.style.color = 'white';
            } else {
                opt.style.background = 'transparent';
                opt.style.color = 'var(--text-primary)';
            }
        });

        // Toggle menu
        langToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = langMenu.style.display === 'flex';
            langMenu.style.display = isVisible ? 'none' : 'flex';
        });

        // Close when clicking outside
        document.addEventListener('click', (e) => {
            if (!langToggleBtn.contains(e.target) && !langMenu.contains(e.target)) {
                langMenu.style.display = 'none';
            }
        });

        // Handle selection
        document.querySelectorAll('.lang-option').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const newLang = e.currentTarget.dataset.val;
                setAppLanguage(newLang);
                if (currentLangText) currentLangText.textContent = newLang.toUpperCase();
                langMenu.style.display = 'none';
                
                // Mettre en évidence la nouvelle option active
                document.querySelectorAll('.lang-option').forEach(opt => {
                    if (opt.dataset.val === newLang) {
                        opt.style.background = 'var(--primary-color)';
                        opt.style.color = 'white';
                    } else {
                        opt.style.background = 'transparent';
                        opt.style.color = 'var(--text-primary)';
                    }
                });

                // Traduire l'en-tête statique et la page courante
                translatePage();
                
                // Si on est sur l'accueil, mettre à jour le compteur disponible, le volume et la description du mode
                const viewHomeEl = document.getElementById('home-intro-text');
                if (viewHomeEl) {
                    const selectSrc = document.getElementById('select-lang-source');
                    if (selectSrc) {
                        selectSrc.dispatchEvent(new Event('change'));
                    }
                    const inputVol = document.getElementById('input-volume');
                    const volDisp = document.getElementById('volume-display');
                    if (inputVol && volDisp) {
                        const currentVal = inputVol.dataset.val || inputVol.value;
                        const suffix = newLang === 'fr' ? 'mots' : (newLang === 'es' ? 'palabras' : (newLang === 'de' ? 'Wörter' : 'words'));
                        volDisp.textContent = `${currentVal} ${suffix}`;
                    }
                    const modeChecked = document.querySelector('input[name="drill-mode"]:checked');
                    const modeDescEl = document.getElementById('mode-description');
                    if (modeChecked && modeDescEl) {
                        const descKey = `mode_desc_${modeChecked.value}`;
                        if (translations[newLang] && translations[newLang][descKey]) {
                            modeDescEl.textContent = translations[newLang][descKey];
                        }
                    }
                }
                
                // Si on est sur la liste des mots, rafraîchir le tableau
                const progTable = document.getElementById('prog-table-body');
                if (progTable && typeof renderProgressTable === 'function') {
                    renderProgressTable();
                }

                // Si on est sur les stats, rafraîchir les stats
                const statsContainer = document.getElementById('stats-container');
                if (statsContainer && typeof initStatsView === 'function') {
                    initStatsView();
                }

                // Si on est sur les certificats, rafraîchir les certificats
                const certsContainer = document.getElementById('certs-container');
                if (certsContainer && typeof initCertsView === 'function') {
                    initCertsView();
                }
            });
            
            // Hover effect
            btn.addEventListener('mouseenter', (e) => {
                if (e.currentTarget.dataset.val !== getAppLanguage()) {
                    e.currentTarget.style.background = 'rgba(100, 116, 139, 0.1)';
                }
            });
            btn.addEventListener('mouseleave', (e) => {
                if (e.currentTarget.dataset.val !== getAppLanguage()) {
                    e.currentTarget.style.background = 'transparent';
                }
            });
        });
    }

    // Modal Auth Logic
    const authModal = document.getElementById('auth-modal');
    
    // Boutons génériques pour ouvrir la modale
    const openAuthBtns = document.querySelectorAll('.btn-open-auth-modal');
    openAuthBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            if (authModal) authModal.classList.remove('hidden');
        });
    });

    const btnCloseAuth = document.getElementById('btn-close-auth');
    if (btnCloseAuth && authModal) {
        btnCloseAuth.onclick = () => {
            authModal.classList.add('hidden');
        };
    }

    // Fermeture par clic en dehors de la carte
    if (authModal) {
        authModal.addEventListener('click', (e) => {
            if (e.target === authModal) {
                authModal.classList.add('hidden');
            }
        });
    }

    // Fermeture avec la touche Échap
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && authModal && !authModal.classList.contains('hidden')) {
            authModal.classList.add('hidden');
        }
    });

    // Bascule Afficher / Masquer le mot de passe (Toggle Eye)
    const btnTogglePassword = document.getElementById('btn-toggle-password');
    const authPasswordInput = document.getElementById('auth-password');
    if (btnTogglePassword && authPasswordInput) {
        const eyeOpenSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
        const eyeClosedSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

        btnTogglePassword.onclick = () => {
            const isPassword = authPasswordInput.type === 'password';
            authPasswordInput.type = isPassword ? 'text' : 'password';
            btnTogglePassword.innerHTML = isPassword ? eyeClosedSvg : eyeOpenSvg;
            btnTogglePassword.setAttribute('title', isPassword ? "Masquer le mot de passe" : "Afficher le mot de passe");
            btnTogglePassword.setAttribute('aria-label', isPassword ? "Masquer le mot de passe" : "Afficher le mot de passe");
        };
    }

    const btnLogin = document.getElementById('btn-login');
    const btnSignup = document.getElementById('btn-signup');
    const btnForgotPassword = document.getElementById('btn-forgot-password');
    const authError = document.getElementById('auth-error');
    
    // Mot de passe oublié
    if (btnForgotPassword) {
        btnForgotPassword.onclick = async () => {
            const email = document.getElementById('auth-email').value;
            const lang = getAppLanguage();
            if (!email || !email.trim()) {
                authError.style.color = 'var(--error-color)';
                authError.textContent = translations[lang]?.auth_enter_email_for_reset || "Veuillez renseigner votre adresse e-mail ci-dessus.";
                authError.style.display = 'block';
                document.getElementById('auth-email').focus();
                return;
            }
            authError.style.display = 'none';
            btnForgotPassword.disabled = true;
            btnForgotPassword.style.opacity = '0.5';
            
            const res = await resetPassword(email);
            btnForgotPassword.disabled = false;
            btnForgotPassword.style.opacity = '1';

            if (res.success) {
                authError.style.color = 'var(--success-color)';
                authError.textContent = translations[lang]?.auth_reset_sent || "Un e-mail de réinitialisation vous a été envoyé. Vérifiez vos spams.";
                authError.style.display = 'block';
            } else {
                authError.style.color = 'var(--error-color)';
                authError.textContent = res.error;
                authError.style.display = 'block';
            }
        };
    }

    const btnAuthSubmit = document.getElementById('btn-auth-submit');
    const authForm = authModal ? authModal.querySelector('form') : null;

    const handleAuthSubmit = async (e) => {
        if (e) e.preventDefault();
        const email = document.getElementById('auth-email').value;
        const pass = document.getElementById('auth-password').value;
        authError.style.display = 'none';

        if (btnAuthSubmit) {
            btnAuthSubmit.disabled = true;
            btnAuthSubmit.style.opacity = '0.7';
        }

        const res = await authenticateUser(email, pass);

        if (btnAuthSubmit) {
            btnAuthSubmit.disabled = false;
            btnAuthSubmit.style.opacity = '1';
        }

        if (res.success) {
            if (res.isNewUser) {
                authError.style.color = 'var(--success-color)';
                authError.textContent = res.message;
                authError.style.display = 'block';
            } else {
                authModal.classList.add('hidden');
            }
        } else {
            authError.style.color = res.isUnverified ? 'var(--primary-color)' : 'var(--error-color)';
            authError.textContent = res.error;
            authError.style.display = 'block';
        }
    };

    if (btnAuthSubmit) {
        btnAuthSubmit.onclick = handleAuthSubmit;
    }
    if (authForm) {
        authForm.onsubmit = handleAuthSubmit;
    }
});

// --- Gestion de la vue Certificats ---
function initCertsView() {
    const gatedState = document.getElementById('certs-gated-state');
    const emptyState = document.getElementById('certs-empty-state');
    const container = document.getElementById('certs-container');
    const profileCard = document.querySelector('.cert-profile-card');
    
    // Gating check
    if (!getCurrentUser()) {
        gatedState.style.display = 'flex';
        emptyState.style.display = 'none';
        container.style.display = 'none';
        profileCard.style.display = 'none';
        
        // Wire auth buttons
        document.querySelectorAll('.btn-open-auth-modal').forEach(btn => {
            btn.onclick = () => document.getElementById('auth-modal')?.classList.remove('hidden');
        });
        return;
    }
    
    gatedState.style.display = 'none';
    profileCard.style.display = 'flex';
    
    function initCertNameControl() {
        const inputFirstname = document.getElementById('cert-firstname');
        const inputLastname = document.getElementById('cert-lastname');
        const btnSave = document.getElementById('btn-cert-name-save');
        const lockInfoEl = document.getElementById('cert-name-lock-info');

        if (!inputFirstname || !inputLastname) return;

        const savedFirst = localStorage.getItem('cert_firstname') || '';
        const savedLast = localStorage.getItem('cert_lastname') || '';
        const updatedAt = localStorage.getItem('cert_name_updated_at');
        const lang = getAppLanguage();

        inputFirstname.value = savedFirst;
        inputLastname.value = savedLast;

        const lockDays = getCertNameLockDays();
        const LOCK_MS = lockDays * 24 * 60 * 60 * 1000;
        const now = Date.now();
        let isLocked = false;
        let daysRemaining = 0;
        let nextAvailableDate = null;

        if (updatedAt && savedFirst && savedLast) {
            const timeDiff = now - parseInt(updatedAt, 10);
            if (timeDiff < LOCK_MS) {
                isLocked = true;
                daysRemaining = Math.max(1, Math.ceil((LOCK_MS - timeDiff) / (24 * 60 * 60 * 1000)));
                nextAvailableDate = new Date(parseInt(updatedAt, 10) + LOCK_MS);
            }
        }

        if (isLocked) {
            inputFirstname.disabled = true;
            inputLastname.disabled = true;
            inputFirstname.style.opacity = '0.7';
            inputLastname.style.cursor = 'not-allowed';
            inputLastname.style.opacity = '0.7';
            inputLastname.style.cursor = 'not-allowed';

            if (btnSave) {
                btnSave.disabled = true;
                btnSave.style.display = 'none';
            }
            const btnContainer = document.getElementById('cert-name-btn-container');
            if (btnContainer) btnContainer.style.display = 'none';

            if (lockInfoEl) {
                const dateStr = nextAvailableDate.toLocaleDateString(lang === 'fr' ? 'fr-FR' : (lang === 'de' ? 'de-DE' : (lang === 'es' ? 'es-ES' : 'en-US')));
                const lockSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>`;
                const lockMsg = (translations[lang]?.cert_name_locked || "Verrouillé jusqu'au {date} ({days}j restants)")
                    .replace('{date}', dateStr)
                    .replace('{days}', daysRemaining);
                lockInfoEl.innerHTML = `<span style="color: #f59e0b; font-weight: 500; display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;">${lockSvg}<span>${lockMsg}</span></span>`;
            }
        } else {
            inputFirstname.disabled = false;
            inputLastname.disabled = false;
            inputFirstname.style.opacity = '1';
            inputFirstname.style.cursor = 'text';
            inputLastname.style.opacity = '1';
            inputLastname.style.cursor = 'text';

            if (btnSave) {
                btnSave.disabled = false;
                btnSave.style.display = 'inline-flex';
            }
            const btnContainer = document.getElementById('cert-name-btn-container');
            if (btnContainer) btnContainer.style.display = 'flex';

            if (lockInfoEl) {
                const infoSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
                const infoMsg = (translations[lang]?.cert_name_info || "Le prénom et le nom ne sont modifiables qu'une fois tous les {days} jours.")
                    .replace('{days}', lockDays);
                lockInfoEl.innerHTML = `<span style="color: var(--text-secondary); display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem;">${infoSvg}<span>${infoMsg}</span></span>`;
            }

            if (btnSave) {
                btnSave.onclick = async () => {
                    const f = inputFirstname.value.trim();
                    const l = inputLastname.value.trim();
                    if (!f || !l) {
                        alert(translations[lang]?.alert_fill_name || "Veuillez renseigner votre prénom et votre nom pour générer l'attestation.");
                        return;
                    }

                    const confirmTemplate = translations[lang]?.cert_name_confirm || "Attention : vos prénom et nom seront verrouillés pendant {days} jours pour vos attestations. Confirmez-vous : {name} ?";
                    const confirmMsg = confirmTemplate.replace('{days}', lockDays).replace('{name}', `${f} ${l}`);
                    if (!confirm(confirmMsg)) return;

                    const updateTime = Date.now();
                    await saveUserProfile(f, l, updateTime);
                    initCertNameControl();
                };
            }
        }
    }

    initCertNameControl();

    const progress = loadProgress();
    const usedPairs = Object.keys(progress).filter(key => {
        return progress[key] && typeof progress[key] === 'object' && Object.keys(progress[key]).length > 0;
    });

    if (usedPairs.length === 0) {
        if (emptyState) emptyState.style.display = 'flex';
        if (container) container.style.display = 'none';

        const btnGo = document.getElementById('btn-certs-go-to-training');
        if (btnGo) {
            btnGo.onclick = () => renderView('home');
        }
        return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (container) {
        container.style.display = 'grid';
        container.innerHTML = '';
    }

    const lang = getAppLanguage();

    const pairsData = usedPairs.map(pair => {
        const [src, tgt] = pair.split('-');
        let validated = 0;
        const validatedByLevel = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };
        const totalByLevel = { A1: 0, A2: 0, B1: 0, B2: 0, C1: 0, C2: 0 };

        vocabulary.forEach(word => {
            const status = getWordStatus(src, tgt, word.id);
            if (status === 'ignoré') return;
            if (totalByLevel[word.level] !== undefined) {
                totalByLevel[word.level]++;
            }
            if (status === 'validé') {
                validated++;
                if (validatedByLevel[word.level] !== undefined) {
                    validatedByLevel[word.level]++;
                }
            }
        });
        return { pair, src, tgt, validated, validatedByLevel, totalByLevel };
    });

    // Trier par nombre de mots validés décroissant
    pairsData.sort((a, b) => b.validated - a.validated);

    pairsData.forEach(data => {
        const { src, tgt, validated } = data;

        // Creer une carte d'attestation
        const card = document.createElement('div');
        card.className = 'stat-card';
        
        const pairText = `${getLangName(src)} ➔ ${getLangName(tgt)}`;
        const textValidated = translations[lang].cert_total_words;
        const btnLabel = translations[lang].btn_generate_cert;
        
        card.innerHTML = `
            <div class="stat-card-header">
                <span class="stat-pair-name">${pairText}</span>
                <span class="stat-percentage-badge">${validated} ✓</span>
            </div>
            <div class="stat-body" style="gap: 1.25rem; margin-top: 0.5rem;">
                <div class="stat-row">
                    <span class="stat-label">${textValidated}</span>
                    <span class="stat-value" style="color: var(--success-color);">${validated}</span>
                </div>
                <button class="btn-primary btn-generate-cert-action" style="padding: 0.6rem; font-size: 0.95rem; border-radius: 6px;">${btnLabel}</button>
            </div>
        `;

        const btnGen = card.querySelector('.btn-generate-cert-action');
        btnGen.onclick = () => {
            const fname = document.getElementById('cert-firstname')?.value.trim();
            const lname = document.getElementById('cert-lastname')?.value.trim();
            if (!fname || !lname) {
                const inF = document.getElementById('cert-firstname');
                const inL = document.getElementById('cert-lastname');
                if (inF) inF.style.borderColor = 'var(--error-color)';
                if (inL) inL.style.borderColor = 'var(--error-color)';
                setTimeout(() => {
                    if (inF) inF.style.borderColor = '';
                    if (inL) inL.style.borderColor = '';
                }, 2000);
                alert(translations[lang].alert_fill_name || "Veuillez renseigner votre prénom et votre nom pour générer l'attestation.");
                return;
            }
            openCertificateModal(src, tgt, validated, data.validatedByLevel, data.totalByLevel);
        };

        if (container) container.appendChild(card);
    });
}

function downloadCertificateAsPDF(canvas, filename) {
    try {
        if (window.jspdf && window.jspdf.jsPDF) {
            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4',
                compress: true
            });
            const imgData = canvas.toDataURL('image/jpeg', 0.95);
            // Page A4 portrait : 210mm x 297mm
            pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');
            pdf.save(filename);
            return;
        }
    } catch (e) {
        console.error("Erreur lors de l'export PDF jsPDF :", e);
    }

    // Fallback d'impression directe au format A4 si la librairie n'est pas encore disponible
    const printWin = window.open('', '_blank');
    if (printWin) {
        const imgData = canvas.toDataURL('image/png');
        printWin.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>${filename}</title>
                <style>
                    @page { size: A4 portrait; margin: 0; }
                    body { margin: 0; padding: 0; display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #fff; }
                    img { width: 100vw; height: auto; max-height: 100vh; object-fit: contain; }
                </style>
            </head>
            <body>
                <img src="${imgData}" onload="window.print();" />
            </body>
            </html>
        `);
        printWin.document.close();
    }
}

async function openCertificateModal(src, tgt, validated, validatedByLevel, totalByLevel) {
    const modal = document.getElementById('cert-modal');
    const canvas = document.getElementById('cert-canvas');
    if (!modal || !canvas) return;

    modal.classList.remove('hidden');

    const ctx = canvas.getContext('2d');
    const lang = getAppLanguage();

    const points = calculateCefrPoints(validatedByLevel);
    const globalLevel = computeGlobalCefrLevel(validatedByLevel, totalByLevel);

    // Récupérer / générer et lier le certificat unique dans la DB du compte utilisateur
    const certId = await getOrGenerateCertificateId(src, tgt, globalLevel, validated, points);

    // Dessiner l'attestation sur le canvas en format portrait
    drawCertificateOnCanvas(ctx, src, tgt, validated, validatedByLevel, totalByLevel, lang, certId);

    // Configurer le téléchargement PNG
    const btnDownload = document.getElementById('btn-download-cert');
    if (btnDownload) {
        btnDownload.onclick = () => {
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `attestation_drillflow_${src}_${tgt}.png`;
            link.href = dataUrl;
            link.click();
        };
    }

    // Configurer le téléchargement PDF
    const btnDownloadPdf = document.getElementById('btn-download-pdf-cert');
    if (btnDownloadPdf) {
        btnDownloadPdf.onclick = () => {
            const pdfFilename = `attestation_drillflow_${src}_${tgt}.pdf`;
            downloadCertificateAsPDF(canvas, pdfFilename);
        };
    }

    // Configurer la fermeture
    const btnClose = document.getElementById('btn-close-cert');
    if (btnClose) {
        btnClose.onclick = () => {
            modal.classList.add('hidden');
        };
    }
}

function drawRoundedRect(ctx, x, y, width, height, radius, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    if (fill) ctx.fill();
    if (stroke) ctx.stroke();
}

function computeGlobalCefrLevel(validatedByLevel, totalByLevel) {
    const points = calculateCefrPoints(validatedByLevel);
    return getCefrLevelFromPoints(points);
}

function drawCertificateOnCanvas(ctx, src, tgt, validated, validatedByLevel, totalByLevel, lang, certId) {
    const w = 800;
    const h = 1132;

    // Fond blanc avec dégradé subtil
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    const bgGrad = ctx.createLinearGradient(0, 0, 0, h);
    bgGrad.addColorStop(0, '#ffffff');
    bgGrad.addColorStop(0.15, '#fafbfc');
    bgGrad.addColorStop(0.85, '#f8fafc');
    bgGrad.addColorStop(1, '#f1f5f9');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Bordure extérieure avec coins arrondis
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, 20, 20, w - 40, h - 40, 14, false, true);

    // Cadre intérieur décoratif fin
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, 28, 28, w - 56, h - 56, 10, false, true);

    // Liseré supérieur aux couleurs de drillFlow
    const barGrad = ctx.createLinearGradient(20, 20, w - 20, 20);
    barGrad.addColorStop(0, '#4f46e5');
    barGrad.addColorStop(0.5, '#6366f1');
    barGrad.addColorStop(1, '#06b6d4');
    ctx.fillStyle = barGrad;
    drawRoundedRect(ctx, 21, 21, w - 42, 5, 2.5, true, false);

    // 1. EN-TÊTE (Logo + Devise)
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 24px "Outfit", sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('drill', 50, 66);
    const drillW = ctx.measureText('drill').width;

    ctx.fillStyle = '#4f46e5';
    ctx.fillText('Flow.', 50 + drillW, 66);

    // Tagline sous le logo
    ctx.font = '500 11px "Inter", sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Master language ', 50, 82);
    const tagW = ctx.measureText('Master language ').width;

    ctx.fillStyle = '#4f46e5';
    ctx.font = 'bold 11px "Inter", sans-serif';
    ctx.fillText('faster.', 50 + tagW, 82);

    // Badge application en haut à droite
    ctx.font = '600 11px "Inter", sans-serif';
    ctx.fillStyle = '#6366f1';
    ctx.textAlign = 'right';
    ctx.fillText('drill-flow.app', 750, 66);

    ctx.font = '500 10px "Inter", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Plateforme d\'entraînement actif', 750, 82);

    // Ligne de séparation sous l'en-tête
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(50, 96);
    ctx.lineTo(750, 96);
    ctx.stroke();

    // 2. TITRE & APPRENANT
    ctx.textAlign = 'center';

    // Titre de l'attestation
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 17px "Outfit", sans-serif';
    ctx.fillText(translations[lang].cert_achievement || 'ATTESTATION DE COMPÉTENCES LINGUISTIQUES', w / 2, 130);

    // "Délivrée à :"
    ctx.fillStyle = '#64748b';
    ctx.font = '500 12px "Inter", sans-serif';
    ctx.fillText(translations[lang].cert_awarded_to || 'Délivrée à :', w / 2, 154);

    // Nom complet
    const fname = localStorage.getItem('cert_firstname') || '';
    const lname = localStorage.getItem('cert_lastname') || '';
    const fullName = (fname || lname) ? `${fname} ${lname}`.trim() : (translations[lang].cert_default_learner || 'Apprenant drillFlow.');
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 26px "Outfit", sans-serif';
    ctx.fillText(fullName, w / 2, 186);

    // Badge Paire linguistique & méthode
    const srcName = getLangName(src).toUpperCase();
    const tgtName = getLangName(tgt).toUpperCase();
    const pairSummary = `${srcName} ➔ ${tgtName} • VOCABULAIRE RÉFLEXE`;
    ctx.font = 'bold 10px "Inter", sans-serif';
    const pairW = ctx.measureText(pairSummary).width + 26;
    const pairX = (w - pairW) / 2;

    ctx.fillStyle = '#0f172a';
    drawRoundedRect(ctx, pairX, 202, pairW, 24, 12, true, false);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(pairSummary, w / 2, 218);

    // 3. NIVEAU CECRL GLOBAL ATTEINT & STATS TOTALES (Disposition spacieuse en 2 rangées : ZÉRO chevauchement)
    const points = calculateCefrPoints(validatedByLevel);
    const globalLevel = computeGlobalCefrLevel(validatedByLevel, totalByLevel);
    const levelDescKey = `cefr_desc_${globalLevel}`;
    const levelDesc = (translations[lang] && translations[lang][levelDescKey]) || 'Utilisateur';

    const globalBoxY = 244;
    const globalBoxH = 104;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, 50, globalBoxY, 700, globalBoxH, 12, true, true);

    // Rangée 1 : Badge Niveau + Libellé complet du Niveau + Référentiel CECRL
    const lvlGrad = ctx.createLinearGradient(64, globalBoxY + 12, 118, globalBoxY + 56);
    lvlGrad.addColorStop(0, '#4f46e5');
    lvlGrad.addColorStop(1, '#3b82f6');
    ctx.fillStyle = lvlGrad;
    drawRoundedRect(ctx, 64, globalBoxY + 12, 54, 44, 8, true, false);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 20px "Outfit", sans-serif';
    ctx.fillText(globalLevel, 91, globalBoxY + 39);

    ctx.font = 'bold 8px "Inter", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText('CECRL', 91, globalBoxY + 50);

    // Texte descriptif du niveau global (utilise toute la largeur disponible, aucun croisement)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 15px "Outfit", sans-serif';
    const globalLabel = translations[lang].cert_global_level || 'Niveau global atteint :';
    ctx.fillText(`${globalLabel} ${globalLevel} — ${levelDesc}`, 130, globalBoxY + 31);

    ctx.fillStyle = '#64748b';
    ctx.font = '400 11px "Inter", sans-serif';
    ctx.fillText(translations[lang].cert_cefr_framework || 'Cadre Européen Commun de Référence pour les Langues (CECRL)', 130, globalBoxY + 48);

    // Rangée 2 : Deux pilules métriques distinctes et spacieuses (Total mots validés & Total points)
    const pillsY = globalBoxY + 64;
    const pill1X = 64;
    const pill1W = 325;
    const pill2X = 401;
    const pill2W = 335;
    const pillH = 30;

    // Pilule 1 : Total mots validés
    ctx.fillStyle = 'rgba(99, 102, 241, 0.08)';
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, pill1X, pillsY, pill1W, pillH, 6, true, true);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#4f46e5';
    ctx.font = 'bold 13px "Outfit", sans-serif';
    const labelWords = translations[lang].cert_learned_words || 'Total mots validés';
    ctx.fillText(`${labelWords} : ${validated}`, pill1X + pill1W / 2, pillsY + 20);

    // Pilule 2 : Total points
    ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.25)';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, pill2X, pillsY, pill2W, pillH, 6, true, true);

    ctx.fillStyle = '#059669';
    ctx.font = 'bold 13px "Outfit", sans-serif';
    const labelPoints = translations[lang].cert_total_points || 'Total points';
    ctx.fillText(`${labelPoints} : ${Math.round(points)}`, pill2X + pill2W / 2, pillsY + 20);

    // 4. SCORECARD DÉTAIL PAR NIVEAU CECRL (Disposition en 6 lignes portrait)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 12px "Inter", sans-serif';
    ctx.fillText(translations[lang].cert_levels_prefix || 'Détail du vocabulaire par niveau CECRL :', 50, 368);

    const cefrColors = {
        A1: { bg: '#dbeafe', text: '#1e40af', bar: '#2563eb' },
        A2: { bg: '#e0e7ff', text: '#3730a3', bar: '#4f46e5' },
        B1: { bg: '#fef3c7', text: '#92400e', bar: '#d97706' },
        B2: { bg: '#ffedd5', text: '#9a3412', bar: '#ea580c' },
        C1: { bg: '#fae8ff', text: '#86198f', bar: '#9333ea' },
        C2: { bg: '#dcfce7', text: '#166534', bar: '#059669' }
    };

    const levels = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    const startY = 382;
    const rowH = 55;

    levels.forEach((lvl, index) => {
        const y = startY + index * rowH;
        const color = cefrColors[lvl];
        const val = (validatedByLevel && validatedByLevel[lvl]) || 0;
        const tot = (totalByLevel && totalByLevel[lvl]) || 0;
        const pct = tot > 0 ? Math.round((val / tot) * 100) : 0;
        const desc = (translations[lang] && translations[lang][`cefr_desc_${lvl}`]) || lvl;

        // Ligne de fond avec léger contour
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#f1f5f9';
        ctx.lineWidth = 1;
        drawRoundedRect(ctx, 50, y, 700, 46, 8, true, true);

        // Badge niveau
        ctx.fillStyle = color.bg;
        drawRoundedRect(ctx, 60, y + 8, 36, 30, 6, true, false);

        ctx.textAlign = 'center';
        ctx.fillStyle = color.text;
        ctx.font = 'bold 12px "Outfit", sans-serif';
        ctx.fillText(lvl, 78, y + 28);

        // Intitulé niveau CECRL
        ctx.textAlign = 'left';
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 12px "Inter", sans-serif';
        ctx.fillText(desc, 108, y + 28);

        // Barre de progression
        const barX = 330;
        const barY = y + 19;
        const barW = 240;
        const barH = 8;
        ctx.fillStyle = '#e2e8f0';
        drawRoundedRect(ctx, barX, barY, barW, barH, 4, true, false);

        if (pct > 0) {
            const filledW = Math.max(8, Math.round((pct / 100) * barW));
            ctx.fillStyle = color.bar;
            drawRoundedRect(ctx, barX, barY, filledW, barH, 4, true, false);
        }

        // Stats chiffres
        ctx.textAlign = 'right';
        ctx.fillStyle = '#475569';
        ctx.font = 'bold 12px "Inter", sans-serif';
        ctx.fillText(`${val} / ${tot} (${pct}%)`, 736, y + 28);
    });

    // 5. BAS DE PAGE / VALIDATION OFFICIELLE & SCEAU
    const footY = 724;
    const footH = 360;
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.2;
    drawRoundedRect(ctx, 50, footY, 700, footH, 12, true, true);

    const dateStr = new Date().toLocaleDateString(lang === 'en' ? 'en-US' : (lang === 'de' ? 'de-DE' : (lang === 'es' ? 'es-ES' : 'fr-FR')));

    // Informations et pédagogie à gauche (AUCUNE URL DU SITE EN BAS À GAUCHE)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 13px "Inter", sans-serif';
    ctx.fillText(`${translations[lang].cert_date || "Date d'émission :"} ${dateStr}`, 70, footY + 38);

    ctx.fillStyle = '#334155';
    ctx.font = '600 12px "Inter", sans-serif';
    ctx.fillText(translations[lang].cert_for_mastering || "Méthode d'entraînement par répétition active et mémorisation réflexe", 70, footY + 68);

    ctx.fillStyle = '#64748b';
    ctx.font = '400 11px "Inter", sans-serif';
    ctx.fillText("• Validation stricte : chaque mot est validé au premier essai lors du Drill.", 70, footY + 95);
    ctx.fillText("• Répétition active : restitution orthographique directe sans proposition passive.", 70, footY + 117);
    ctx.fillText("• Mobilisation réflexe : consolidation en mémoire à long terme.", 70, footY + 139);

    // Bilan certifié explicite avec mots validés
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 11px "Inter", sans-serif';
    const volumeTemplate = translations[lang].cert_attested_volume || "• Bilan certifié : total de {words} mots validés ({points} points au total).";
    const volumeText = volumeTemplate.replace('{words}', validated).replace('{points}', Math.round(points));
    ctx.fillText(volumeText, 70, footY + 164);

    // Ligne fine décorative
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(70, footY + 185);
    ctx.lineTo(480, footY + 185);
    ctx.stroke();

    ctx.fillStyle = '#475569';
    ctx.font = '500 11px "Inter", sans-serif';
    ctx.fillText("Référentiel européen : CECRL (Cadre Européen Commun de Référence)", 70, footY + 208);
    ctx.fillText("Plateforme d'évaluation : drillFlow Learning System", 70, footY + 230);

    ctx.fillStyle = '#94a3b8';
    ctx.font = 'italic 10px "Inter", sans-serif';
    ctx.fillText("Attestation numérique individuelle certifiant du volume lexical actif validé.", 70, footY + 260);
    ctx.fillText("Document officiel généré automatiquement d'après les résultats réels d'entraînement.", 70, footY + 280);

    // Tampon / Sceau d'attestation officiel à droite (avec graphisme vectoriel canvas pur, pas d'émoji)
    const stampX = 510;
    const stampY = footY + 30;
    const stampW = 220;
    const stampH = 300;

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.2;
    drawRoundedRect(ctx, stampX, stampY, stampW, stampH, 10, true, true);

    // Liseré vert discret en haut du tampon
    ctx.fillStyle = '#10b981';
    drawRoundedRect(ctx, stampX + 1, stampY + 1, stampW - 2, 4, 2, true, false);

    const sealCenterX = stampX + stampW / 2;
    const sealCenterY = stampY + 68;

    // Double cercle du sceau
    ctx.beginPath();
    ctx.arc(sealCenterX, sealCenterY, 32, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(16, 185, 129, 0.08)';
    ctx.fill();
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(sealCenterX, sealCenterY, 26, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();

    // Coche vectorielle nette au centre du sceau
    ctx.strokeStyle = '#059669';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(sealCenterX - 11, sealCenterY);
    ctx.lineTo(sealCenterX - 2, sealCenterY + 9);
    ctx.lineTo(sealCenterX + 12, sealCenterY - 7);
    ctx.stroke();

    // Textes du sceau officiel
    ctx.textAlign = 'center';
    ctx.fillStyle = '#059669';
    ctx.font = 'bold 14px "Outfit", sans-serif';
    ctx.fillText(translations[lang].cert_seal_text || 'ATTESTÉ', sealCenterX, stampY + 130);

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 12px "Inter", sans-serif';
    ctx.fillText('drillFlow. Learning', sealCenterX, stampY + 154);

    ctx.fillStyle = '#64748b';
    ctx.font = '500 10px "Inter", sans-serif';
    ctx.fillText('Protocole CECRL Conforme', sealCenterX, stampY + 172);

    // Ligne de séparation dans le sceau
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(stampX + 24, stampY + 192);
    ctx.lineTo(stampX + stampW - 24, stampY + 192);
    ctx.stroke();

    const persistentId = certId || `DF-${src.toUpperCase()}${tgt.toUpperCase()}-${Math.floor(Date.now() / 1000).toString(36).toUpperCase()}`;
    ctx.font = 'bold 10px "Inter", monospace';
    ctx.fillStyle = '#4f46e5';
    ctx.fillText(persistentId, sealCenterX, stampY + 218);

    ctx.font = '500 9px "Inter", sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('Certificat numérique vérifié', sealCenterX, stampY + 238);

    ctx.font = '600 10px "Inter", sans-serif';
    ctx.fillStyle = '#6366f1';
    ctx.fillText('drill-flow.app', sealCenterX, stampY + 268);
}
