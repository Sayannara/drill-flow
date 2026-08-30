import { auth } from './firebase-config.js';
import { 
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendEmailVerification,
    sendPasswordResetEmail
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { migrateLocalDataToCloud, fetchProgressFromCloud, clearAllLocalProgress } from './storage.js';
import { translations } from './i18n.js';

function getLang() {
    return localStorage.getItem('app_lang') || 'fr';
}

let currentUser = null;
let isProcessingAuth = false;

// S'abonne aux changements d'état (connexion/déconnexion)
onAuthStateChanged(auth, async (user) => {
    if (isProcessingAuth) return; // Ne pas interférer avec signUpUser ou loginUser en cours

    if (user) {
        if (!user.emailVerified) {
            console.log("Utilisateur non vérifié, déconnexion.");
            currentUser = null;
            updateAuthUI(null);
            await signOut(auth);
            return;
        }
        currentUser = user;
        localStorage.setItem('drillflow_auth_uid', user.uid);
        console.log("Utilisateur connecté:", user.uid, "(Inscrit et Vérifié)");
        
        // On charge la sauvegarde du cloud vers la RAM
        await fetchProgressFromCloud();
        
        // Update UI
        updateAuthUI(user);
    } else {
        currentUser = null;
        console.log("Aucun utilisateur connecté.");
        
        // Si un compte était connecté ou si des données d'un compte précédent sont encore présentes en local sans être connecté
        const hadAuthSession = localStorage.getItem('drillflow_auth_uid');
        const storedProgress = localStorage.getItem('drillflow_progress');
        if (hadAuthSession || (storedProgress && storedProgress.length > 500)) {
            console.log("Nettoyage de la progression locale suite à la déconnexion.");
            clearAllLocalProgress();
            localStorage.removeItem('drillflow_auth_uid');
        }
        updateAuthUI(null);
    }
});

export function getCurrentUser() {
    return currentUser;
}

function getActionCodeSettings() {
    const isLocal = typeof window !== 'undefined' && (window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1'));
    return {
        url: isLocal ? `${window.location.origin}/auth-action.html` : 'https://drill-flow.app/auth-action.html',
        handleCodeInApp: false
    };
}

export async function authenticateUser(email, password) {
    if (!email || !email.trim()) {
        return { success: false, error: "Veuillez renseigner votre adresse e-mail." };
    }
    if (!password || password.length < 6) {
        return { success: false, error: "Le mot de passe doit comporter au moins 6 caractères." };
    }

    const cleanEmail = email.trim();
    isProcessingAuth = true;

    try {
        // 1. Tenter la connexion
        try {
            const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
            
            if (!userCredential.user.emailVerified) {
                try {
                    await sendEmailVerification(userCredential.user, getActionCodeSettings());
                } catch (e) {
                    console.warn("Impossible de renvoyer l'email:", e);
                }
                await signOut(auth);
                currentUser = null;
                updateAuthUI(null);
                return { 
                    success: false, 
                    isUnverified: true,
                    error: "Votre compte existe mais votre e-mail n'a pas encore été vérifié. Un lien de confirmation vient de vous être renvoyé (vérifiez vos spams)." 
                };
            }

            currentUser = userCredential.user;
            await fetchProgressFromCloud();
            updateAuthUI(currentUser);
            return { success: true, isNewUser: false };

        } catch (signInErr) {
            const code = signInErr.code;
            
            // Si le compte n'existe pas, on tente automatiquement la création
            if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
                try {
                    const newCred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
                    
                    // Envoi immédiat de l'e-mail de confirmation avec ActionCodeSettings
                    await sendEmailVerification(newCred.user, getActionCodeSettings());
                    
                    // Déconnexion propre en attente de vérification
                    await signOut(auth);
                    currentUser = null;
                    updateAuthUI(null);

                    return { 
                        success: true, 
                        isNewUser: true,
                        message: "Compte créé avec succès ! Un e-mail de confirmation vous a été envoyé. Veuillez cliquer sur le lien reçu pour activer votre compte." 
                    };
                } catch (signUpErr) {
                    if (signUpErr.code === 'auth/email-already-in-use') {
                        // Le compte existe mais le mot de passe entré lors du premier test était faux
                        return { 
                            success: false, 
                            error: "Mot de passe incorrect pour ce compte. Utilisez 'Mot de passe oublié ?' si besoin." 
                        };
                    }
                    if (signUpErr.code === 'auth/weak-password') {
                        return { success: false, error: "Le mot de passe doit comporter au moins 6 caractères." };
                    }
                    return { success: false, error: signUpErr.message };
                }
            }

            if (code === 'auth/wrong-password') {
                return { 
                    success: false, 
                    error: "Mot de passe incorrect pour ce compte. Utilisez 'Mot de passe oublié ?' si besoin." 
                };
            }
            if (code === 'auth/invalid-email') {
                return { success: false, error: "Format d'adresse e-mail invalide." };
            }
            if (code === 'auth/too-many-requests') {
                return { success: false, error: "Trop de tentatives infructueuses. Veuillez patienter ou réinitialiser votre mot de passe." };
            }

            return { success: false, error: signInErr.message };
        }
    } finally {
        isProcessingAuth = false;
    }
}

export async function signUpUser(email, password) {
    return authenticateUser(email, password);
}

export async function loginUser(email, password) {
    return authenticateUser(email, password);
}

export async function resetPassword(email) {
    if (!email || !email.trim()) {
        return { success: false, error: "Veuillez renseigner votre adresse e-mail." };
    }
    try {
        await sendPasswordResetEmail(auth, email.trim(), getActionCodeSettings());
        return { success: true };
    } catch (error) {
        console.error("Erreur réinitialisation:", error);
        let msg = error.message;
        if (error.code === 'auth/user-not-found') {
            msg = "Aucun compte n'est associé à cette adresse e-mail.";
        } else if (error.code === 'auth/invalid-email') {
            msg = "Adresse e-mail invalide.";
        }
        return { success: false, error: msg };
    }
}

export async function logoutUser() {
    try {
        clearAllLocalProgress();
        localStorage.removeItem('drillflow_auth_uid');
        await signOut(auth);
        updateAuthUI(null);
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
