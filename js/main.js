import { vocabulary } from './data/vocabulary.js?v=29';
import { initDrillSession, handleDrillKeydown, flipTranslation } from './drill.js?v=29';
import { loadProgress, setWordStatus, getWordStatus } from './storage.js?v=29';
import { translations } from './i18n.js?v=34';

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

themeToggle.addEventListener('click', () => {
    const currentTheme = htmlEl.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    htmlEl.setAttribute('data-theme', newTheme);
    themeToggle.innerHTML = newTheme === 'dark' ? iconDark : iconLight;
});

// Set default icon
themeToggle.innerHTML = htmlEl.getAttribute('data-theme') === 'dark' ? iconDark : iconLight;

// --- Routeur très simple (SPA) ---
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
        const lastLevel = localStorage.getItem('voc_last_level') || 'all';

        const selectSrc = document.getElementById('select-lang-source');
        const selectTgt = document.getElementById('select-lang-target');
        const selectLevel = document.getElementById('select-level');
        
        function updateTargetOptions() {
            if (!selectSrc || !selectTgt) return;
            const srcVal = selectSrc.value;
            const prevTgtVal = selectTgt.value;
            
            selectTgt.innerHTML = '';
            
            const langs = [
                { value: 'fr', text: 'Français (FR)' },
                { value: 'en', text: 'Anglais (EN)' },
                { value: 'de', text: 'Allemand (DE)' },
                { value: 'es', text: 'Espagnol (ES)' }
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
        
        if (selectLevel) selectLevel.value = lastLevel;
        
        if (inputVol && volDisp) {
            inputVol.value = lastVol;
            volDisp.textContent = `${lastVol} mots`;
            
            inputVol.addEventListener('input', (e) => {
                volDisp.textContent = `${e.target.value} mots`;
            });
        }
        
        if (btnStart) {
            function updateAvailableCount() {
                const src = selectSrc ? selectSrc.value : 'fr';
                const tgt = selectTgt ? selectTgt.value : 'en';
                const introEl = document.getElementById('home-intro-text');
                const remainingEl = document.getElementById('home-remaining-text');
                if (!introEl || !remainingEl) return;
                
                const lang = getAppLanguage();
                
                // 1. Sentence with total count (500)
                const totalText = translations[lang].subtitle_home_intro
                    .replace('{total}', `<span style="font-weight: bold; color: var(--primary-color);">${vocabulary.length}</span>`);
                introEl.innerHTML = totalText;
                
                // 2. Sentence with remaining count depending on language pair selection
                if (src === tgt) {
                    remainingEl.innerHTML = '';
                    return;
                }
                
                let count = 0;
                const level = selectLevel ? selectLevel.value : 'all';
                vocabulary.forEach(w => {
                    if (getWordStatus(src, tgt, w.id) !== 'validé' && (level === 'all' || w.level === level)) count++;
                });
                
                const remainingText = translations[lang].subtitle_home_remaining
                    .replace('{remaining}', `<span style="font-weight: bold; color: var(--primary-color);">${count}</span>`);
                remainingEl.innerHTML = remainingText;
            }

            if (selectSrc) selectSrc.addEventListener('change', updateAvailableCount);
            if (selectTgt) selectTgt.addEventListener('change', updateAvailableCount);
            if (selectLevel) selectLevel.addEventListener('change', updateAvailableCount);
            updateAvailableCount();

            // Empêcher les doublons d'écouteurs si la vue est rechargée
            const newBtn = btnStart.cloneNode(true);
            btnStart.parentNode.replaceChild(newBtn, btnStart);
            
            newBtn.addEventListener('click', () => {
                const src = document.getElementById('select-lang-source').value;
                const tgt = document.getElementById('select-lang-target').value;
                const vol = parseInt(document.getElementById('input-volume').value, 10);
                const level = document.getElementById('select-level') ? document.getElementById('select-level').value : 'all';
                if (src === tgt) {
                    alert("Les deux langues doivent être différentes.");
                    return;
                }

                // Sauvegarder les langues sélectionnées
                localStorage.setItem('voc_last_src', src);
                localStorage.setItem('voc_last_tgt', tgt);
                localStorage.setItem('voc_last_vol', vol);
                localStorage.setItem('voc_last_level', level);

                renderView('drill');
                initDrillSession(src, tgt, vol, level);
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
                // Sur PC, on ne fait rien au clic (on utilise Entrée).
                // Sur mobile, le clic simule Entrée pour avancer à un doigt.
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
        
        if (btnFlip) {
            btnFlip.addEventListener('click', flipTranslation);
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

function initProgressView() {
    const progress = loadProgress();
    const usedPairs = Object.keys(progress).filter(key => {
        return progress[key] && typeof progress[key] === 'object' && Object.keys(progress[key]).length > 0;
    });

    const emptyState = document.getElementById('progress-empty-state');
    const mainCard = document.getElementById('progress-content');

    if (usedPairs.length === 0) {
        if (emptyState) emptyState.style.display = 'flex';
        if (mainCard) mainCard.style.display = 'none';
        
        const btnGo = document.getElementById('btn-go-to-training');
        if (btnGo) {
            btnGo.onclick = () => renderView('home');
        }
        return;
    }

    if (emptyState) emptyState.style.display = 'none';
    if (mainCard) mainCard.style.display = 'block';

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

    ['a1', 'a2', 'b1'].forEach(level => {
        const cb = document.getElementById(`filter-level-${level}`);
        if (cb) {
            cb.checked = true;
            cb.onchange = () => {
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

    const filtered = vocabulary.filter(word => {
        if (word.type === 'nom' && !filterNom) return false;
        if (word.type === 'verbe' && !filterVerbe) return false;
        if (word.type === 'adjectif' && !filterAdjectif) return false;
        if (word.type === 'adverbe' && !filterAdverbe) return false;
        if (word.type === 'conjonction' && !filterConjonction) return false;
        
        if (word.level === 'A1' && !filterA1) return false;
        if (word.level === 'A2' && !filterA2) return false;
        if (word.level === 'B1' && !filterB1) return false;

        const srcText = (word[src] || '').toLowerCase();
        const tgtText = (word[tgt] || '').toLowerCase();
        return srcText.includes(query) || tgtText.includes(query);
    });

    if (filtered.length === 0) {
        const lang = getAppLanguage();
        const emptyMsg = translations[lang].search_no_results;
        tableBody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: var(--text-secondary); padding: 2rem;">${emptyMsg}</td></tr>`;
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
        const status = getWordStatus(src, tgt, word.id);
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
            if (word.level === 'A1') { badgeBg = 'rgba(96, 165, 250, 0.2)'; badgeColor = '#60a5fa'; }
            if (word.level === 'A2') { badgeBg = 'rgba(251, 191, 36, 0.2)'; badgeColor = '#fbbf24'; }
            if (word.level === 'B1') { badgeBg = 'rgba(251, 113, 133, 0.2)'; badgeColor = '#fb7185'; }
            
            tdLevel.innerHTML = `<span class="type-badge" style="font-size: 0.65rem; padding: 0.15rem 0.45rem; background: ${badgeBg}; color: ${badgeColor}; font-weight: 600;">${word.level}</span>`;
        } else {
            tdLevel.textContent = '-';
        }
        tr.appendChild(tdLevel);

        const tdStatus = document.createElement('td');
        tdStatus.className = `status-cell ${status === 'validé' ? 'valide' : 'actif'}`;
        tdStatus.textContent = status === 'validé' ? '✓' : '\u00A0';
        tr.appendChild(tdStatus);

        tr.style.cursor = 'pointer';
        tr.onclick = (e) => {
            if (e.target.tagName.toLowerCase() === 'input') return; // Ne pas interférer avec la checkbox
            const newStatus = status === 'validé' ? 'actif' : 'validé';
            setWordStatus(src, tgt, word.id, newStatus);
            renderProgressTable();
        };

        tableBody.appendChild(tr);
    });
}



// --- Gestion de la vue Statistiques ---
function initStatsView() {
    const progress = loadProgress();
    const usedPairs = Object.keys(progress).filter(key => {
        return progress[key] && typeof progress[key] === 'object' && Object.keys(progress[key]).length > 0;
    });

    const emptyState = document.getElementById('stats-empty-state');
    const container = document.getElementById('stats-container');

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

    usedPairs.forEach(pair => {
        const [src, tgt] = pair.split('-');
        const total = vocabulary.length;
        let validated = 0;
        vocabulary.forEach(word => {
            if (getWordStatus(src, tgt, word.id) === 'validé') {
                validated++;
            }
        });
        const restant = total - validated;
        const percentage = total > 0 ? Math.round((validated / total) * 100) : 0;

        const lang = getAppLanguage();
        const card = document.createElement('div');
        card.className = 'stat-card';
        card.innerHTML = `
            <div class="stat-card-header">
                <span class="stat-pair-name">${LANG_NAMES[src] || src.toUpperCase()} ➔ ${LANG_NAMES[tgt] || tgt.toUpperCase()}</span>
                <span class="stat-percentage-badge">${percentage}%</span>
            </div>
            <div class="stat-body">
                <div class="stat-row">
                    <span class="stat-label">${translations[lang].stat_total}</span>
                    <span class="stat-value">${total}</span>
                </div>
                <div class="stat-row">
                    <span class="stat-label">${translations[lang].stat_validated}</span>
                    <span class="stat-value">${validated}</span>
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
    // Initialiser le selecteur de langue de l'application
    const langSelect = document.getElementById('app-lang-select');
    if (langSelect) {
        langSelect.value = getAppLanguage();
        langSelect.addEventListener('change', (e) => {
            const newLang = e.target.value;
            setAppLanguage(newLang);
            
            // Traduire l'en-tete statique et la page courante
            translatePage();
            
            // Si on est sur l'accueil, mettre a jour le compteur disponible
            const viewHomeEl = document.getElementById('home-intro-text');
            if (viewHomeEl) {
                const selectSrc = document.getElementById('select-lang-source');
                if (selectSrc) {
                    selectSrc.dispatchEvent(new Event('change'));
                }
            }
            
            // Si on est sur la liste des mots, rafraichir le tableau
            const progTable = document.getElementById('prog-table-body');
            if (progTable) {
                renderProgressTable();
            }
            
            // Si on est sur les stats, rafraîchir les stats
            const statsContainer = document.getElementById('stats-container');
            if (statsContainer) {
                initStatsView();
            }
            
            // Si on est sur les certificats, rafraîchir les certificats
            const certsContainer = document.getElementById('certs-container');
            if (certsContainer) {
                initCertsView();
            }
        });
    }

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
});

// --- Gestion de la vue Certificats ---
function initCertsView() {
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

    const emptyState = document.getElementById('certs-empty-state');
    const container = document.getElementById('certs-container');

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

    usedPairs.forEach(pair => {
        const [src, tgt] = pair.split('-');
        let validated = 0;
        vocabulary.forEach(word => {
            if (getWordStatus(src, tgt, word.id) === 'validé') {
                validated++;
            }
        });

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
            openCertificateModal(src, tgt, validated);
        };

        if (container) container.appendChild(card);
    });
}

function openCertificateModal(src, tgt, validated) {
    const modal = document.getElementById('cert-modal');
    const canvas = document.getElementById('cert-canvas');
    if (!modal || !canvas) return;

    modal.classList.remove('hidden');

    const ctx = canvas.getContext('2d');
    const lang = getAppLanguage();

    // Dessiner le certificat sur le canvas
    drawCertificateOnCanvas(ctx, src, tgt, validated, lang);

    // Configurer le telechargement
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
            // Generer le message du post
            const langName = (LANG_NAMES[tgt] || tgt.toUpperCase());
            let postTemplate = translations[lang].linkedin_post_text;
            let postText = postTemplate.replace('{count}', validated).replace('{langName}', langName);
            
            // Copier dans le presse-papiers
            navigator.clipboard.writeText(postText).then(() => {
                // Informer l'utilisateur avec des instructions de collage
                alert(translations[lang].linkedin_instructions);
                // Ouvrir la page de creation de post LinkedIn
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

function drawCertificateOnCanvas(ctx, src, tgt, validated, lang) {
    const w = 800;
    const h = 600;

    // 1. Fond creme degrade radial
    const grad = ctx.createRadialGradient(w/2, h/2, 50, w/2, h/2, 400);
    grad.addColorStop(0, '#fefdfb');
    grad.addColorStop(1, '#f6f1e5');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 2. Bordures Or
    ctx.strokeStyle = '#c5a880';
    ctx.lineWidth = 2;
    ctx.strokeRect(20, 20, w - 40, h - 40);

    ctx.lineWidth = 6;
    ctx.strokeRect(28, 28, w - 56, h - 56);

    // Coins decoratifs
    const drawCorner = (x, y, rotation) => {
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(rotation);
        ctx.fillStyle = '#c5a880';
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(20, 0);
        ctx.lineTo(20, 4);
        ctx.lineTo(4, 4);
        ctx.lineTo(4, 20);
        ctx.lineTo(0, 20);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    };

    drawCorner(38, 38, 0);
    drawCorner(w - 38, 38, Math.PI / 2);
    drawCorner(w - 38, h - 38, Math.PI);
    drawCorner(38, h - 38, -Math.PI / 2);

    // 3. Textes
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // En-tete
    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 32px "Outfit", sans-serif';
    ctx.fillText(translations[lang].cert_achievement, w / 2, 90);

    // Subtitle
    ctx.fillStyle = '#64748b';
    ctx.font = 'italic 15px "Outfit", sans-serif';
    ctx.fillText(translations[lang].cert_awarded_to, w / 2, 130);

    // Nom de l'apprenant
    const fname = localStorage.getItem('cert_firstname') || '';
    const lname = localStorage.getItem('cert_lastname') || '';
    const fullName = (fname || lname) ? `${fname} ${lname}`.trim() : translations[lang].cert_default_learner;
    ctx.fillStyle = '#c5a880';
    ctx.font = 'bold 28px "Outfit", sans-serif';
    ctx.fillText(fullName, w / 2, 175);

    // Ligne doree
    ctx.strokeStyle = '#d9c3a3';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 180, 210);
    ctx.lineTo(w / 2 + 180, 210);
    ctx.stroke();

    // Ligne explicative
    ctx.fillStyle = '#475569';
    ctx.font = '15px "Inter", sans-serif';
    ctx.fillText(translations[lang].cert_for_mastering, w / 2, 250);

    // Langues
    const srcName = (LANG_NAMES[src] || src.toUpperCase()).toUpperCase();
    const tgtName = (LANG_NAMES[tgt] || tgt.toUpperCase()).toUpperCase();
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 36px "Outfit", sans-serif';
    ctx.fillText(`${srcName}  ➔  ${tgtName}`, w / 2, 305);

    // Nombre de mots
    ctx.fillStyle = '#1e293b';
    ctx.font = '500 18px "Inter", sans-serif';
    ctx.fillText(`${translations[lang].cert_total_words} ${validated}`, w / 2, 360);

    // 4. Sceau de Cire
    const sealX = w / 2;
    const sealY = 440;

    // Rubans
    ctx.fillStyle = '#b91c1c';
    ctx.beginPath();
    ctx.moveTo(sealX - 25, sealY);
    ctx.lineTo(sealX - 45, sealY + 80);
    ctx.lineTo(sealX - 25, sealY + 70);
    ctx.lineTo(sealX - 5, sealY + 80);
    ctx.lineTo(sealX - 10, sealY);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(sealX + 10, sealY);
    ctx.lineTo(sealX + 5, sealY + 80);
    ctx.lineTo(sealX + 25, sealY + 70);
    ctx.lineTo(sealX + 45, sealY + 80);
    ctx.lineTo(sealX + 25, sealY);
    ctx.fill();

    // Sceau exterieur festonne
    ctx.fillStyle = '#d9a752';
    ctx.strokeStyle = '#c59543';
    ctx.lineWidth = 2;
    
    ctx.save();
    ctx.translate(sealX, sealY);
    ctx.beginPath();
    const numPoints = 40;
    const innerRadius = 42;
    const outerRadius = 48;
    for (let i = 0; i < numPoints * 2; i++) {
        const angle = (i * Math.PI) / numPoints;
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const sx = radius * Math.cos(angle);
        const sy = radius * Math.sin(angle);
        if (i === 0) {
            ctx.moveTo(sx, sy);
        } else {
            ctx.lineTo(sx, sy);
        }
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();

    // Sceau interieur
    ctx.fillStyle = '#e5b869';
    ctx.beginPath();
    ctx.arc(sealX, sealY, 36, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Sceau texte
    ctx.fillStyle = '#7f5919';
    ctx.font = 'bold 11px "Outfit", sans-serif';
    ctx.fillText(translations[lang].cert_seal_text, sealX, sealY);

    // 5. Date & Signature lines
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;

    ctx.beginPath();
    ctx.moveTo(100, 500);
    ctx.lineTo(250, 500);
    ctx.stroke();
    
    ctx.fillStyle = '#64748b';
    ctx.font = '13px "Inter", sans-serif';
    const dateStr = new Date().toLocaleDateString(lang === 'en' ? 'en-US' : lang === 'fr' ? 'fr-FR' : lang);
    ctx.fillText(`${translations[lang].cert_date} ${dateStr}`, 175, 520);

    ctx.beginPath();
    ctx.moveTo(w - 250, 500);
    ctx.lineTo(w - 100, 500);
    ctx.stroke();

    ctx.fillText(translations[lang].cert_signature, w - 175, 520);

    // Filigrane
    ctx.fillStyle = 'rgba(197, 168, 128, 0.15)';
    ctx.font = 'bold 72px "Outfit", sans-serif';
    ctx.fillText('drillFlow', w / 2, h / 2 - 20);
}
