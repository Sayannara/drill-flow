import { auth } from './firebase-config.js?v=71';
import { 
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { migrateLocalDataToCloud, fetchProgressFromCloud } from './storage.js?v=71';
import { translations } from './i18n.js?v=71';

function getLang() {
    return localStorage.getItem('app_lang') || 'fr';
}

let currentUser = null;

// S'abonne aux changements d'état (connexion/déconnexion)
onAuthStateChanged(auth, async (user) => {
    if (user) {
        if (!user.emailVerified) {
            // Bloquer l'accès strict
            console.log("Utilisateur non vérifié, déconnexion forcée.");
            signOut(auth);
            return;
        }
        currentUser = user;
        console.log("Utilisateur connecté:", user.uid, "(Inscrit et Vérifié)");
        
        // On charge la sauvegarde du cloud vers la RAM
        await fetchProgressFromCloud();
        
        // Update UI
        updateAuthUI(user);
    } else {
        currentUser = null;
        console.log("Aucun utilisateur, accès anonyme (sans sauvegarde) en cours...");
        updateAuthUI(null);
    }
});

export function getCurrentUser() {
    return currentUser;
}

export async function signUpUser(email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        // On transfère les données locales
        await migrateLocalDataToCloud(userCredential.user.uid);
        
        // Envoi de l'email de vérification
        await sendEmailVerification(userCredential.user);
        
        // On déconnecte l'utilisateur tant qu'il n'a pas vérifié
        await signOut(auth);
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function loginUser(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        if (!userCredential.user.emailVerified) {
            await signOut(auth);
            return { success: false, error: "Veuillez vérifier votre e-mail avant de vous connecter. Vérifiez vos spams." };
        }
        
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export async function logoutUser() {
    try {
        await signOut(auth);
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

export function updateAuthUI(user) {
    const authBtn = document.getElementById('auth-btn');
    if (!authBtn) return;
    
    const lang = getLang();
    const iconLogin = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>`;
    const iconLogout = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>`;
    
    if (user && !user.isAnonymous) {
        const titleText = translations[lang]?.auth_logout || "Déconnexion";
        authBtn.innerHTML = iconLogout;
        authBtn.title = titleText;
        authBtn.setAttribute('aria-label', titleText);
        authBtn.onclick = logoutUser;
    } else {
        const titleText = translations[lang]?.auth_login || "Connexion";
        authBtn.innerHTML = iconLogin;
        authBtn.title = titleText;
        authBtn.setAttribute('aria-label', titleText);
        authBtn.onclick = openAuthModal;
    }
    window.dispatchEvent(new CustomEvent('auth-changed', { detail: { user } }));
}

function openAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('hidden');
}
