import { auth } from './firebase-config.js';
import { onAuthStateChanged, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const STORAGE_KEY_AUTH = 'drillflow_admin_unlocked';

// Liste blanche des comptes administrateur (adresses exactes, insensible à la casse).
const ADMIN_EMAILS = [
    'ad@p-difm.com'
];

function isAdminEmail(email) {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

// Protège une page admin : appelle onUnlocked() une fois l'accès autorisé,
// et affiche l'overlay #wm-auth-overlay (avec formulaire de connexion) tant que ce n'est pas le cas.
export function initAdminAuthGate(onUnlocked) {
    const overlay = document.getElementById('wm-auth-overlay');
    const form = document.getElementById('wm-auth-form');
    const emailInput = document.getElementById('wm-auth-email');
    const passwordInput = document.getElementById('wm-auth-input');
    const errorEl = document.getElementById('wm-auth-error');
    const submitBtn = form ? form.querySelector('button[type="submit"]') : null;
    if (!overlay || !form || !emailInput || !passwordInput) {
        onUnlocked();
        return;
    }

    const unlock = () => {
        sessionStorage.setItem(STORAGE_KEY_AUTH, 'auth');
        overlay.classList.add('hidden');
        onUnlocked();
    };

    if (sessionStorage.getItem(STORAGE_KEY_AUTH) === 'auth') {
        overlay.classList.add('hidden');
        onUnlocked();
    }

    onAuthStateChanged(auth, (user) => {
        if (user && user.emailVerified && isAdminEmail(user.email)) {
            unlock();
            return;
        }
        // Compte non-admin, non vérifié ou déconnecté : on révoque et on affiche le formulaire.
        if (sessionStorage.getItem(STORAGE_KEY_AUTH) === 'auth') {
            sessionStorage.removeItem(STORAGE_KEY_AUTH);
            location.reload();
            return;
        }
        overlay.classList.remove('hidden');
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = (emailInput.value || '').trim();
        const password = passwordInput.value || '';

        if (!isAdminEmail(email)) {
            if (errorEl) {
                errorEl.textContent = "Ce compte n'a pas les droits administrateur.";
                errorEl.style.display = 'block';
            }
            return;
        }

        if (submitBtn) submitBtn.disabled = true;
        try {
            await signInWithEmailAndPassword(auth, email, password);
            // onAuthStateChanged prendra le relais pour déverrouiller.
        } catch (err) {
            let msg = "Connexion impossible. Vérifiez vos identifiants.";
            if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                msg = "Mot de passe incorrect.";
            } else if (err.code === 'auth/user-not-found') {
                msg = "Aucun compte ne correspond à cette adresse.";
            } else if (err.code === 'auth/too-many-requests') {
                msg = "Trop de tentatives. Réessayez plus tard.";
            }
            if (errorEl) {
                errorEl.textContent = msg;
                errorEl.style.display = 'block';
            }
            passwordInput.value = '';
            passwordInput.focus();
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    });
}
