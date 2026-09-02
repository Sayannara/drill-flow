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
    DEFAULT_TEST_PASS_THRESHOLD: 50
};

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
