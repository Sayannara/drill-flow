// Gestion de la persistance via localStorage et Firebase Firestore
import { db } from './firebase-config.js?v=66';
import { getCurrentUser } from './auth.js?v=66';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const STORAGE_KEY = 'drillflow_progress';
let localCache = null;

// Initialiser le cache en mémoire (session uniquement)
function initCache() {
    if (!localCache) {
        localCache = {};
    }
}
initCache();

export async function fetchProgressFromCloud() {
    const user = getCurrentUser();
    if (!user) return;

    try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const cloudData = docSnap.data().progress || {};
            // Fusionner avec le local
            localCache = { ...localCache, ...cloudData };
            
            // Migration : Ajouter validation_date aux mots déjà validés
            let modified = false;
            const now = new Date().toISOString();
            for (const pairKey in localCache) {
                for (const wordId in localCache[pairKey]) {
                    let wordData = localCache[pairKey][wordId];
                    if (typeof wordData === 'string') {
                        wordData = { status: wordData, attempts: 1, last_updated: now };
                        localCache[pairKey][wordId] = wordData;
                        modified = true;
                    }
                    if (wordData.status === 'validé' && !wordData.validation_date) {
                        wordData.validation_date = now;
                        modified = true;
                    }
                }
            }
            if (modified) {
                // Sauvegarde silencieuse de la migration
                setDoc(docRef, { progress: localCache }, { merge: true }).catch(e => console.error("Erreur migration validation_date:", e));
            }
            
            return localCache;
        }
    } catch (e) {
        console.error("Erreur récupération Firebase:", e);
    }
}

export async function saveProgressLocalAndCloud() {
    // Ne plus sauvegarder dans localStorage
    
    // Cloud sync si l'utilisateur est connecté
    const user = getCurrentUser();
    if (user) {
        const docRef = doc(db, "users", user.uid);
        setDoc(docRef, { progress: localCache }, { merge: true })
            .catch(e => console.error("Erreur synchro Firebase:", e));
    }
}

export async function migrateLocalDataToCloud(uid) {
    if (Object.keys(localCache).length > 0) {
        try {
            const docRef = doc(db, "users", uid);
            await setDoc(docRef, { progress: localCache }, { merge: true });
        } catch (e) {
            console.error("Erreur migration:", e);
        }
    }
}

// Renvoie tout le cache local
export function loadProgress() {
    return localCache;
}

// Récupère l'état (status) d'un mot
// Un mot est 'validé' uniquement s'il est réussi du 1er coup (attempts === 1)
export function getWordStatus(langSource, langTarget, wordId) {
    const pairKey = `${langSource}-${langTarget}`;
    if (localCache[pairKey] && localCache[pairKey][wordId]) {
        if (typeof localCache[pairKey][wordId] === 'object') {
            const data = localCache[pairKey][wordId];
            if (data.status === 'ignoré') return 'ignoré';
            if (data.status === 'validé' && data.attempts === 1) {
                return 'validé';
            }
            return 'actif';
        }
        return localCache[pairKey][wordId];
    }
    return 'actif';
}

// Récupère toutes les stats d'un mot
export function getWordStats(langSource, langTarget, wordId) {
    const pairKey = `${langSource}-${langTarget}`;
    if (localCache[pairKey] && localCache[pairKey][wordId]) {
        if (typeof localCache[pairKey][wordId] === 'object') {
            return localCache[pairKey][wordId];
        }
        return { status: localCache[pairKey][wordId], attempts: 1 };
    }
    return { status: 'actif', attempts: 0 };
}

// Met à jour l'état d'un mot et gère ses tentatives
export function setWordStatus(langSource, langTarget, wordId, status, addAttempt = false, explicitAttempts = null) {
    const pairKey = `${langSource}-${langTarget}`;
    
    if (!localCache[pairKey]) {
        localCache[pairKey] = {};
    }
    
    let currentData = localCache[pairKey][wordId];
    
    // Si c'était l'ancien format string, on le convertit en objet
    if (typeof currentData === 'string') {
        currentData = { status: currentData, attempts: 1, last_updated: new Date().toISOString() };
    } else if (!currentData) {
        currentData = { status: 'actif', attempts: 0, last_updated: new Date().toISOString() };
    }
    
    currentData.status = status;
    if (status === 'validé') {
        currentData.validation_date = new Date().toISOString();
    } else if (status === 'ignoré') {
        currentData.attempts = 0;
    }
    
    if (explicitAttempts !== null) {
        currentData.attempts = explicitAttempts;
    } else if (addAttempt) {
        currentData.attempts = (currentData.attempts || 0) + 1;
    }
    currentData.last_updated = new Date().toISOString();
    
    localCache[pairKey][wordId] = currentData;
    saveProgressLocalAndCloud();
}
