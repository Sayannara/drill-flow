import { db } from '../firebase-config.js';
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

/**
 * Configuration générale de l'application drillFlow.
 * Centralise les paramètres clés et délais configurables.
 */
export const APP_CONFIG = {
    // Délai de verrouillage avant de pouvoir modifier à nouveau le nom et le prénom pour les attestations (en jours)
    CERT_NAME_LOCK_DAYS: 30,

    // Valeurs par défaut de l'algorithme Smart Drill
    DEFAULT_ACTIVE_POOL_SIZE: 100,
    DEFAULT_REINSERT_MIN: 6,
    DEFAULT_REINSERT_MAX: 9,
    DEFAULT_POSSIBLE_VOLUMES: [5, 10, 15, 20],
    DEFAULT_VOLUME: 20,
    DEFAULT_MODE: 'smart',
    DEFAULT_SRC: 'fr',
    DEFAULT_TGT: 'en',

    // Paramètres du Test de Niveau (Placement Test)
    DEFAULT_TEST_WORDS_PER_LEVEL: 12,
    DEFAULT_TEST_TIMER_DESKTOP: 20,
    DEFAULT_TEST_TIMER_MOBILE: 25,
    DEFAULT_TEST_PASS_THRESHOLD: 50,

    // Palier d'incitation Progression (mots validés pour afficher la tête de girafe)
    DEFAULT_PROGRESSION_MILESTONE_STEP: 200
};

/**
 * Récupère le palier d'incitation pour la progression (en mots validés)
 */
export function getProgressionMilestoneStep() {
    const custom = localStorage.getItem('drillflow_progression_milestone_step');
    return custom ? parseInt(custom, 10) : APP_CONFIG.DEFAULT_PROGRESSION_MILESTONE_STEP;
}

/**
 * Récupère le nombre de jours de verrouillage du nom/prénom (personnalisé ou par défaut)
 */
export function getCertNameLockDays() {
    const custom = localStorage.getItem('drillflow_cert_name_lock_days');
    return custom ? parseInt(custom, 10) : APP_CONFIG.CERT_NAME_LOCK_DAYS;
}

/**
 * Récupère le nombre de mots par niveau pour le test de placement
 */
export function getTestWordsPerLevel() {
    const custom = localStorage.getItem('drillflow_test_words_per_level');
    return custom ? parseInt(custom, 10) : APP_CONFIG.DEFAULT_TEST_WORDS_PER_LEVEL;
}

/**
 * Récupère le timer en secondes par mot (adapté PC / Mobile)
 */
export function getTestTimerSeconds() {
    const isMobile = window.innerWidth <= 768 || (typeof navigator !== 'undefined' && /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent));
    if (isMobile) {
        const customMobile = localStorage.getItem('drillflow_test_timer_mobile');
        return customMobile ? parseInt(customMobile, 10) : APP_CONFIG.DEFAULT_TEST_TIMER_MOBILE;
    } else {
        const customDesktop = localStorage.getItem('drillflow_test_timer_desktop');
        return customDesktop ? parseInt(customDesktop, 10) : APP_CONFIG.DEFAULT_TEST_TIMER_DESKTOP;
    }
}

/**
 * Récupère le seuil de passage au niveau supérieur (en %)
 */
export function getTestPassThreshold() {
    const custom = localStorage.getItem('drillflow_test_pass_threshold');
    return custom ? parseInt(custom, 10) : APP_CONFIG.DEFAULT_TEST_PASS_THRESHOLD;
}

/**
 * Récupère la configuration centralisée depuis Firebase Firestore et synchronise le cache local.
 */
export async function fetchAppConfigFromCloud() {
    try {
        const docRef = doc(db, "app_settings", "global");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data) {
                if (data.active_pool_size != null) localStorage.setItem('drillflow_active_pool_size', String(data.active_pool_size));
                if (data.possible_volumes != null) localStorage.setItem('drillflow_possible_volumes', String(data.possible_volumes));
                if (data.reinsert_min != null) localStorage.setItem('drillflow_reinsert_min', String(data.reinsert_min));
                if (data.reinsert_max != null) localStorage.setItem('drillflow_reinsert_max', String(data.reinsert_max));
                if (data.default_mode != null) {
                    localStorage.setItem('drillflow_default_mode', String(data.default_mode));
                    if (!localStorage.getItem('voc_last_mode')) localStorage.setItem('voc_last_mode', String(data.default_mode));
                }
                if (data.default_volume != null) {
                    localStorage.setItem('drillflow_default_volume', String(data.default_volume));
                    if (!localStorage.getItem('voc_last_vol')) localStorage.setItem('voc_last_vol', String(data.default_volume));
                }
                if (data.default_src != null) {
                    localStorage.setItem('drillflow_default_src', String(data.default_src));
                    if (!localStorage.getItem('voc_last_src')) localStorage.setItem('voc_last_src', String(data.default_src));
                }
                if (data.default_tgt != null) {
                    localStorage.setItem('drillflow_default_tgt', String(data.default_tgt));
                    if (!localStorage.getItem('voc_last_tgt')) localStorage.setItem('voc_last_tgt', String(data.default_tgt));
                }
                if (data.cert_name_lock_days != null) localStorage.setItem('drillflow_cert_name_lock_days', String(data.cert_name_lock_days));
                if (data.progression_milestone_step != null) localStorage.setItem('drillflow_progression_milestone_step', String(data.progression_milestone_step));
                if (data.test_words_per_level != null) localStorage.setItem('drillflow_test_words_per_level', String(data.test_words_per_level));
                if (data.test_timer_desktop != null) localStorage.setItem('drillflow_test_timer_desktop', String(data.test_timer_desktop));
                if (data.test_timer_mobile != null) localStorage.setItem('drillflow_test_timer_mobile', String(data.test_timer_mobile));
                if (data.test_pass_threshold != null) localStorage.setItem('drillflow_test_pass_threshold', String(data.test_pass_threshold));
                if (data.cefr_thresholds && typeof data.cefr_thresholds === 'object') {
                    localStorage.setItem('drillflow_cefr_thresholds', JSON.stringify(data.cefr_thresholds));
                }
                return data;
            }
        }
    } catch (err) {
        console.warn("Impossible de charger la configuration cloud:", err);
    }
    return null;
}

/**
 * Enregistre la configuration dans Firebase Firestore (document central app_settings/global).
 */
export async function saveAppConfigToCloud(configData) {
    try {
        const docRef = doc(db, "app_settings", "global");
        const payload = {
            ...configData,
            updated_at: new Date().toISOString()
        };
        await setDoc(docRef, payload, { merge: true });

        // Synchroniser immédiatement le localStorage local
        if (configData.active_pool_size != null) localStorage.setItem('drillflow_active_pool_size', String(configData.active_pool_size));
        if (configData.possible_volumes != null) localStorage.setItem('drillflow_possible_volumes', String(configData.possible_volumes));
        if (configData.reinsert_min != null) localStorage.setItem('drillflow_reinsert_min', String(configData.reinsert_min));
        if (configData.reinsert_max != null) localStorage.setItem('drillflow_reinsert_max', String(configData.reinsert_max));
        if (configData.default_mode != null) {
            localStorage.setItem('drillflow_default_mode', String(configData.default_mode));
            localStorage.setItem('voc_last_mode', String(configData.default_mode));
        }
        if (configData.default_volume != null) {
            localStorage.setItem('drillflow_default_volume', String(configData.default_volume));
            localStorage.setItem('voc_last_vol', String(configData.default_volume));
        }
        if (configData.default_src != null) {
            localStorage.setItem('drillflow_default_src', String(configData.default_src));
            localStorage.setItem('voc_last_src', String(configData.default_src));
        }
        if (configData.default_tgt != null) {
            localStorage.setItem('drillflow_default_tgt', String(configData.default_tgt));
            localStorage.setItem('voc_last_tgt', String(configData.default_tgt));
        }
        if (configData.cert_name_lock_days != null) localStorage.setItem('drillflow_cert_name_lock_days', String(configData.cert_name_lock_days));
        if (configData.progression_milestone_step != null) localStorage.setItem('drillflow_progression_milestone_step', String(configData.progression_milestone_step));
        if (configData.test_words_per_level != null) localStorage.setItem('drillflow_test_words_per_level', String(configData.test_words_per_level));
        if (configData.test_timer_desktop != null) localStorage.setItem('drillflow_test_timer_desktop', String(configData.test_timer_desktop));
        if (configData.test_timer_mobile != null) localStorage.setItem('drillflow_test_timer_mobile', String(configData.test_timer_mobile));
        if (configData.test_pass_threshold != null) localStorage.setItem('drillflow_test_pass_threshold', String(configData.test_pass_threshold));
        if (configData.cefr_thresholds && typeof configData.cefr_thresholds === 'object') {
            localStorage.setItem('drillflow_cefr_thresholds', JSON.stringify(configData.cefr_thresholds));
        }

        return { success: true };
    } catch (err) {
        console.error("Erreur enregistrement config cloud:", err);
        return { success: false, error: err.message || String(err) };
    }
}
