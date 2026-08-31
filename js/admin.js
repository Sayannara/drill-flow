import { db } from './firebase-config.js';
import { collection, getDocs, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

let allReports = [];
let currentSortCol = 'count';
let currentSortAsc = false;
let searchFilter = '';
let pairFilter = '';
let levelFilter = '';
let reasonFilter = '';

const LEVEL_WEIGHTS = {
    'A1': 1,
    'A2': 2,
    'B1': 3,
    'B2': 4,
    'C1': 5,
    'C2': 6
};

function normalizeStr(str) {
    if (!str) return '';
    return String(str)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function getPairList(item) {
    if (Array.isArray(item.lang_pairs) && item.lang_pairs.length > 0) {
        return item.lang_pairs.filter(Boolean);
    }
    if (item.last_lang_pair) return [item.last_lang_pair];
    if (item.lang_pair) return [item.lang_pair];
    return [];
}

function getPrimaryPair(item) {
    const list = getPairList(item);
    return list.length > 0 ? list[0] : '';
}

function getReasonList(item) {
    const set = new Set();
    if (item.last_reason) set.add(item.last_reason);
    if (Array.isArray(item.reasons)) {
        item.reasons.forEach(r => r && set.add(r));
    }
    if (Array.isArray(item.comments)) {
        item.comments.forEach(c => {
            if (c && c.reason) set.add(c.reason);
        });
    }
    return Array.from(set);
}

function populateFilterDropdowns() {
    const pairSelect = document.getElementById('filter-pair');
    const reasonSelect = document.getElementById('filter-reason');

    if (pairSelect) {
        const currentVal = pairSelect.value;
        const pairsSet = new Set();
        allReports.forEach(item => {
            getPairList(item).forEach(p => pairsSet.add(p));
        });
        const sortedPairs = Array.from(pairsSet).sort();
        pairSelect.innerHTML = '<option value="">Toutes les paires</option>' + 
            sortedPairs.map(p => `<option value="${escapeHtml(p)}" ${p === currentVal ? 'selected' : ''}>${escapeHtml(p)}</option>`).join('');
    }

    if (reasonSelect) {
        const currentVal = reasonSelect.value;
        const reasonsSet = new Set();
        allReports.forEach(item => {
            getReasonList(item).forEach(r => reasonsSet.add(r));
        });
        const sortedReasons = Array.from(reasonsSet).sort();
        reasonSelect.innerHTML = '<option value="">Tous les motifs</option>' + 
            sortedReasons.map(r => `<option value="${escapeHtml(r)}" ${r === currentVal ? 'selected' : ''}>${escapeHtml(r)}</option>`).join('');
    }
}

function renderTable() {
    const tbodyEl = document.getElementById('reports-tbody');
    const tableEl = document.getElementById('reports-table');
    const countInfoEl = document.getElementById('admin-count-info');
    if (!tbodyEl) return;

    // 1. Filtrage
    const q = normalizeStr(searchFilter);
    const filtered = allReports.filter(item => {
        // Filtre Paire
        if (pairFilter) {
            const pairs = getPairList(item);
            if (!pairs.includes(pairFilter)) return false;
        }

        // Filtre Niveau
        if (levelFilter) {
            if ((item.level || '').toUpperCase() !== levelFilter.toUpperCase()) return false;
        }

        // Filtre Motif
        if (reasonFilter) {
            const reasons = getReasonList(item);
            if (!reasons.includes(reasonFilter)) return false;
        }

        // Recherche texte globale
        if (q) {
            const inFr = normalizeStr(item.fr).includes(q);
            const inEn = normalizeStr(item.en).includes(q);
            const inDe = normalizeStr(item.de).includes(q);
            const inEs = normalizeStr(item.es).includes(q);
            const inType = normalizeStr(item.type).includes(q);
            const inLevel = normalizeStr(item.level).includes(q);
            const inReason = getReasonList(item).some(r => normalizeStr(r).includes(q));
            const inPairs = getPairList(item).some(p => normalizeStr(p).includes(q));
            
            let inComments = false;
            if (Array.isArray(item.comments)) {
                inComments = item.comments.some(c => {
                    const text = typeof c === 'string' ? c : (c.text || '');
                    return normalizeStr(text).includes(q);
                });
            } else if (item.last_comment) {
                inComments = normalizeStr(item.last_comment).includes(q);
            } else if (item.comment) {
                inComments = normalizeStr(item.comment).includes(q);
            }

            if (!inFr && !inEn && !inDe && !inEs && !inType && !inLevel && !inReason && !inPairs && !inComments) {
                return false;
            }
        }

        return true;
    });

    // 2. Tri
    filtered.sort((a, b) => {
        let comp = 0;
        switch (currentSortCol) {
            case 'count':
                comp = (a.count || 1) - (b.count || 1);
                break;
            case 'pair':
                comp = getPrimaryPair(a).localeCompare(getPrimaryPair(b));
                break;
            case 'fr':
                comp = (a.fr || '').localeCompare(b.fr || '', 'fr');
                break;
            case 'en':
                comp = (a.en || '').localeCompare(b.en || '', 'en');
                break;
            case 'de':
                comp = (a.de || '').localeCompare(b.de || '', 'de');
                break;
            case 'es':
                comp = (a.es || '').localeCompare(b.es || '', 'es');
                break;
            case 'level':
                comp = (LEVEL_WEIGHTS[a.level] || 0) - (LEVEL_WEIGHTS[b.level] || 0);
                break;
            case 'type':
                comp = (a.type || '').localeCompare(b.type || '', 'fr');
                break;
            case 'date':
                const dateA = a.last_reported_at ? new Date(a.last_reported_at).getTime() : 0;
                const dateB = b.last_reported_at ? new Date(b.last_reported_at).getTime() : 0;
                comp = dateA - dateB;
                break;
            default:
                comp = (a.count || 1) - (b.count || 1);
        }
        return currentSortAsc ? comp : -comp;
    });

    // 3. Mise à jour des icônes de tri dans les en-têtes
    document.querySelectorAll('table.admin-table th.sortable').forEach(th => {
        const icon = th.querySelector('.sort-icon');
        if (icon) {
            if (th.dataset.sort === currentSortCol) {
                icon.textContent = currentSortAsc ? '▲' : '▼';
            } else {
                icon.textContent = '';
            }
        }
    });

    // 4. Compteur de signalements
    if (countInfoEl) {
        if (filtered.length === allReports.length) {
            countInfoEl.textContent = `${allReports.length} signalement(s)`;
        } else {
            countInfoEl.textContent = `${filtered.length} affiché(s) sur ${allReports.length}`;
        }
    }

    // 5. Génération du HTML du tableau
    tbodyEl.innerHTML = '';

    if (filtered.length === 0) {
        tbodyEl.innerHTML = `
            <tr>
                <td colspan="11" style="text-align: center; color: var(--text-secondary); padding: 3rem;">
                    🔍 Aucun signalement ne correspond aux filtres appliqués.
                </td>
            </tr>
        `;
        if (tableEl) tableEl.style.display = 'table';
        return;
    }

    filtered.forEach((item) => {
        const tr = document.createElement('tr');
        
        const formattedDate = item.last_reported_at ? new Date(item.last_reported_at).toLocaleString('fr-FR', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        }) : '-';

        // Formatage de la paire de langues
        let pairHtml = '<span style="color: var(--text-secondary); opacity: 0.4;">-</span>';
        const pairs = getPairList(item);
        if (pairs.length > 0) {
            pairHtml = pairs.map(p => 
                `<span class="type-badge" style="background: rgba(59, 130, 246, 0.15); color: #3b82f6; font-weight: 600; margin: 0.1rem 0.15rem; display: inline-block;">${escapeHtml(p)}</span>`
            ).join(' ');
        }

        // Formatage du motif de signalement
        let reasonBadge = '';
        const lastReason = item.last_reason || (Array.isArray(item.reasons) && item.reasons.length > 0 ? item.reasons[item.reasons.length - 1] : '');
        if (lastReason) {
            const badgeBg = lastReason.includes('niveau') ? 'rgba(234, 179, 8, 0.15)' : 'rgba(239, 68, 68, 0.15)';
            const badgeColor = lastReason.includes('niveau') ? '#eab308' : '#ef4444';
            reasonBadge = `<div style="margin-bottom: 0.35rem;"><span class="type-badge" style="background: ${badgeBg}; color: ${badgeColor}; font-weight: 600; display: inline-block;">${escapeHtml(lastReason)}</span></div>`;
        }

        // Formatage des descriptions / remarques
        let commentsHtml = reasonBadge || '<span style="color: var(--text-secondary); opacity: 0.4;">-</span>';
        if (Array.isArray(item.comments) && item.comments.length > 0) {
            const list = item.comments
                .map(c => {
                    const text = typeof c === 'string' ? c : (c.text || '');
                    if (!text) return '';
                    const dateStr = (c && c.date) ? `<span style="color: var(--text-secondary); font-size: 0.75rem; margin-left: 4px;">(${new Date(c.date).toLocaleDateString('fr-FR')})</span>` : '';
                    const reasonText = (c && c.reason) ? `<span style="font-size: 0.7rem; color: #eab308; margin-right: 4px;">[${escapeHtml(c.reason)}]</span>` : '';
                    return `<div style="background: rgba(255,255,255,0.04); border-left: 2px solid var(--primary-color); padding: 0.3rem 0.5rem; margin-bottom: 0.35rem; border-radius: 0 4px 4px 0; font-size: 0.85rem; line-height: 1.35;">${reasonText}${escapeHtml(text)}${dateStr}</div>`;
                })
                .filter(Boolean);
            if (list.length > 0) {
                commentsHtml = reasonBadge + list.join('');
            }
        } else if (item.last_comment) {
            commentsHtml = reasonBadge + `<div style="background: rgba(255,255,255,0.04); border-left: 2px solid var(--primary-color); padding: 0.3rem 0.5rem; border-radius: 0 4px 4px 0; font-size: 0.85rem; line-height: 1.35;">${escapeHtml(item.last_comment)}</div>`;
        } else if (item.comment) {
            commentsHtml = reasonBadge + `<div style="background: rgba(255,255,255,0.04); border-left: 2px solid var(--primary-color); padding: 0.3rem 0.5rem; border-radius: 0 4px 4px 0; font-size: 0.85rem; line-height: 1.35;">${escapeHtml(item.comment)}</div>`;
        }

        tr.innerHTML = `
            <td><strong style="font-size: 1.1rem; color: var(--text-primary);">${item.count || 1}</strong></td>
            <td style="white-space: nowrap;">${pairHtml}</td>
            <td><strong>${escapeHtml(item.fr || '-')}</strong></td>
            <td>${escapeHtml(item.en || '-')}</td>
            <td>${escapeHtml(item.de || '-')}</td>
            <td>${escapeHtml(item.es || '-')}</td>
            <td><span class="type-badge" style="background: rgba(255,255,255,0.1); color: var(--text-primary); font-weight: 600;">${escapeHtml(item.level || '-')}</span></td>
            <td><span class="type-badge ${escapeHtml(item.type || '')}">${escapeHtml(item.type || '-')}</span></td>
            <td style="min-width: 180px; max-width: 280px; word-break: break-word;">${commentsHtml}</td>
            <td style="color: var(--text-secondary); font-size: 0.85rem; white-space: nowrap;">${formattedDate}</td>
            <td style="text-align: center;"><button class="btn-resolve" data-id="${item.docId}">Résolu</button></td>
        `;

        tbodyEl.appendChild(tr);
    });

    if (tableEl) tableEl.style.display = 'table';

    // Attacher événements de résolution/suppression
    document.querySelectorAll('.btn-resolve').forEach((btn) => {
        btn.onclick = async (e) => {
            const docId = e.target.dataset.id;
            if (confirm(`Marquer ce signalement comme résolu et le retirer de la liste ?`)) {
                btn.disabled = true;
                btn.textContent = 'En cours...';
                try {
                    await deleteDoc(doc(db, "word_reports", docId));
                    allReports = allReports.filter(r => r.docId !== docId);
                    populateFilterDropdowns();
                    renderTable();
                } catch (err) {
                    alert(`Erreur lors de la suppression : ${err.message}`);
                    btn.disabled = false;
                    btn.textContent = 'Résolu';
                }
            }
        };
    });
}

async function loadReports() {
    const loadingEl = document.getElementById('loading-state');
    const tableEl = document.getElementById('reports-table');

    if (loadingEl) loadingEl.style.display = 'block';
    if (tableEl) tableEl.style.display = 'none';

    try {
        const querySnapshot = await getDocs(collection(db, "word_reports"));
        allReports = [];
        
        querySnapshot.forEach((docSnap) => {
            allReports.push({
                docId: docSnap.id,
                ...docSnap.data()
            });
        });

        if (loadingEl) loadingEl.style.display = 'none';

        if (allReports.length === 0) {
            if (loadingEl) {
                loadingEl.style.display = 'block';
                loadingEl.innerHTML = `<div class="empty-state">✨ Aucun mot signalé pour le moment ! Tout est parfait.</div>`;
            }
            const countInfoEl = document.getElementById('admin-count-info');
            if (countInfoEl) countInfoEl.textContent = '0 signalement';
            return;
        }

        populateFilterDropdowns();
        renderTable();

    } catch (err) {
        console.error('Erreur chargement admin:', err);
        if (loadingEl) {
            loadingEl.style.display = 'block';
            if (err.code === 'permission-denied' || err.message.includes('permissions') || err.message.includes('Permission')) {
                loadingEl.innerHTML = `
                    <div style="background: rgba(239,68,68,0.1); border: 1px solid var(--error-color); padding: 1.5rem; border-radius: 12px; max-width: 620px; margin: 0 auto; text-align: left;">
                        <h4 style="color: var(--error-color); margin: 0 0 0.5rem 0;">⚠️ Autorisations Firebase requises</h4>
                        <p style="font-size: 0.9rem; color: var(--text-primary); margin: 0 0 0.75rem 0;">Firebase Firestore bloque la lecture de la collection <code>word_reports</code> tant que la règle d'accès n'est pas ajoutée.</p>
                        <p style="font-size: 0.85rem; color: var(--text-secondary); margin: 0 0 0.5rem 0;">Rendez-vous dans la <strong>Console Firebase &gt; Firestore Database &gt; Règles</strong> et ajoutez :</p>
                        <pre style="background: rgba(0,0,0,0.4); padding: 0.75rem; border-radius: 8px; font-size: 0.85rem; color: #10b981; margin: 0; overflow-x: auto; font-family: monospace;">match /word_reports/{reportId} {
  allow read, write: if true;
}</pre>
                    </div>
                `;
            } else {
                loadingEl.innerHTML = `<div style="color: var(--error-color); font-weight: 600;">Erreur lors du chargement : ${escapeHtml(err.message)}</div>`;
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadReports();

    const btnRefresh = document.getElementById('btn-refresh-admin');
    if (btnRefresh) {
        btnRefresh.onclick = loadReports;
    }

    const searchInput = document.getElementById('admin-search');
    if (searchInput) {
        searchInput.oninput = (e) => {
            searchFilter = e.target.value;
            renderTable();
        };
    }

    const pairSelect = document.getElementById('filter-pair');
    if (pairSelect) {
        pairSelect.onchange = (e) => {
            pairFilter = e.target.value;
            renderTable();
        };
    }

    const levelSelect = document.getElementById('filter-level');
    if (levelSelect) {
        levelSelect.onchange = (e) => {
            levelFilter = e.target.value;
            renderTable();
        };
    }

    const reasonSelect = document.getElementById('filter-reason');
    if (reasonSelect) {
        reasonSelect.onchange = (e) => {
            reasonFilter = e.target.value;
            renderTable();
        };
    }

    const btnReset = document.getElementById('btn-reset-filters');
    if (btnReset) {
        btnReset.onclick = () => {
            searchFilter = '';
            pairFilter = '';
            levelFilter = '';
            reasonFilter = '';
            if (searchInput) searchInput.value = '';
            if (pairSelect) pairSelect.value = '';
            if (levelSelect) levelSelect.value = '';
            if (reasonSelect) reasonSelect.value = '';
            renderTable();
        };
    }

    // Gestion du tri sur clic des colonnes
    document.querySelectorAll('table.admin-table th.sortable').forEach(th => {
        th.onclick = () => {
            const sortKey = th.dataset.sort;
            if (currentSortCol === sortKey) {
                currentSortAsc = !currentSortAsc;
            } else {
                currentSortCol = sortKey;
                currentSortAsc = (sortKey !== 'count' && sortKey !== 'date');
            }
            renderTable();
        };
    });
});
