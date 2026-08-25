// Gestion de la persistance via localStorage et Firebase Firestore
import { db } from './firebase-config.js?v=71';
import { getCurrentUser } from './auth.js?v=71';
import { doc, getDoc, setDoc, updateDoc, increment, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const STORAGE_KEY = 'drillflow_progress';
let localCache = null;

// Initialiser le cache depuis localStorage
function initCache() {
    if (!localCache) {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            localCache = stored ? JSON.parse(stored) : {};
        } catch (e) {
            localCache = {};
        }
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
            
            // Fusion intelligente basée sur les dates de mise à jour
            for (const pairKey in cloudData) {
                if (!localCache[pairKey]) {
                    localCache[pairKey] = cloudData[pairKey];
                } else {
                    for (const wordId in cloudData[pairKey]) {
                        const localWord = localCache[pairKey][wordId];
                        const cloudWord = cloudData[pairKey][wordId];
                        if (!localWord) {
                            localCache[pairKey][wordId] = cloudWord;
                        } else {
                            const localDate = localWord.last_updated ? new Date(localWord.last_updated).getTime() : 0;
                            const cloudDate = cloudWord.last_updated ? new Date(cloudWord.last_updated).getTime() : 0;
                            if (cloudDate > localDate) {
                                localCache[pairKey][wordId] = cloudWord;
                            }
                        }
                    }
                }
            }
            
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
            
            saveProgressLocalAndCloud();
            return localCache;
        }
    } catch (e) {
        console.error("Erreur récupération Firebase:", e);
    }
}

export async function saveProgressLocalAndCloud() {
    // 1. Sauvegarder dans localStorage
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(localCache));
    } catch (e) {
        console.error("Erreur sauvegarde localStorage:", e);
    }
    
    // 2. Cloud sync si l'utilisateur est connecté
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

export async function reportWordTranslation(word, comment = '', langPair = '', reason = 'Mauvaise traduction') {
    if (!word || !word.id) return { success: false, error: 'invalid_word' };
    try {
        const docRef = doc(db, "word_reports", String(word.id));
        const docSnap = await getDoc(docRef);

        const now = new Date().toISOString();
        const trimmedComment = (comment || '').trim().slice(0, 100);
        const currentPair = (langPair || '').trim().toUpperCase();
        const reportReason = (reason || 'Mauvaise traduction').trim();

        if (docSnap.exists()) {
            const updatePayload = {
                count: increment(1),
                last_reported_at: now,
                last_reason: reportReason,
                reasons: arrayUnion(reportReason)
            };
            if (currentPair) {
                updatePayload.last_lang_pair = currentPair;
                updatePayload.lang_pairs = arrayUnion(currentPair);
            }
            if (trimmedComment) {
                updatePayload.comments = arrayUnion({
                    text: trimmedComment,
                    date: now,
                    pair: currentPair,
                    reason: reportReason
                });
                updatePayload.last_comment = trimmedComment;
            }
            await updateDoc(docRef, updatePayload);
        } else {
            const initialDoc = {
                word_id: word.id,
                fr: word.fr || '',
                en: word.en || '',
                de: word.de || '',
                es: word.es || '',
                level: word.level || '',
                type: word.type || '',
                count: 1,
                first_reported_at: now,
                last_reported_at: now,
                last_reason: reportReason,
                reasons: [reportReason],
                last_lang_pair: currentPair,
                lang_pairs: currentPair ? [currentPair] : [],
                comments: trimmedComment ? [{ text: trimmedComment, date: now, pair: currentPair, reason: reportReason }] : [],
                last_comment: trimmedComment || ''
            };
            await setDoc(docRef, initialDoc);
        }
        return { success: true };
    } catch (err) {
        console.error('Erreur lors du signalement:', err);
        return { success: false, error: err.message };
    }
}
