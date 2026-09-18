import { vocabulary as originalVocabulary } from './data/vocabulary.js?v=215';
import { initAdminAuthGate } from './admin-auth.js?v=3';

// ==========================================================================
// Constantes & Configuration des Colonnes
// ==========================================================================
const ROW_HEIGHT = 42;
const BUFFER_ROWS = 15;
const STORAGE_KEY_OVERRIDES = 'drillflow_vocab_overrides';
const STORAGE_KEY_COLUMNS = 'drillflow_wm_columns';
const STORAGE_KEY_FILTERS = 'drillflow_wm_filters';
const STORAGE_KEY_COL_WIDTHS = 'drillflow_wm_col_widths';

const DEFAULT_COLUMN_WIDTHS = {
    id: 80,
    level: 75,
    level_step: 65,
    type: 95,
    fr: 190,
    en: 190,
    de: 170,
    es: 170,
    ex_fr: 260,
    ex_en: 260,
    ex_de: 240,
    ex_es: 240
};

let customColWidths = { ...DEFAULT_COLUMN_WIDTHS };

const COLUMNS = [
    { id: 'id', label: 'ID', width: '80px', readOnly: true },
    { id: 'level', label: 'Niveau', width: '75px', isLevel: true },
    { id: 'level_step', label: 'Étape', width: '65px', isStep: true },
    { id: 'type', label: 'Type', width: '95px' },
    { id: 'fr', label: 'Français', width: '190px' },
    { id: 'en', label: 'Anglais', width: '190px' },
    { id: 'de', label: 'Allemand', width: '170px' },
    { id: 'es', label: 'Espagnol', width: '170px' },
    { id: 'ex_fr', label: 'Exemple (FR)', width: '260px' },
    { id: 'ex_en', label: 'Exemple (EN)', width: '260px' },
    { id: 'ex_de', label: 'Exemple (DE)', width: '240px' },
    { id: 'ex_es', label: 'Exemple (ES)', width: '240px' }
];

const LEVEL_WEIGHTS = { 'A1': 1, 'A2': 2, 'B1': 3, 'B2': 4, 'C1': 5, 'C2': 6 };

// ==========================================================================
// État Global du Words Manager
// ==========================================================================
let allWords = [];
let filteredWords = [];
let localOverrides = {};
let modifiedWordIds = new Set();

let activeColumns = new Set(COLUMNS.map(c => c.id));
let currentSortCol = 'id';
let currentSortAsc = true;

let searchQuery = '';
let filterLevel = '';
let filterType = '';
let filterStatus = '';

let saveTimeout = null;

// Application dynamique des largeurs de colonnes personnalisées
function applyColumnWidths() {
    let styleEl = document.getElementById('wm-col-widths');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'wm-col-widths';
        document.head.appendChild(styleEl);
    }

    let css = '';
    COLUMNS.forEach(col => {
        const w = customColWidths[col.id] || DEFAULT_COLUMN_WIDTHS[col.id] || 150;
        css += `.col-${col.id} { width: ${w}px !important; min-width: ${w}px !important; max-width: ${w}px !important; flex-shrink: 0 !important; flex-grow: 0 !important; }\n`;
    });
    styleEl.textContent = css;
}

function saveColWidths() {
    try {
        localStorage.setItem(STORAGE_KEY_COL_WIDTHS, JSON.stringify(customColWidths));
    } catch (e) {
        console.warn("Erreur sauvegarde largeurs colonnes:", e);
    }
}

// Sauvegarde des filtres et options dans le localStorage
function saveFiltersState() {
    try {
        localStorage.setItem(STORAGE_KEY_FILTERS, JSON.stringify({
            searchQuery,
            filterLevel,
            filterType,
            filterStatus,
            currentSortCol,
            currentSortAsc
        }));
    } catch (e) {
        console.warn("Erreur sauvegarde filtres:", e);
    }
}

// ==========================================================================
// Initialisation & Chargement des données
// ==========================================================================
function initData() {
    // 1. Récupérer les modifications locales
    try {
        const stored = localStorage.getItem(STORAGE_KEY_OVERRIDES);
        if (stored) {
            localOverrides = JSON.parse(stored);
            Object.keys(localOverrides).forEach(id => modifiedWordIds.add(id));
        }
    } catch (e) {
        console.warn("Erreur chargement overrides:", e);
        localOverrides = {};
    }

    // 2. Fusionner le vocabulaire d'origine et les overrides
    allWords = originalVocabulary.map(item => {
        if (localOverrides[item.id]) {
            return { ...item, ...localOverrides[item.id], _isModified: true };
        }
        return { ...item };
    });

    // 3. Charger les préférences de colonnes
    try {
        const storedCols = localStorage.getItem(STORAGE_KEY_COLUMNS);
        if (storedCols) {
            const arr = JSON.parse(storedCols);
            if (Array.isArray(arr) && arr.length > 0) {
                activeColumns = new Set(arr);
                // Si la nouvelle colonne level_step n'était pas dans les préférences sauvegardées, on l'active
                if (!arr.includes('level_step')) {
                    activeColumns.add('level_step');
                }
            }
        }
    } catch (e) {
        // Fallback default
    }

    // 4. Charger les filtres et options mémorisés
    try {
        const storedFilters = localStorage.getItem(STORAGE_KEY_FILTERS);
        if (storedFilters) {
            const parsed = JSON.parse(storedFilters);
            if (typeof parsed.searchQuery === 'string') searchQuery = parsed.searchQuery;
            if (typeof parsed.filterLevel === 'string') filterLevel = parsed.filterLevel;
            if (typeof parsed.filterType === 'string') filterType = parsed.filterType;
            if (typeof parsed.filterStatus === 'string') filterStatus = parsed.filterStatus;
            if (typeof parsed.currentSortCol === 'string') currentSortCol = parsed.currentSortCol;
            if (typeof parsed.currentSortAsc === 'boolean') currentSortAsc = parsed.currentSortAsc;
        }
    } catch (e) {
        console.warn("Erreur chargement filtres:", e);
    }

    // 5. Charger les largeurs personnalisées de colonnes
    try {
        const storedWidths = localStorage.getItem(STORAGE_KEY_COL_WIDTHS);
        if (storedWidths) {
            const parsed = JSON.parse(storedWidths);
            if (typeof parsed === 'object' && parsed !== null) {
                customColWidths = { ...DEFAULT_COLUMN_WIDTHS, ...parsed };
            }
        }
    } catch (e) {
        console.warn("Erreur chargement largeurs colonnes:", e);
    }
    applyColumnWidths();

    updateStatusIndicator();
    applyFiltersAndSort();
}

// ==========================================================================
// Normalisation & Utilitaires
// ==========================================================================
function normalizeStr(str) {
    if (!str) return '';
    return String(str)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// ==========================================================================
// Moteur de Filtrage et de Tri
// ==========================================================================
function applyFiltersAndSort() {
    const searchTerms = searchQuery ? normalizeStr(searchQuery).split(/\s+/).filter(Boolean) : [];
    
    filteredWords = allWords.filter(item => {
        // Filtre niveau
        if (filterLevel && item.level !== filterLevel) return false;

        // Filtre type
        if (filterType) {
            const t = (item.type || '').toLowerCase();
            if (filterType === 'autre') {
                if (['nom', 'verbe', 'adjectif', 'adverbe', 'expression'].includes(t)) return false;
            } else if (!t.includes(filterType)) {
                return false;
            }
        }

        // Filtre statut
        if (filterStatus === 'modified') {
            if (!modifiedWordIds.has(item.id)) return false;
        } else if (filterStatus === 'missing_ex') {
            if (item.ex_fr && item.ex_en) return false;
        }

        // Recherche multi-termes sur toutes les colonnes actives
        if (searchTerms.length > 0) {
            const searchableStr = normalizeStr([
                item.id,
                item.fr,
                item.en,
                item.de,
                item.es,
                item.level,
                item.level_step ? `étape ${item.level_step} step ${item.level_step}` : '',
                item.type,
                item.ex_fr,
                item.ex_en,
                item.ex_de,
                item.ex_es
            ].join(' '));

            const matchesAll = searchTerms.every(term => searchableStr.includes(term));
            if (!matchesAll) return false;
        }

        return true;
    });

    // Application du tri
    filteredWords.sort((a, b) => {
        let valA = a[currentSortCol] || '';
        let valB = b[currentSortCol] || '';

        if (currentSortCol === 'level') {
            const wA = LEVEL_WEIGHTS[valA] || 0;
            const wB = LEVEL_WEIGHTS[valB] || 0;
            return currentSortAsc ? (wA - wB) : (wB - wA);
        }

        if (currentSortCol === 'level_step') {
            const numA = (a.level_step != null && a.level_step !== '') ? Number(a.level_step) : 99;
            const numB = (b.level_step != null && b.level_step !== '') ? Number(b.level_step) : 99;
            return currentSortAsc ? (numA - numB) : (numB - numA);
        }

        if (currentSortCol === 'id') {
            // Tri numérique d'identifiant si format 'word_123'
            const numA = parseInt(String(valA).replace(/\D/g, ''), 10) || 0;
            const numB = parseInt(String(valB).replace(/\D/g, ''), 10) || 0;
            return currentSortAsc ? (numA - numB) : (numB - numA);
        }

        const cmp = String(valA).localeCompare(String(valB), 'fr', { sensitivity: 'base' });
        return currentSortAsc ? cmp : -cmp;
    });

    updateCountUI();
    renderTableHeader();
    renderVirtualTable();
}

function updateCountUI() {
    const countEl = document.getElementById('wm-count');
    if (!countEl) return;
    const total = allWords.length.toLocaleString('fr-FR');
    const current = filteredWords.length.toLocaleString('fr-FR');
    if (filteredWords.length === allWords.length) {
        countEl.textContent = `${total} mots`;
    } else {
        countEl.textContent = `${current} / ${total} mots`;
    }
}

// ==========================================================================
// Rendu de l'En-tête Fixe (avec tri)
// ==========================================================================
// Rendu de l'En-tête Fixe (avec tri et redimensionnement manuel façon Excel)
// ==========================================================================
function renderTableHeader() {
    const headerEl = document.getElementById('wm-table-header');
    if (!headerEl) return;

    headerEl.innerHTML = '';

    COLUMNS.forEach(col => {
        if (!activeColumns.has(col.id)) return;

        const th = document.createElement('div');
        th.className = `wm-th col-${col.id}`;
        th.dataset.col = col.id;
        if (currentSortCol === col.id) {
            th.classList.add(currentSortAsc ? 'sorted-asc' : 'sorted-desc');
        }

        const titleSpan = document.createElement('span');
        titleSpan.textContent = col.label;

        const arrowSpan = document.createElement('span');
        arrowSpan.className = 'wm-sort-arrow';
        arrowSpan.textContent = (currentSortCol === col.id) ? (currentSortAsc ? '▲' : '▼') : '⇅';

        th.appendChild(titleSpan);
        th.appendChild(arrowSpan);

        th.addEventListener('click', (e) => {
            // Ne pas trier si le clic a touché la poignée de redimensionnement
            if (e.target.classList.contains('wm-col-resizer')) return;

            if (currentSortCol === col.id) {
                currentSortAsc = !currentSortAsc;
            } else {
                currentSortCol = col.id;
                currentSortAsc = true;
            }
            saveFiltersState();
            applyFiltersAndSort();
        });

        // Poignée de redimensionnement manuel de colonne
        const resizer = document.createElement('div');
        resizer.className = 'wm-col-resizer';
        resizer.dataset.col = col.id;
        resizer.title = 'Glisser pour redimensionner (double-clic pour réinitialiser)';

        resizer.addEventListener('mousedown', handleResizerMouseDown);
        resizer.addEventListener('dblclick', (e) => {
            e.stopPropagation();
            customColWidths[col.id] = DEFAULT_COLUMN_WIDTHS[col.id] || 150;
            saveColWidths();
            applyColumnWidths();
        });

        th.appendChild(resizer);
        headerEl.appendChild(th);
    });
}

// Gestionnaire de redimensionnement de colonne au clic-glisser
let isColResizing = false;
let currentResizingCol = null;
let resizeStartX = 0;
let resizeStartWidth = 0;

function handleResizerMouseDown(e) {
    e.preventDefault();
    e.stopPropagation();

    const colId = e.target.dataset.col;
    if (!colId) return;

    isColResizing = true;
    currentResizingCol = colId;
    resizeStartX = e.clientX;
    resizeStartWidth = customColWidths[colId] || DEFAULT_COLUMN_WIDTHS[colId] || 150;

    const resizerEl = e.target;
    resizerEl.classList.add('is-resizing');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    function onMouseMove(moveEvent) {
        if (!isColResizing) return;
        const diff = moveEvent.clientX - resizeStartX;
        const newWidth = Math.max(50, Math.min(800, Math.round(resizeStartWidth + diff)));
        customColWidths[currentResizingCol] = newWidth;
        applyColumnWidths();
    }

    function onMouseUp() {
        if (!isColResizing) return;
        isColResizing = false;
        resizerEl.classList.remove('is-resizing');
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        saveColWidths();
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
    }

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
}

// ==========================================================================
// Moteur de Rendu Virtualisé (60 FPS, sans pagination)
// ==========================================================================
function renderVirtualTable() {
    const viewport = document.getElementById('wm-viewport');
    const canvas = document.getElementById('wm-virtual-canvas');
    if (!viewport || !canvas) return;

    const totalRows = filteredWords.length;
    canvas.style.height = `${totalRows * ROW_HEIGHT}px`;

    const scrollTop = viewport.scrollTop;
    const viewportHeight = viewport.clientHeight;

    const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_ROWS);
    const endIndex = Math.min(totalRows, Math.ceil((scrollTop + viewportHeight) / ROW_HEIGHT) + BUFFER_ROWS);

    // Ne réinjecter que les lignes de la fenêtre visible
    canvas.innerHTML = '';
    const fragment = document.createDocumentFragment();

    for (let i = startIndex; i < endIndex; i++) {
        const word = filteredWords[i];
        const rowEl = createTableRow(word, i);
        fragment.appendChild(rowEl);
    }

    canvas.appendChild(fragment);
}

function createTableRow(word, rowIndex) {
    const row = document.createElement('div');
    row.className = 'wm-row';
    row.dataset.row = rowIndex;
    row.dataset.id = word.id;
    row.style.top = `${rowIndex * ROW_HEIGHT}px`;

    if (modifiedWordIds.has(word.id)) {
        row.classList.add('is-modified');
    }

    COLUMNS.forEach(col => {
        if (!activeColumns.has(col.id)) return;

        const cell = document.createElement('div');
        cell.className = `wm-cell col-${col.id}`;
        cell.dataset.col = col.id;

        if (col.readOnly) {
            cell.classList.add('is-read-only');
            cell.textContent = word[col.id] || '';
            row.appendChild(cell);
            return;
        }

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'wm-cell-input';
        input.dataset.id = word.id;
        input.dataset.col = col.id;
        input.dataset.row = rowIndex;

        if (col.isStep) {
            input.style.textAlign = 'center';
            input.style.fontWeight = '700';
            input.placeholder = '-';
            input.value = word.level_step != null ? word.level_step : '';
        } else if (col.isLevel) {
            input.style.textAlign = 'center';
            input.style.fontWeight = '700';
            if (word.level) {
                cell.classList.add(`level-${word.level}`);
            }
            input.value = word[col.id] || '';
        } else {
            input.value = word[col.id] || '';
        }

        // Navigation clavier Excel
        input.addEventListener('keydown', handleCellKeyDown);

        // Sauvegarde automatique directe au changement
        input.addEventListener('input', (e) => {
            handleCellChange(word.id, col.id, e.target.value, cell, row);
        });

        cell.appendChild(input);
        row.appendChild(cell);
    });

    return row;
}

// ==========================================================================
// Navigation Clavier Façon Excel
// ==========================================================================
function handleCellKeyDown(e) {
    const input = e.target;
    const currentRow = parseInt(input.dataset.row, 10);
    const currentCol = input.dataset.col;

    if (e.key === 'Enter' || (e.key === 'ArrowDown' && !e.altKey)) {
        e.preventDefault();
        focusCell(currentRow + 1, currentCol);
    } else if (e.key === 'ArrowUp' && !e.altKey) {
        e.preventDefault();
        focusCell(currentRow - 1, currentCol);
    } else if (e.key === 'Escape') {
        // Annule l'édition de la cellule en cours
        const word = allWords.find(w => w.id === input.dataset.id);
        if (word) {
            input.value = word[currentCol] || '';
            input.blur();
        }
    }
}

function focusCell(targetRowIndex, targetColId) {
    if (targetRowIndex < 0 || targetRowIndex >= filteredWords.length) return;

    // Défilement automatique du viewport si la cellule cible sort de la vue
    const viewport = document.getElementById('wm-viewport');
    const targetTop = targetRowIndex * ROW_HEIGHT;
    if (targetTop < viewport.scrollTop) {
        viewport.scrollTop = targetTop;
    } else if (targetTop + ROW_HEIGHT > viewport.scrollTop + viewport.clientHeight) {
        viewport.scrollTop = targetTop + ROW_HEIGHT - viewport.clientHeight;
    }

    // Donner le focus à l'input correspondant dans le DOM après micro-délai pour virtualisation
    requestAnimationFrame(() => {
        const targetInput = document.querySelector(`input[data-row="${targetRowIndex}"][data-col="${targetColId}"]`);
        if (targetInput) {
            targetInput.focus();
            targetInput.select();
        }
    });
}

// ==========================================================================
// Sauvegarde Automatique & Gestion des Overrides
// ==========================================================================
function handleCellChange(wordId, colId, newValue, cellEl, rowEl) {
    // 1. Mettre à jour en mémoire
    const targetWord = allWords.find(w => w.id === wordId);
    if (!targetWord) return;

    let parsedValue = newValue;
    if (colId === 'level_step') {
        const strVal = String(newValue).trim();
        parsedValue = strVal === '' ? null : (parseInt(strVal, 10) || null);
    }

    targetWord[colId] = parsedValue;
    targetWord._isModified = true;

    if (!localOverrides[wordId]) {
        localOverrides[wordId] = {};
    }
    localOverrides[wordId][colId] = parsedValue;
    modifiedWordIds.add(wordId);

    cellEl.classList.add('is-modified');
    rowEl.classList.add('is-modified');

    updateStatusIndicator('saving');

    // 2. Debounce vers le localStorage
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
        try {
            localStorage.setItem(STORAGE_KEY_OVERRIDES, JSON.stringify(localOverrides));
            updateStatusIndicator('saved');
        } catch (err) {
            console.error("Erreur sauvegarde localStorage:", err);
            updateStatusIndicator('error');
        }
    }, 400);
}

function updateStatusIndicator(state = 'saved') {
    const dot = document.getElementById('wm-status-dot');
    const text = document.getElementById('wm-status-text');
    const btnReset = document.getElementById('wm-btn-reset');
    if (!dot || !text) return;

    const modCount = modifiedWordIds.size;
    if (btnReset) {
        btnReset.style.display = modCount > 0 ? 'inline-flex' : 'none';
        btnReset.textContent = `↺ Annuler (${modCount})`;
    }

    if (state === 'saving') {
        dot.className = 'wm-status-dot saving';
        text.textContent = 'Sauvegarde...';
    } else if (state === 'error') {
        dot.className = 'wm-status-dot';
        dot.style.background = '#ef4444';
        text.textContent = 'Erreur sauvegarde';
    } else {
        dot.className = 'wm-status-dot';
        dot.style.background = '#10b981';
        if (modCount > 0) {
            text.textContent = `Sauvegardé (${modCount} modif.)`;
        } else {
            text.textContent = 'Sauvegardé';
        }
    }
}

// ==========================================================================
// Sélecteur de Colonnes (Afficher / Masquer)
// ==========================================================================
function initColumnSelector() {
    const btn = document.getElementById('wm-btn-columns');
    const menu = document.getElementById('wm-columns-menu');
    if (!btn || !menu) return;

    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        menu.classList.toggle('hidden');
    });

    document.addEventListener('click', (e) => {
        if (!menu.contains(e.target) && e.target !== btn) {
            menu.classList.add('hidden');
        }
    });

    function renderMenuOptions() {
        menu.innerHTML = '';

        const header = document.createElement('div');
        header.className = 'wm-dropdown-header';
        header.innerHTML = `<span>Colonnes (${activeColumns.size}/${COLUMNS.length})</span><button type="button" class="wm-dropdown-action" id="wm-btn-select-all">${activeColumns.size === COLUMNS.length ? 'Essentielles' : 'Tout afficher'}</button>`;
        menu.appendChild(header);

        const btnToggleAll = header.querySelector('#wm-btn-select-all');
        btnToggleAll.addEventListener('click', (e) => {
            e.stopPropagation();
            if (activeColumns.size === COLUMNS.length) {
                // Mode colonnes essentielles : id, level, type, fr, en
                activeColumns = new Set(['id', 'level', 'type', 'fr', 'en']);
            } else {
                activeColumns = new Set(COLUMNS.map(c => c.id));
            }
            localStorage.setItem(STORAGE_KEY_COLUMNS, JSON.stringify(Array.from(activeColumns)));
            renderMenuOptions();
            renderTableHeader();
            renderVirtualTable();
        });

        COLUMNS.forEach(col => {
            const label = document.createElement('label');
            label.className = 'wm-col-option';

            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.value = col.id;
            checkbox.checked = activeColumns.has(col.id);

            checkbox.addEventListener('change', () => {
                if (checkbox.checked) {
                    activeColumns.add(col.id);
                } else {
                    if (activeColumns.size <= 1) {
                        checkbox.checked = true;
                        return;
                    }
                    activeColumns.delete(col.id);
                }
                localStorage.setItem(STORAGE_KEY_COLUMNS, JSON.stringify(Array.from(activeColumns)));
                renderMenuOptions();
                renderTableHeader();
                renderVirtualTable();
            });

            const textSpan = document.createElement('span');
            textSpan.textContent = col.label;

            label.appendChild(checkbox);
            label.appendChild(textSpan);
            menu.appendChild(label);
        });
    }

    renderMenuOptions();
}

// ==========================================================================
// Export de vocabulary.js Formatté
// ==========================================================================
function exportVocabularyFile() {
    const cleanList = allWords.map(item => {
        const clone = { ...item };
        delete clone._isModified;
        return clone;
    });

    const fileContent = `export const vocabulary = ${JSON.stringify(cleanList, null, 2)};\n`;
    const blob = new Blob([fileContent], { type: 'application/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'vocabulary.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// ==========================================================================
// Réinitialisation des modifications locales
// ==========================================================================
function resetLocalOverrides() {
    if (modifiedWordIds.size === 0) return;
    const confirmMsg = `Êtes-vous sûr de vouloir annuler vos ${modifiedWordIds.size} modification(s) locales non exportées ?`;
    if (!confirm(confirmMsg)) return;

    localStorage.removeItem(STORAGE_KEY_OVERRIDES);
    localOverrides = {};
    modifiedWordIds.clear();

    // Recharger depuis l'original
    allWords = originalVocabulary.map(item => ({ ...item }));
    updateStatusIndicator();
    applyFiltersAndSort();
}

// ==========================================================================
// Branchement des Événements Globaux
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    initAdminAuthGate(() => {});
    initData();
    initColumnSelector();

    // Scroll virtualisé
    const viewport = document.getElementById('wm-viewport');
    const headerEl = document.getElementById('wm-table-header');
    if (viewport) {
        let ticking = false;
        viewport.addEventListener('scroll', () => {
            if (headerEl) {
                headerEl.scrollLeft = viewport.scrollLeft;
            }
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    renderVirtualTable();
                    ticking = false;
                });
                ticking = true;
            }
        });
    }

    // Redimensionnement de fenêtre
    window.addEventListener('resize', () => {
        renderVirtualTable();
    });

    // Recherche
    const searchInput = document.getElementById('wm-search-input');
    const searchClear = document.getElementById('wm-search-clear');
    if (searchInput) {
        if (searchQuery) {
            searchInput.value = searchQuery;
        }
        const updateClearButtonVisibility = () => {
            if (searchClear) {
                const shouldShow = searchInput.value.trim();
                if (shouldShow) {
                    searchClear.style.removeProperty('display');
                } else {
                    searchClear.style.setProperty('display', 'none', 'important');
                }
            }
        };
        updateClearButtonVisibility();
        let searchDebounce = null;
        searchInput.addEventListener('input', (e) => {
            updateClearButtonVisibility();
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(() => {
                searchQuery = e.target.value;
                saveFiltersState();
                applyFiltersAndSort();
            }, 180);
        });
        if (searchClear) {
            searchClear.addEventListener('click', (e) => {
                e.preventDefault();
                searchInput.value = '';
                searchQuery = '';
                updateClearButtonVisibility();
                saveFiltersState();
                applyFiltersAndSort();
            });
        }
    }

    // Filtres
    const levelSelect = document.getElementById('wm-filter-level');
    if (levelSelect) {
        if (filterLevel) {
            levelSelect.value = filterLevel;
        }
        levelSelect.addEventListener('change', (e) => {
            filterLevel = e.target.value;
            saveFiltersState();
            applyFiltersAndSort();
        });
    }

    const typeSelect = document.getElementById('wm-filter-type');
    if (typeSelect) {
        if (filterType) {
            typeSelect.value = filterType;
        }
        typeSelect.addEventListener('change', (e) => {
            filterType = e.target.value;
            saveFiltersState();
            applyFiltersAndSort();
        });
    }

    const statusSelect = document.getElementById('wm-filter-status');
    if (statusSelect) {
        if (filterStatus) {
            statusSelect.value = filterStatus;
        }
        statusSelect.addEventListener('change', (e) => {
            filterStatus = e.target.value;
            saveFiltersState();
            applyFiltersAndSort();
        });
    }

    // Boutons d'action
    const btnRefresh = document.getElementById('wm-btn-refresh');
    if (btnRefresh) {
        btnRefresh.addEventListener('click', () => {
            window.location.reload();
        });
    }

    const btnExport = document.getElementById('wm-btn-export');
    if (btnExport) {
        btnExport.addEventListener('click', exportVocabularyFile);
    }

    const btnReset = document.getElementById('wm-btn-reset');
    if (btnReset) {
        btnReset.addEventListener('click', resetLocalOverrides);
    }
});
