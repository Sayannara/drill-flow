/**
 * Configuration et moteur de calcul des niveaux CECRL pour drillFlow.
 * Tous les paliers de points et coefficients de pondération sont centralisés ici.
 */
export const CEFR_CONFIG = {
    // Paliers de points cumulés nécessaires pour valider chaque niveau CECRL
    thresholds: {
        A1: 800,
        A2: 1600,
        B1: 2400,
        B2: 4000,
        C1: 5500,
        C2: 7000
    },

    // Multiplicateurs de difficulté par niveau
    multipliers: {
        A1: 1.0,
        A2: 1.2,
        B1: 1.5,
        B2: 2.0,
        C1: 2.5,
        C2: 3.5
    },

    // Liste ordonnée des niveaux
    levels: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],

    // Couleurs de badges et barres par niveau
    colors: {
        A1: { bg: 'rgba(59, 130, 246, 0.15)', text: '#3b82f6', border: '#3b82f6', solid: '#3b82f6' },
        A2: { bg: 'rgba(6, 182, 212, 0.15)', text: '#06b6d4', border: '#06b6d4', solid: '#06b6d4' },
        B1: { bg: 'rgba(16, 185, 129, 0.15)', text: '#10b981', border: '#10b981', solid: '#10b981' },
        B2: { bg: 'rgba(234, 179, 8, 0.15)', text: '#eab308', border: '#eab308', solid: '#eab308' },
        C1: { bg: 'rgba(249, 115, 22, 0.15)', text: '#f97316', border: '#f97316', solid: '#f97316' },
        C2: { bg: 'rgba(168, 85, 247, 0.15)', text: '#a855f7', border: '#a855f7', solid: '#a855f7' }
    }
};

/**
 * Calcule le total de points pondérés à partir des mots validés par niveau.
 * @param {Object} validatedByLevel Exemple : { A1: 388, A2: 196, B1: 133, B2: 3, C1: 2, C2: 3 }
 * @returns {number} Points totaux pondérés (nombres entiers)
 */
export function calculateCefrPoints(validatedByLevel) {
    if (!validatedByLevel) return 0;
    const breakdown = getPointsBreakdownByLevel(validatedByLevel);
    return Object.values(breakdown).reduce((sum, pts) => sum + pts, 0);
}

/**
 * Calcule les points apportés individuellement par chaque niveau (nombres entiers).
 * @param {Object} validatedByLevel
 * @returns {Object} { A1: points, A2: points, ... }
 */
export function getPointsBreakdownByLevel(validatedByLevel) {
    const breakdown = {};
    for (const lvl of CEFR_CONFIG.levels) {
        const count = (validatedByLevel && validatedByLevel[lvl]) || 0;
        const mult = CEFR_CONFIG.multipliers[lvl] || 1.0;
        breakdown[lvl] = Math.round(count * mult);
    }
    return breakdown;
}

/**
 * Détermine le niveau global CECRL atteint à partir des points pondérés.
 * @param {number} points 
 * @returns {string} 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2'
 */
export function getCefrLevelFromPoints(points) {
    const { thresholds, levels } = CEFR_CONFIG;
    let reached = 'A1';

    for (let i = 0; i < levels.length; i++) {
        const lvl = levels[i];
        if (points >= thresholds[lvl]) {
            reached = lvl;
        } else {
            break;
        }
    }
    return reached;
}

/**
 * Calcule les détails de progression nécessaires pour la barre et les paliers gamifiés.
 * @param {number} points 
 * @returns {Object}
 */
export function getCefrProgressDetails(points) {
    const { thresholds, levels } = CEFR_CONFIG;
    const maxThreshold = thresholds[levels[levels.length - 1]]; // 7000

    let currentLevel = 'A1';
    let nextLevel = 'A1';
    let prevThreshold = 0;
    let nextThreshold = thresholds['A1'];

    if (points < thresholds['A1']) {
        currentLevel = 'A1';
        nextLevel = 'A1';
        prevThreshold = 0;
        nextThreshold = thresholds['A1'];
    } else {
        for (let i = 0; i < levels.length; i++) {
            const lvl = levels[i];
            if (points >= thresholds[lvl]) {
                currentLevel = lvl;
                prevThreshold = thresholds[lvl];
                if (i + 1 < levels.length) {
                    nextLevel = levels[i + 1];
                    nextThreshold = thresholds[levels[i + 1]];
                } else {
                    nextLevel = 'MAX';
                    nextThreshold = thresholds[lvl];
                }
            } else {
                nextLevel = lvl;
                nextThreshold = thresholds[lvl];
                break;
            }
        }
    }

    const range = Math.max(1, nextThreshold - prevThreshold);
    const progressInTier = points - prevThreshold;
    const pctInTier = nextLevel === 'MAX' ? 100 : Math.min(100, Math.max(0, Math.round((progressInTier / range) * 100)));
    const overallPct = Math.min(100, Math.max(0, Math.round((points / maxThreshold) * 100)));
    const pointsNeeded = nextLevel === 'MAX' ? 0 : Math.max(0, Math.round(nextThreshold - points));

    return {
        points,
        currentLevel,
        nextLevel,
        prevThreshold,
        nextThreshold,
        pctInTier,
        overallPct,
        pointsNeeded,
        isMax: nextLevel === 'MAX',
        thresholds,
        multipliers: CEFR_CONFIG.multipliers,
        levels
    };
}
