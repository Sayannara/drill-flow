// Gestion de la persistance via localStorage

const STORAGE_KEY = 'drillflow_progress';
const LEGACY_KEY = 'voc_progress';

export function loadProgress() {
    try {
        let data = localStorage.getItem(STORAGE_KEY);
        if (!data) {
            data = localStorage.getItem(LEGACY_KEY);
            if (data) {
                localStorage.setItem(STORAGE_KEY, data); // Migrate data
            }
        }
        if (data) {
            return JSON.parse(data);
        }
    } catch (e) {
        console.error("Erreur de chargement de la progression", e);
    }
    return {};
}

export function saveProgress(progressData) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(progressData));
    } catch (e) {
        console.error("Erreur de sauvegarde de la progression", e);
    }
}

// Récupère l'état d'un mot pour une paire de langue donnée
// Retourne 'actif', 'validé' ou par défaut 'actif'
export function getWordStatus(langSource, langTarget, wordId) {
    const progress = loadProgress();
    const pairKey = `${langSource}-${langTarget}`;
    if (progress[pairKey] && progress[pairKey][wordId]) {
        return progress[pairKey][wordId];
    }
    return 'actif';
}

// Met à jour l'état d'un mot
export function setWordStatus(langSource, langTarget, wordId, status) {
    const progress = loadProgress();
    const pairKey = `${langSource}-${langTarget}`;
    
    if (!progress[pairKey]) {
        progress[pairKey] = {};
    }
    
    progress[pairKey][wordId] = status;
    saveProgress(progress);
}
