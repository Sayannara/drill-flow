import { vocabulary } from './data/vocabulary.js?v=62';
import { initDrillSession, handleDrillKeydown } from './drill.js?v=62';
import { loadProgress, setWordStatus, getWordStatus, getWordStats } from './storage.js?v=62';
import { translations } from './i18n.js?v=62';
import { loginUser, signUpUser, getCurrentUser } from './auth.js?v=62';

// --- Gestion des Langues (Internationalisation) ---
export function getAppLanguage() {
    return localStorage.getItem('app_lang') || 'fr';
}

export function setAppLanguage(lang) {
    localStorage.setItem('app_lang', lang);
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
}

export function translatePage() {
    const lang = getAppLanguage();
    translateElement(document.body, lang);
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
                    opt.textContent = lang.text;
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
const LANG_NAMES = {
    fr: 'Français',
    en: 'Anglais',
    de: 'Allemand',
    es: 'Espagnol'
};

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
            opt.textContent = `${LANG_NAMES[src] || src.toUpperCase()} ➔ ${LANG_NAMES[tgt] || tgt.toUpperCase()}`;
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

    const filtered = vocabulary.filter(word => {
        const stats = getWordStats(src, tgt, word.id);
        const status = getWordStatus(src, tgt, word.id);
        if ((!stats || !stats.attempts || stats.attempts === 0) && status !== 'ignoré') return false;

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
                <span class="stat-pair-name">${LANG_NAMES[src] || src.toUpperCase()} ➔ ${LANG_NAMES[tgt] || tgt.toUpperCase()}</span>
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

    const btnLogin = document.getElementById('btn-login');
    const btnSignup = document.getElementById('btn-signup');
    const authError = document.getElementById('auth-error');
    
    if (btnLogin && btnSignup) {
        btnLogin.onclick = async () => {
            const email = document.getElementById('auth-email').value;
            const pass = document.getElementById('auth-password').value;
            authError.style.display = 'none';
            const res = await loginUser(email, pass);
            if (res.success) {
                authModal.classList.add('hidden');
            } else {
                authError.style.color = 'var(--error-color)';
                authError.textContent = res.error;
                authError.style.display = 'block';
            }
        };

        btnSignup.onclick = async () => {
            const email = document.getElementById('auth-email').value;
            const pass = document.getElementById('auth-password').value;
            authError.style.display = 'none';
            const res = await signUpUser(email, pass);
            if (res.success) {
                authError.textContent = "Inscription réussie ! Un lien de vérification vous a été envoyé. Veuillez consulter vos e-mails (et vos spams) avant de vous connecter.";
                authError.style.color = 'var(--success-color)';
                authError.style.display = 'block';
            } else {
                authError.style.color = 'var(--error-color)';
                authError.textContent = res.error;
                authError.style.display = 'block';
            }
        };
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
        vocabulary.forEach(word => {
            if (getWordStatus(src, tgt, word.id) === 'validé') {
                validated++;
                if (validatedByLevel[word.level] !== undefined) {
                    validatedByLevel[word.level]++;
                }
            }
        });
        return { pair, src, tgt, validated, validatedByLevel };
    });

    // Trier par nombre de mots validés décroissant
    pairsData.sort((a, b) => b.validated - a.validated);

    pairsData.forEach(data => {
        const { src, tgt, validated } = data;

        // Creer une carte de certificat
        const card = document.createElement('div');
        card.className = 'stat-card';
        
        const pairText = `${LANG_NAMES[src] || src.toUpperCase()} ➔ ${LANG_NAMES[tgt] || tgt.toUpperCase()}`;
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
                alert("Veuillez renseigner votre prénom et votre nom pour générer le certificat.");
                return;
            }
            openCertificateModal(src, tgt, validated, data.validatedByLevel);
        };

        if (container) container.appendChild(card);
    });
}

function openCertificateModal(src, tgt, validated, validatedByLevel) {
    const modal = document.getElementById('cert-modal');
    const canvas = document.getElementById('cert-canvas');
    if (!modal || !canvas) return;

    modal.classList.remove('hidden');

    const ctx = canvas.getContext('2d');
    const lang = getAppLanguage();

    // Dessiner le certificat sur le canvas
    drawCertificateOnCanvas(ctx, src, tgt, validated, validatedByLevel, lang);

    // Configurer le téléchargement
    const btnDownload = document.getElementById('btn-download-cert');
    if (btnDownload) {
        btnDownload.onclick = () => {
            const dataUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.download = `certificat_drillflow_${src}_${tgt}.png`;
            link.href = dataUrl;
            link.click();
        };
    }

    // Configurer le partage LinkedIn
    const btnLinkedin = document.getElementById('btn-linkedin-cert');
    if (btnLinkedin) {
        btnLinkedin.onclick = () => {
            const langName = (LANG_NAMES[tgt] || tgt.toUpperCase());
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

function drawCertificateOnCanvas(ctx, src, tgt, validated, validatedByLevel, lang) {
    const w = 800;
    const h = 600;

    // Fond élégant
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(1, '#f8fafc');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // Bordures
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    ctx.strokeRect(20, 20, w - 40, h - 40);

    ctx.strokeStyle = '#94a3b8';
    ctx.lineWidth = 4;
    ctx.strokeRect(26, 26, w - 52, h - 52);

    // Coins décoratifs
    const drawCorner = (x, y, rotation) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, 15);
        ctx.lineTo(0, 0);
        ctx.lineTo(15, 0);
        ctx.stroke();
        ctx.restore();
    };

    drawCorner(36, 36, 0);
    drawCorner(w - 36, 36, Math.PI / 2);
    drawCorner(w - 36, h - 36, Math.PI);
    drawCorner(36, h - 36, -Math.PI / 2);

    // Filigrane
    ctx.fillStyle = 'rgba(148, 163, 184, 0.05)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = 'bold 100px "Outfit", sans-serif';
    ctx.fillText('drillFlow.', w / 2, h / 2);

    // Textes
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // En-tête
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 36px "Outfit", sans-serif';
    ctx.fillText(translations[lang].cert_achievement, w / 2, 80);

    // Subtitle
    ctx.fillStyle = '#64748b';
    ctx.font = 'italic 16px "Outfit", sans-serif';
    ctx.fillText(translations[lang].cert_awarded_to, w / 2, 120);

    // Nom
    const fname = localStorage.getItem('cert_firstname') || '';
    const lname = localStorage.getItem('cert_lastname') || '';
    const fullName = (fname || lname) ? `${fname} ${lname}`.trim() : translations[lang].cert_default_learner;
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 32px "Outfit", sans-serif';
    ctx.fillText(fullName, w / 2, 160);

    // Ligne de séparation
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 200, 195);
    ctx.lineTo(w / 2 + 200, 195);
    ctx.stroke();

    // Ligne explicative
    ctx.fillStyle = '#475569';
    ctx.font = '15px "Inter", sans-serif';
    ctx.fillText(translations[lang].cert_for_mastering, w / 2, 230);

    // Langues
    const srcName = (LANG_NAMES[src] || src.toUpperCase()).toUpperCase();
    const tgtName = (LANG_NAMES[tgt] || tgt.toUpperCase()).toUpperCase();
    ctx.fillStyle = '#0f172a';
    ctx.font = '800 38px "Outfit", sans-serif';
    ctx.fillText(`${srcName}  ➔  ${tgtName}`, w / 2, 275);

    // Nombre de mots (Total)
    ctx.fillStyle = '#1e293b';
    ctx.font = '600 20px "Inter", sans-serif';
    ctx.fillText(`${translations[lang].cert_total_words} ${validated}`, w / 2, 330);

    // Mots par niveau
    if (validatedByLevel) {
        ctx.fillStyle = '#475569';
        ctx.font = '500 14px "Inter", sans-serif';
        const cefrLabel = translations[lang].cert_levels_prefix || 'CEFR Levels :';
        ctx.textAlign = 'center';
        ctx.fillText(cefrLabel, w / 2, 370);
        
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 16px "Inter", sans-serif';
        
        const startY = 400;
        const lineH = 26;
        
        const drawLevel = (lvl, xPivot, y) => {
            const count = validatedByLevel[lvl] || 0;
            ctx.textAlign = 'right';
            ctx.fillText(`${lvl} :`, xPivot - 5, y);
            ctx.textAlign = 'left';
            ctx.fillText(`${count}`, xPivot + 5, y);
        };
        
        // Row 1
        drawLevel('A1', 350, startY);
        drawLevel('A2', 450, startY);
        // Row 2
        drawLevel('B1', 350, startY + lineH);
        drawLevel('B2', 450, startY + lineH);
        // Row 3
        drawLevel('C1', 350, startY + lineH * 2);
        drawLevel('C2', 450, startY + lineH * 2);
    }

    // Sceau Discret
    const sealX = w / 2;
    const sealY = 515;

    // Rubans
    ctx.fillStyle = '#64748b';
    ctx.beginPath();
    ctx.moveTo(sealX - 20, sealY);
    ctx.lineTo(sealX - 35, sealY + 45); 
    ctx.lineTo(sealX - 20, sealY + 35);
    ctx.lineTo(sealX, sealY + 45);
    ctx.lineTo(sealX - 10, sealY);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(sealX + 10, sealY);
    ctx.lineTo(sealX, sealY + 45);
    ctx.lineTo(sealX + 20, sealY + 35);
    ctx.lineTo(sealX + 35, sealY + 45);
    ctx.lineTo(sealX + 20, sealY);
    ctx.fill();

    // Sceau extérieur
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(sealX, sealY, 35, 0, Math.PI * 2);
    ctx.fill();

    // Sceau intérieur
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(sealX, sealY, 30, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Sceau texte
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 11px "Outfit", sans-serif';
    ctx.fillText(translations[lang].cert_seal_text, sealX, sealY);

    // Date & Signature
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(90, 545);
    ctx.lineTo(240, 545);
    ctx.stroke();
    
    ctx.fillStyle = '#475569';
    ctx.font = '14px "Inter", sans-serif';
    const dateStr = new Date().toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'fr' ? 'fr-FR' : lang);
    ctx.fillText(`${translations[lang].cert_date} ${dateStr}`, 165, 565);

    ctx.beginPath();
    ctx.moveTo(w - 240, 545);
    ctx.lineTo(w - 90, 545);
    ctx.stroke();

    ctx.fillText(translations[lang].cert_signature, w - 165, 565);
}
