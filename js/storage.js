// Gestion de la persistance via localStorage et Firebase Firestore
import { db } from './firebase-config.js';
import { getCurrentUser } from './auth.js';
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

// Réinitialise tout le cache local (déconnexion ou changement d'utilisateur)
export function clearAllLocalProgress() {
    localCache = {};
    try {
        localStorage.removeItem(STORAGE_KEY);
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.startsWith('drillflow_prev_cefr_points_') || key.startsWith('voc_last_'))) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
        console.error("Erreur nettoyage local:", e);
    }
}

export async function fetchProgressFromCloud() {
    const user = getCurrentUser();
    if (!user) return;

    try {
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data && data.profile) {
                if (data.profile.firstname) localStorage.setItem('cert_firstname', data.profile.firstname);
                if (data.profile.lastname) localStorage.setItem('cert_lastname', data.profile.lastname);
                if (data.profile.name_updated_at) localStorage.setItem('cert_name_updated_at', data.profile.name_updated_at);
            }
            if (data && data.certificates) {
                for (const pairKey in data.certificates) {
                    const certInfo = data.certificates[pairKey];
                    if (certInfo && certInfo.cert_id) {
                        localStorage.setItem(`cert_id_${pairKey}`, certInfo.cert_id);
                    }
                }
            }
            const cloudData = data.progress || {};
            
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

// Réinitialise totalement la progression d'une paire de langues donnée
export async function resetPairProgress(langSource, langTarget) {
    const pairKey = `${langSource}-${langTarget}`;
    if (localCache && localCache[pairKey]) {
        delete localCache[pairKey];
    }
    // Supprimer également les points mémorisés pour cette paire
    localStorage.removeItem(`drillflow_prev_cefr_points_${pairKey}`);
    
    // Sauvegarder dans localStorage et Firestore
    await saveProgressLocalAndCloud();
    return true;
}

// Enregistre le profil (nom, prénom, date de dernière mise à jour) localement et dans Firestore
export async function saveUserProfile(firstname, lastname, nameUpdatedAt) {
    localStorage.setItem('cert_firstname', firstname);
    localStorage.setItem('cert_lastname', lastname);
    localStorage.setItem('cert_name_updated_at', nameUpdatedAt.toString());
    
    const user = getCurrentUser();
    if (user) {
        try {
            const docRef = doc(db, "users", user.uid);
            await setDoc(docRef, {
                profile: {
                    firstname,
                    lastname,
                    name_updated_at: nameUpdatedAt.toString()
                }
            }, { merge: true });
        } catch (e) {
            console.error("Erreur sauvegarde profil Firebase:", e);
        }
    }
}

// Récupère ou génère un numéro de certificat unique et persistant pour une paire de langues, et le lie au compte utilisateur dans Firestore
export async function getOrGenerateCertificateId(src, tgt, level, validated, points) {
    const pairKey = `${src}_${tgt}`;
    let certId = localStorage.getItem(`cert_id_${pairKey}`);
    
    // Si aucun ID n'existe encore pour cette paire, on en génère un unique et pérenne
    if (!certId) {
        const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
        const timePart = Math.floor(Date.now() / 1000).toString(36).toUpperCase();
        certId = `DF-${src.toUpperCase()}${tgt.toUpperCase()}-${timePart}${randomPart}`;
        localStorage.setItem(`cert_id_${pairKey}`, certId);
    }

    // Sauvegarde / liaison directe dans la DB Firebase Firestore du compte utilisateur
    const user = getCurrentUser();
    if (user) {
        try {
            const docRef = doc(db, "users", user.uid);
            await setDoc(docRef, {
                certificates: {
                    [pairKey]: {
                        cert_id: certId,
                        src,
                        tgt,
                        level: level || 'A1',
                        validated_words: validated || 0,
                        points: Math.round(points || 0),
                        last_updated: new Date().toISOString()
                    }
                }
            }, { merge: true });
        } catch (e) {
            console.error("Erreur liaison certificat Firestore:", e);
        }
    }

    return certId;
}

