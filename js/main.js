import { vocabulary } from './data/vocabulary.js?v=78';
import { initDrillSession, handleDrillKeydown } from './drill.js?v=78';
import { loadProgress, setWordStatus, getWordStatus, getWordStats } from './storage.js?v=78';
import { translations } from './i18n.js?v=78';
import { authenticateUser, loginUser, signUpUser, resetPassword, getCurrentUser, updateAuthUI } from './auth.js?v=78';

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
const themeToggle = document.getElementById('theme-toggle');
const htmlEl = document.documentElement;

const iconDark = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;
const iconLight = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;

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

themeToggle.addEventListener('click', () => {
    const currentTheme = htmlEl.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    htmlEl.setAttribute('data-theme', newTheme);
    themeToggle.innerHTML = newTheme === 'dark' ? iconDark : iconLight;
    localStorage.setItem('drillflow_theme', newTheme);
});

// Écouter les changements du système (ex: passage au mode nuit automatique sur le téléphone)
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
    if (!localStorage.getItem('drillflow_theme')) { // Seulement si l'utilisateur n'a pas forcé un thème
        const newTheme = event.matches ? 'dark' : 'light';
        htmlEl.setAttribute('data-theme', newTheme);
        themeToggle.innerHTML = newTheme === 'dark' ? iconDark : iconLight;
    }
});

// Set default icon
themeToggle.innerHTML = initialTheme === 'dark' ? iconDark : iconLight;

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
        const lastMode = localStorage.getItem('voc_last_mode') || 'discovery';
        
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
            selectSrc.addEventListener('change', updateTargetOptions);
        }
        updateTargetOptions();
        if (selectTgt) {
            if (lastTgt !== lastSrc) {
                selectTgt.value = lastTgt;
            }
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
            inputVol.value = lastVol;
            const updateVolText = (v) => {
                const lang = getAppLanguage();
                const suffix = lang === 'fr' ? 'mots' : (lang === 'es' ? 'palabras' : (lang === 'de' ? 'Wörter' : 'words'));
                volDisp.textContent = `${v} ${suffix}`;
            };
            updateVolText(lastVol);
            
            inputVol.addEventListener('input', (e) => {
                updateVolText(e.target.value);
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
                const vol = parseInt(document.getElementById('input-volume').value, 10);
                const modeChecked = document.querySelector('input[name="drill-mode"]:checked');
                const mode = modeChecked ? modeChecked.value : 'discovery';
                
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
let currentSortCol = 'source';
let currentSortAsc = true;

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
        usedPairs.forEach(pair => {
            const [src, tgt] = pair.split('-');
            const opt = document.createElement('option');
            opt.value = pair;
            opt.textContent = `${getLangName(src)} ➔ ${getLangName(tgt)}`;
            pairSelect.appendChild(opt);
        });

        // Définir la paire sélectionnée par défaut sur la dernière session ou fr-en
        const lastSrc = localStorage.getItem('voc_last_src') || 'fr';
        const lastTgt = localStorage.getItem('voc_last_tgt') || 'en';
        const defaultPair = `${lastSrc}-${lastTgt}`;

        if (usedPairs.includes(currentProgPair)) {
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

    ['nom', 'verbe', 'adjectif', 'adverbe', 'conjonction'].forEach(type => {
        const cb = document.getElementById(`filter-type-${type}`);
        if (cb) {
            cb.checked = true;
            cb.onchange = () => {
                renderProgressTable();
            };
        }
    });

    // Attach listeners for word level filters
    ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'].forEach(level => {
        const checkbox = document.getElementById(`filter-level-${level}`);
        if (checkbox) {
            checkbox.checked = true;
            checkbox.onchange = () => {
                renderProgressTable();
            };
        }
    });

    // Attach listeners for word status filters
    ['valide', 'actif', 'ignore'].forEach(statusKey => {
        const checkbox = document.getElementById(`filter-status-${statusKey}`);
        if (checkbox) {
            checkbox.checked = true;
            checkbox.onchange = () => {
                renderProgressTable();
            };
        }
    });

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

        const tdSrc = document.createElement('td');
        tdSrc.textContent = word[src];
        tdSrc.style.fontWeight = '600';
        tr.appendChild(tdSrc);

        const tdTgt = document.createElement('td');
        tdTgt.textContent = word[tgt];
        tr.appendChild(tdTgt);

        const tdType = document.createElement('td');
        const lang = getAppLanguage();
        if (word.type) {
            const typeLabel = translations[lang][`type_${word.type}`] || word.type;
            tdType.innerHTML = `<span class="type-badge ${word.type}" style="font-size: 0.65rem; padding: 0.15rem 0.5rem; text-transform: uppercase;">${typeLabel}</span>`;
        } else {
            tdType.textContent = '-';
        }
        tr.appendChild(tdType);

        const tdLevel = document.createElement('td');
        tdLevel.style.textAlign = 'center';
        if (word.level) {
            let badgeBg = 'rgba(255,255,255,0.1)';
            let badgeColor = 'inherit';
            if (word.level === 'A1') { badgeBg = 'rgba(59, 130, 246, 0.2)'; badgeColor = '#3b82f6'; }
            if (word.level === 'A2') { badgeBg = 'rgba(6, 182, 212, 0.2)'; badgeColor = '#06b6d4'; }
            if (word.level === 'B1') { badgeBg = 'rgba(16, 185, 129, 0.2)'; badgeColor = '#10b981'; }
            if (word.level === 'B2') { badgeBg = 'rgba(234, 179, 8, 0.2)'; badgeColor = '#eab308'; }
            if (word.level === 'C1') { badgeBg = 'rgba(249, 115, 22, 0.2)'; badgeColor = '#f97316'; }
            if (word.level === 'C2') { badgeBg = 'rgba(239, 68, 68, 0.2)'; badgeColor = '#ef4444'; }
            
            tdLevel.innerHTML = `<span class="type-badge" style="font-size: 0.65rem; padding: 0.15rem 0.45rem; background: ${badgeBg}; color: ${badgeColor}; font-weight: 600;">${word.level}</span>`;
        } else {
            tdLevel.textContent = '-';
        }
        tr.appendChild(tdLevel);

        const tdAttempts = document.createElement('td');
        tdAttempts.style.textAlign = 'center';
        tdAttempts.style.fontWeight = '600';
        tdAttempts.style.color = 'var(--text-secondary)';
        const stats = getWordStats(src, tgt, word.id);
        const status = getWordStatus(src, tgt, word.id);
        const attempts = stats.attempts || 0;
        if (status === 'ignoré') {
            tdAttempts.textContent = '-';
        } else {
            tdAttempts.textContent = attempts > 0 ? attempts : '-';
        }
        tr.appendChild(tdAttempts);

        const tdStatus = document.createElement('td');
        if (status === 'validé') {
            tdStatus.className = 'status-cell valide';
            tdStatus.textContent = '✓';
        } else if (status === 'ignoré') {
            tdStatus.className = 'status-cell';
            const ignoreLabel = translations[lang].status_ignored || 'Ignoré';
            tdStatus.innerHTML = `<span style="font-size: 0.7rem; padding: 0.15rem 0.45rem; border-radius: 4px; background: rgba(255,255,255,0.08); color: var(--text-secondary); font-weight: 500;">${ignoreLabel}</span>`;
        } else {
            tdStatus.className = 'status-cell actif';
            tdStatus.textContent = '\u00A0';
        }
        tr.appendChild(tdStatus);

        tableBody.appendChild(tr);
    });
}

// --- Gestion de la vue Statistiques ---
function initStatsView() {
    const gatedState = document.getElementById('stats-gated-state');
    const emptyState = document.getElementById('stats-empty-state');
    const container = document.getElementById('stats-container');
    
    // Gating check
    if (!getCurrentUser()) {
        gatedState.style.display = 'flex';
        emptyState.style.display = 'none';
        container.style.display = 'none';
        
        // Wire auth buttons
        document.querySelectorAll('.btn-open-auth-modal').forEach(btn => {
            btn.onclick = () => document.getElementById('auth-modal')?.classList.remove('hidden');
        });
        return;
    }
    
    gatedState.style.display = 'none';
    const progress = loadProgress();
    const usedPairs = Object.keys(progress).filter(key => {
        return progress[key] && typeof progress[key] === 'object' && Object.keys(progress[key]).length > 0;
    });

    if (usedPairs.length === 0) {
        if (emptyState) emptyState.style.display = 'flex';
        if (container) container.style.display = 'none';

        const btnGo = document.getElementById('btn-stats-go-to-training');
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

    // Trier les paires par nombre de mots validés
    usedPairs.sort((a, b) => {
        const getValidatedCount = (pair) => {
            const [src, tgt] = pair.split('-');
            let count = 0;
            vocabulary.forEach(word => {
                if (getWordStatus(src, tgt, word.id) === 'validé') count++;
            });
            return count;
        };
        return getValidatedCount(b) - getValidatedCount(a);
    });

    usedPairs.forEach(pair => {
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

        const pctA1 = totalByLevel.A1 > 0 ? Math.round((validatedByLevel.A1 / totalByLevel.A1) * 100) : 0;
        const pctA2 = totalByLevel.A2 > 0 ? Math.round((validatedByLevel.A2 / totalByLevel.A2) * 100) : 0;
        const pctB1 = totalByLevel.B1 > 0 ? Math.round((validatedByLevel.B1 / totalByLevel.B1) * 100) : 0;
        const pctB2 = totalByLevel.B2 > 0 ? Math.round((validatedByLevel.B2 / totalByLevel.B2) * 100) : 0;
        const pctC1 = totalByLevel.C1 > 0 ? Math.round((validatedByLevel.C1 / totalByLevel.C1) * 100) : 0;
        const pctC2 = totalByLevel.C2 > 0 ? Math.round((validatedByLevel.C2 / totalByLevel.C2) * 100) : 0;

        const lang = getAppLanguage();
        const card = document.createElement('div');
        card.className = 'stat-card';
        card.innerHTML = `
            <div class="stat-card-header">
                <span class="stat-pair-name">${getLangName(src)} ➔ ${getLangName(tgt)}</span>
                <span class="stat-percentage-badge">${percentage}%</span>
            </div>
            <div class="stat-body">
                <div class="stat-row" style="margin-bottom: 0.5rem; font-weight: bold; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem;">
                    <span class="stat-label">${translations[lang].stat_total}</span>
                    <span class="stat-value">${total}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">${translations[lang].stat_validated}</span>
                    <span class="stat-value">${validated}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">${translations[lang].stat_a1_validated}</span>
                    <span class="stat-value">${validatedByLevel.A1} / ${totalByLevel.A1} <span style="color: var(--success-color); font-size: 0.8rem; margin-left: 0.3rem;">(${pctA1}%)</span></span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">${translations[lang].stat_a2_validated}</span>
                    <span class="stat-value">${validatedByLevel.A2} / ${totalByLevel.A2} <span style="color: var(--success-color); font-size: 0.8rem; margin-left: 0.3rem;">(${pctA2}%)</span></span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">${translations[lang].stat_b1_validated}</span>
                    <span class="stat-value">${validatedByLevel.B1} / ${totalByLevel.B1} <span style="color: var(--success-color); font-size: 0.8rem; margin-left: 0.3rem;">(${pctB1}%)</span></span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">${translations[lang].stat_b2_validated}</span>
                    <span class="stat-value">${validatedByLevel.B2} / ${totalByLevel.B2} <span style="color: var(--success-color); font-size: 0.8rem; margin-left: 0.3rem;">(${pctB2}%)</span></span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">${translations[lang].stat_c1_validated}</span>
                    <span class="stat-value">${validatedByLevel.C1} / ${totalByLevel.C1} <span style="color: var(--success-color); font-size: 0.8rem; margin-left: 0.3rem;">(${pctC1}%)</span></span>
                </div>
                <div class="stat-row" style="margin-bottom: 0.5rem; border-bottom: 1px solid #e5e7eb; padding-bottom: 0.5rem;">
                    <span class="stat-label">${translations[lang].stat_c2_validated}</span>
                    <span class="stat-value">${validatedByLevel.C2} / ${totalByLevel.C2} <span style="color: var(--success-color); font-size: 0.8rem; margin-left: 0.3rem;">(${pctC2}%)</span></span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">${translations[lang].stat_remaining}</span>
                    <span class="stat-value">${restant}</span>
                </div>
                <div class="stat-progress-container">
                    <div class="stat-progress-bar" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
        if (container) container.appendChild(card);
    });
}

// Override renderView pour attacher les events
const originalRenderView = renderView;
renderView = function(viewId) {
    originalRenderView(viewId);
    attachViewEvents(viewId);
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
            renderView(viewId);
        }
    });

    // Appliquer la traduction initiale sur la page globale
    translatePage();

    // Afficher la page d'accueil par défaut
    renderView('home');
    console.log(`Dictionnaire chargé avec ${vocabulary.length} mots.`);

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
                        const suffix = newLang === 'fr' ? 'mots' : (newLang === 'es' ? 'palabras' : (newLang === 'de' ? 'Wörter' : 'words'));
                        volDisp.textContent = `${inputVol.value} ${suffix}`;
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
    
    const inputFirstname = document.getElementById('cert-firstname');
    const inputLastname = document.getElementById('cert-lastname');
    
    if (inputFirstname && inputLastname) {
        inputFirstname.value = localStorage.getItem('cert_firstname') || '';
        inputLastname.value = localStorage.getItem('cert_lastname') || '';
        
        const saveName = () => {
            localStorage.setItem('cert_firstname', inputFirstname.value.trim());
            localStorage.setItem('cert_lastname', inputLastname.value.trim());
        };
        
        inputFirstname.oninput = saveName;
        inputLastname.oninput = saveName;
    }

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

function openCertificateModal(src, tgt, validated, validatedByLevel, totalByLevel) {
    const modal = document.getElementById('cert-modal');
    const canvas = document.getElementById('cert-canvas');
    if (!modal || !canvas) return;

    modal.classList.remove('hidden');

    const ctx = canvas.getContext('2d');
    const lang = getAppLanguage();

    // Dessiner l'attestation sur le canvas
    drawCertificateOnCanvas(ctx, src, tgt, validated, validatedByLevel, totalByLevel, lang);

    // Configurer le téléchargement
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

    // Configurer le partage LinkedIn
    const btnLinkedin = document.getElementById('btn-linkedin-cert');
    if (btnLinkedin) {
        btnLinkedin.onclick = () => {
            const langName = getLangName(tgt);
            let postTemplate = translations[lang].linkedin_post_text;
            let postText = postTemplate.replace('{count}', validated).replace('{langName}', langName);
            
            // Copier dans le presse-papiers
            navigator.clipboard.writeText(postText).then(() => {
                alert(translations[lang].linkedin_instructions);
                window.open('https://www.linkedin.com/feed/?shareActive=true', '_blank');
            }).catch(err => {
                console.error("Impossible de copier dans le presse-papiers : ", err);
                window.open('https://www.linkedin.com/feed/?shareActive=true', '_blank');
            });
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
    const order = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    let highestMastered = 'A1';

    for (let i = 0; i < order.length; i++) {
        const lvl = order[i];
        const val = (validatedByLevel && validatedByLevel[lvl]) || 0;
        const tot = (totalByLevel && totalByLevel[lvl]) || 1;
        const pct = Math.round((val / tot) * 100);

        // Un niveau est considéré comme atteint dès lors qu'au moins 60% de ses mots sont validés
        if (pct >= 60) {
            highestMastered = lvl;
        } else if (val >= 100 && i === 0) {
            highestMastered = 'A1';
        }
    }
    return highestMastered;
}

function drawCertificateOnCanvas(ctx, src, tgt, validated, validatedByLevel, totalByLevel, lang) {
    const w = 800;
    const h = 600;

    // Fond blanc avec dégradé subtil
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);

    const bgGrad = ctx.createLinearGradient(0, 0, w, h);
    bgGrad.addColorStop(0, '#ffffff');
    bgGrad.addColorStop(0.5, '#f8fafc');
    bgGrad.addColorStop(1, '#f1f5f9');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    // Bordure extérieure avec coins arrondis
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, 16, 16, w - 32, h - 32, 12, false, true);

    // Liseré coloré en haut (dégradé signature drillFlow)
    const barGrad = ctx.createLinearGradient(16, 16, w - 16, 16);
    barGrad.addColorStop(0, '#4f46e5');
    barGrad.addColorStop(0.5, '#6366f1');
    barGrad.addColorStop(1, '#06b6d4');
    ctx.fillStyle = barGrad;
    drawRoundedRect(ctx, 17, 17, w - 34, 5, 2, true, false);

    // 1. HEADER (Logo + Tagline épuré)
    // Logo "drillFlow."
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = 'bold 22px "Outfit", sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText('drill', 40, 50);
    const drillW = ctx.measureText('drill').width;

    ctx.fillStyle = '#4f46e5';
    ctx.fillText('Flow.', 40 + drillW, 50);

    // Tagline sous le logo: "Master language faster."
    ctx.font = '500 11px "Inter", sans-serif';
    ctx.fillStyle = '#64748b';
    ctx.fillText('Master language ', 40, 66);
    const tagW = ctx.measureText('Master language ').width;

    ctx.fillStyle = '#4f46e5';
    ctx.font = 'bold 11px "Inter", sans-serif';
    ctx.fillText('faster.', 40 + tagW, 66);

    // Badge discret application à droite
    ctx.font = '600 11px "Inter", sans-serif';
    ctx.fillStyle = '#6366f1';
    ctx.textAlign = 'right';
    ctx.fillText('drill-flow.app', 760, 52);

    // Ligne de séparation
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(40, 78);
    ctx.lineTo(760, 78);
    ctx.stroke();

    // 2. TITRE & APPRENANT
    ctx.textAlign = 'center';

    // Titre Document
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 16px "Outfit", sans-serif';
    ctx.fillText(translations[lang].cert_achievement, w / 2, 98);

    // Subtitle "Délivrée à :"
    ctx.fillStyle = '#64748b';
    ctx.font = '500 12px "Inter", sans-serif';
    ctx.fillText(translations[lang].cert_awarded_to, w / 2, 118);

    // Nom complet
    const fname = localStorage.getItem('cert_firstname') || '';
    const lname = localStorage.getItem('cert_lastname') || '';
    const fullName = (fname || lname) ? `${fname} ${lname}`.trim() : translations[lang].cert_default_learner;
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 24px "Outfit", sans-serif';
    ctx.fillText(fullName, w / 2, 144);

    // Langues & Badge
    const srcName = getLangName(src).toUpperCase();
    const tgtName = getLangName(tgt).toUpperCase();
    const pairSummary = `${srcName} ➔ ${tgtName} • VOCABULAIRE RÉFLEXE`;
    ctx.font = 'bold 10px "Inter", sans-serif';
    const pairW = ctx.measureText(pairSummary).width + 24;
    const pairX = (w - pairW) / 2;

    ctx.fillStyle = '#0f172a';
    drawRoundedRect(ctx, pairX, 156, pairW, 22, 11, true, false);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(pairSummary, w / 2, 171);

    // 3. NIVEAU CECRL GLOBAL ATTEINT (Calculé rigoureusement selon la progression réelle)
    const globalLevel = computeGlobalCefrLevel(validatedByLevel, totalByLevel);
    const levelDescKey = `cefr_desc_${globalLevel}`;
    const levelDesc = (translations[lang] && translations[lang][levelDescKey]) || 'Utilisateur';

    // Boîte niveau global
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.5;
    drawRoundedRect(ctx, 40, 186, 720, 62, 10, true, true);

    // Badge Niveau à gauche
    const lvlGrad = ctx.createLinearGradient(50, 192, 110, 242);
    lvlGrad.addColorStop(0, '#4f46e5');
    lvlGrad.addColorStop(1, '#3b82f6');
    ctx.fillStyle = lvlGrad;
    drawRoundedRect(ctx, 50, 192, 60, 50, 8, true, false);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = 'bold 22px "Outfit", sans-serif';
    ctx.fillText(globalLevel, 80, 222);

    ctx.font = 'bold 9px "Inter", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText('CECRL', 80, 235);

    // Texte descriptif au centre
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 14px "Outfit", sans-serif';
    const globalLabel = translations[lang].cert_global_level || 'Niveau global atteint :';
    ctx.fillText(`${globalLabel} ${globalLevel} — ${levelDesc}`, 125, 212);

    ctx.fillStyle = '#64748b';
    ctx.font = '400 11px "Inter", sans-serif';
    ctx.fillText(translations[lang].cert_cefr_framework, 125, 231);

    // Metric à droite
    ctx.fillStyle = 'rgba(99, 102, 241, 0.08)';
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, 575, 193, 172, 48, 8, true, true);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#4f46e5';
    ctx.font = 'bold 16px "Outfit", sans-serif';
    ctx.fillText(`${validated}`, 661, 215);

    ctx.fillStyle = '#475569';
    ctx.font = '500 10px "Inter", sans-serif';
    ctx.fillText(translations[lang].cert_total_words || 'mots maîtrisés', 661, 230);

    // 4. SCORECARD DÉTAIL PAR NIVEAU CECRL
    ctx.textAlign = 'left';
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 12px "Inter", sans-serif';
    ctx.fillText(translations[lang].cert_levels_prefix, 40, 266);

    const cefrColors = {
        A1: { bg: '#dbeafe', text: '#1e40af', bar: '#2563eb' },
        A2: { bg: '#e0e7ff', text: '#3730a3', bar: '#4f46e5' },
        B1: { bg: '#fef3c7', text: '#92400e', bar: '#d97706' },
        B2: { bg: '#ffedd5', text: '#9a3412', bar: '#ea580c' },
        C1: { bg: '#fae8ff', text: '#86198f', bar: '#9333ea' },
        C2: { bg: '#dcfce7', text: '#166534', bar: '#059669' }
    };

    const levelItems = [
        { lvl: 'A1', col: 0, row: 0 },
        { lvl: 'A2', col: 0, row: 1 },
        { lvl: 'B1', col: 0, row: 2 },
        { lvl: 'B2', col: 1, row: 0 },
        { lvl: 'C1', col: 1, row: 1 },
        { lvl: 'C2', col: 1, row: 2 }
    ];

    const colWidth = 345;
    const colGap = 30;
    const startX = 40;
    const startY = 278;
    const rowH = 46;

    levelItems.forEach(item => {
        const x = startX + item.col * (colWidth + colGap);
        const y = startY + item.row * rowH;
        const lvl = item.lvl;
        const color = cefrColors[lvl];
        const val = (validatedByLevel && validatedByLevel[lvl]) || 0;
        const tot = (totalByLevel && totalByLevel[lvl]) || 0;
        const pct = tot > 0 ? Math.round((val / tot) * 100) : 0;
        const desc = (translations[lang] && translations[lang][`cefr_desc_${lvl}`]) || lvl;

        // Badge niveau
        ctx.fillStyle = color.bg;
        drawRoundedRect(ctx, x, y, 28, 18, 4, true, false);

        ctx.textAlign = 'center';
        ctx.fillStyle = color.text;
        ctx.font = 'bold 10px "Inter", sans-serif';
        ctx.fillText(lvl, x + 14, y + 13);

        // Intitulé niveau
        ctx.textAlign = 'left';
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 11px "Inter", sans-serif';
        ctx.fillText(desc, x + 34, y + 13);

        // Stats chiffres
        ctx.textAlign = 'right';
        ctx.fillStyle = '#475569';
        ctx.font = 'bold 11px "Inter", sans-serif';
        ctx.fillText(`${val} / ${tot} (${pct}%)`, x + colWidth, y + 13);

        // Barre de progression (fond)
        ctx.fillStyle = '#e2e8f0';
        drawRoundedRect(ctx, x, y + 22, colWidth, 7, 3.5, true, false);

        // Barre de progression (remplie)
        if (pct > 0) {
            const filledW = Math.max(7, Math.round((pct / 100) * colWidth));
            ctx.fillStyle = color.bar;
            drawRoundedRect(ctx, x, y + 22, filledW, 7, 3.5, true, false);
        }
    });

    // 5. BAS DE PAGE / VALIDATION OFFICIELLE
    const footY = 426;
    ctx.fillStyle = '#f8fafc';
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1.2;
    drawRoundedRect(ctx, 40, footY, 720, 140, 10, true, true);

    const dateStr = new Date().toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'fr' ? 'fr-FR' : lang === 'de' ? 'de-DE' : 'es-ES');

    // Informations à gauche
    ctx.textAlign = 'left';
    ctx.fillStyle = '#334155';
    ctx.font = 'bold 11px "Inter", sans-serif';
    ctx.fillText(`📅 ${translations[lang].cert_date || 'Date :'} ${dateStr}`, 55, footY + 32);

    ctx.fillStyle = '#64748b';
    ctx.font = '400 11px "Inter", sans-serif';
    ctx.fillText(`⚡ ${translations[lang].cert_for_mastering}`, 55, footY + 62);
    ctx.fillText('🛡️ drillFlow : Entraînement actif au vocabulaire & répétition réflexe', 55, footY + 88);

    ctx.fillStyle = '#4f46e5';
    ctx.font = 'bold 11px "Inter", sans-serif';
    ctx.fillText('🌐 drill-flow.app', 55, footY + 114);

    // Tampon / Badge d'attestation à droite
    const stampX = 595;
    const stampY = footY + 20;
    const stampW = 150;
    const stampH = 100;

    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    drawRoundedRect(ctx, stampX, stampY, stampW, stampH, 8, true, true);

    // Liseré vert discret
    ctx.fillStyle = '#10b981';
    drawRoundedRect(ctx, stampX + 1, stampY + 1, stampW - 2, 4, 2, true, false);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#059669';
    ctx.font = 'bold 12px "Outfit", sans-serif';
    ctx.fillText(translations[lang].cert_seal_text || '✓ ATTESTÉ', stampX + stampW / 2, stampY + 36);

    ctx.fillStyle = '#1e293b';
    ctx.font = '600 10px "Inter", sans-serif';
    ctx.fillText('drillFlow. Learning', stampX + stampW / 2, stampY + 58);

    ctx.fillStyle = '#6366f1';
    ctx.font = '500 9px "Inter", sans-serif';
    ctx.fillText('drill-flow.app', stampX + stampW / 2, stampY + 78);
}
