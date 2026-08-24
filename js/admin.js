// Dashboard Admin — Consultation des signalements de traduction
import { db } from './firebase-config.js?v=71';
import { collection, getDocs, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

async function loadReports() {
    const loadingEl = document.getElementById('loading-state');
    const tableEl = document.getElementById('reports-table');
    const tbodyEl = document.getElementById('reports-tbody');

    if (loadingEl) loadingEl.style.display = 'block';
    if (tableEl) tableEl.style.display = 'none';

    try {
        const querySnapshot = await getDocs(collection(db, "word_reports"));
        const reports = [];
        
        querySnapshot.forEach((docSnap) => {
            reports.push({
                docId: docSnap.id,
                ...docSnap.data()
            });
        });

        // Tri par nombre d'occurrences / signalements décroissant
        reports.sort((a, b) => (b.count || 0) - (a.count || 0));

        if (loadingEl) loadingEl.style.display = 'none';

        if (reports.length === 0) {
            if (loadingEl) {
                loadingEl.style.display = 'block';
                loadingEl.innerHTML = `<div class="empty-state">✨ Aucun mot signalé pour le moment ! Tout est parfait.</div>`;
            }
            return;
        }

        tbodyEl.innerHTML = '';
        reports.forEach((item) => {
            const tr = document.createElement('tr');
            
            const formattedDate = item.last_reported_at ? new Date(item.last_reported_at).toLocaleString('fr-FR', {
                day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
            }) : '-';

            tr.innerHTML = `
                <td><span class="count-badge">${item.count || 1} signalement(s)</span></td>
                <td><strong>${escapeHtml(item.fr || '-')}</strong></td>
                <td>${escapeHtml(item.en || '-')}</td>
                <td>${escapeHtml(item.de || '-')}</td>
                <td>${escapeHtml(item.es || '-')}</td>
                <td><span class="type-badge" style="background: rgba(255,255,255,0.1); color: var(--text-primary); font-weight: 600;">${escapeHtml(item.level || '-')}</span></td>
                <td><span class="type-badge ${escapeHtml(item.type || '')}">${escapeHtml(item.type || '-')}</span></td>
                <td style="color: var(--text-secondary); font-size: 0.85rem;">${formattedDate}</td>
                <td><button class="btn-resolve" data-id="${item.docId}">✓ Résolu</button></td>
            `;

            tbodyEl.appendChild(tr);
        });

        tableEl.style.display = 'table';

        // Attacher événements de résolution/suppression
        document.querySelectorAll('.btn-resolve').forEach((btn) => {
            btn.onclick = async (e) => {
                const docId = e.target.dataset.id;
                if (confirm(`Marquer ce signalement comme résolu et le retirer de la liste ?`)) {
                    btn.disabled = true;
                    btn.textContent = 'En cours...';
                    try {
                        await deleteDoc(doc(db, "word_reports", docId));
                        loadReports();
                    } catch (err) {
                        alert(`Erreur lors de la suppression : ${err.message}`);
                        btn.disabled = false;
                        btn.textContent = '✓ Résolu';
                    }
                }
            };
        });

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

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

document.addEventListener('DOMContentLoaded', () => {
    loadReports();
    const btnRefresh = document.getElementById('btn-refresh-admin');
    if (btnRefresh) {
        btnRefresh.onclick = loadReports;
    }
});
