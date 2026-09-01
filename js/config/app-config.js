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
    DEFAULT_TGT: 'en'
};

/**
 * Récupère le nombre de jours de verrouillage du nom/prénom (personnalisé ou par défaut)
 */
export function getCertNameLockDays() {
    const custom = localStorage.getItem('drillflow_cert_name_lock_days');
    return custom ? parseInt(custom, 10) : APP_CONFIG.CERT_NAME_LOCK_DAYS;
}
