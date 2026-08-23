import { auth } from './firebase-config.js?v=67';
import { 
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendEmailVerification
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { migrateLocalDataToCloud, fetchProgressFromCloud } from './storage.js?v=67';

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

function updateAuthUI(user) {
    const authBtn = document.getElementById('auth-btn');
    if (!authBtn) return;
    
    if (user && !user.isAnonymous) {
        authBtn.textContent = "Déconnexion";
        authBtn.onclick = logoutUser;
    } else {
        authBtn.textContent = "Connexion";
        authBtn.onclick = openAuthModal;
    }
    window.dispatchEvent(new CustomEvent('auth-changed', { detail: { user } }));
}

function openAuthModal() {
    const modal = document.getElementById('auth-modal');
    if (modal) modal.classList.remove('hidden');
}
