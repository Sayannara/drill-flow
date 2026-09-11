// Configuration Panel JS - drillFlow.
import { 
    APP_CONFIG, 
    getCertNameLockDays, 
    getTestWordsPerLevel, 
    getTestPassThreshold,
    fetchAppConfigFromCloud,
    saveAppConfigToCloud
} from './config/app-config.js';
import { getCefrThresholds, DEFAULT_CEFR_THRESHOLDS } from './config/cefr.js';

async function initConfigPage() {
    // 1. Éléments du formulaire
    const inputPoolSize = document.getElementById('cfg-pool-size');
    const inputPossibleVolumes = document.getElementById('cfg-possible-volumes');
    const inputReinsertMin = document.getElementById('cfg-reinsert-min');
    const inputReinsertMax = document.getElementById('cfg-reinsert-max');
    const selectMode = document.getElementById('cfg-default-mode');
    const inputVolume = document.getElementById('cfg-default-volume');
    const selectSrc = document.getElementById('cfg-default-src');
    const selectTgt = document.getElementById('cfg-default-tgt');
    const inputCertLockDays = document.getElementById('cfg-cert-lock-days');

    // Test de Niveau
    const inputTestWords = document.getElementById('cfg-test-words-per-level');
    const inputTestTimerDesktop = document.getElementById('cfg-test-timer-desktop');
    const inputTestTimerMobile = document.getElementById('cfg-test-timer-mobile');
    const inputTestPassThreshold = document.getElementById('cfg-test-pass-threshold');
    
    // Paliers de Points CECRL
    const inputCefrA1 = document.getElementById('cfg-cefr-a1');
    const inputCefrA2 = document.getElementById('cfg-cefr-a2');
    const inputCefrB1 = document.getElementById('cfg-cefr-b1');
    const inputCefrB2 = document.getElementById('cfg-cefr-b2');
    const inputCefrC1 = document.getElementById('cfg-cefr-c1');
    const inputCefrC2 = document.getElementById('cfg-cefr-c2');
    
    const btnAudioOn = document.getElementById('cfg-audio-on');
    const btnAudioOff = document.getElementById('cfg-audio-off');
    
    const btnAccentsOn = document.getElementById('cfg-accents-on');
    const btnAccentsOff = document.getElementById('cfg-accents-off');
    
    const btnThemeDark = document.getElementById('cfg-theme-dark');
    const btnThemeLight = document.getElementById('cfg-theme-light');
    
    const selectAppLang = document.getElementById('cfg-app-lang');
    
    const btnSave = document.getElementById('btn-save-config');
    const btnReset = document.getElementById('btn-reset-config');
    const toastEl = document.getElementById('config-toast');
    const syncStatusEl = document.getElementById('cfg-sync-status');

    // État temporaire des commutateurs utilisateur
    let currentAudio = localStorage.getItem('drillflow_auto_speak') === 'on' ? 'on' : 'off';
    let currentAccents = localStorage.getItem('drillflow_tolerate_accents') === 'off' ? 'off' : 'on';
    let currentTheme = localStorage.getItem('drillflow_theme') || 'dark';

    function updateSyncBadge(text, color = '#10b981') {
        if (syncStatusEl) {
            syncStatusEl.textContent = text;
            syncStatusEl.style.color = color;
        }
    }

    // 2. Initialisation des champs
    function loadCurrentSettings() {
        if (inputPoolSize) {
            inputPoolSize.value = localStorage.getItem('drillflow_active_pool_size') || APP_CONFIG.DEFAULT_ACTIVE_POOL_SIZE.toString();
        }
        if (inputPossibleVolumes) {
            inputPossibleVolumes.value = localStorage.getItem('drillflow_possible_volumes') || APP_CONFIG.DEFAULT_POSSIBLE_VOLUMES.join(', ');
        }
        if (inputReinsertMin) {
            inputReinsertMin.value = localStorage.getItem('drillflow_reinsert_min') || APP_CONFIG.DEFAULT_REINSERT_MIN.toString();
        }
        if (inputReinsertMax) {
            inputReinsertMax.value = localStorage.getItem('drillflow_reinsert_max') || APP_CONFIG.DEFAULT_REINSERT_MAX.toString();
        }
        if (selectMode) {
            selectMode.value = localStorage.getItem('drillflow_default_mode') || localStorage.getItem('voc_last_mode') || APP_CONFIG.DEFAULT_MODE;
        }
        if (inputVolume) {
            inputVolume.value = localStorage.getItem('drillflow_default_volume') || localStorage.getItem('voc_last_vol') || APP_CONFIG.DEFAULT_VOLUME.toString();
        }
        if (selectSrc) {
            selectSrc.value = localStorage.getItem('drillflow_default_src') || localStorage.getItem('voc_last_src') || APP_CONFIG.DEFAULT_SRC;
        }
        if (selectTgt) {
            selectTgt.value = localStorage.getItem('drillflow_default_tgt') || localStorage.getItem('voc_last_tgt') || APP_CONFIG.DEFAULT_TGT;
        }
        if (inputCertLockDays) {
            inputCertLockDays.value = getCertNameLockDays().toString();
        }

        // Test de Niveau
        if (inputTestWords) {
            inputTestWords.value = getTestWordsPerLevel().toString();
        }
        if (inputTestTimerDesktop) {
            inputTestTimerDesktop.value = localStorage.getItem('drillflow_test_timer_desktop') || APP_CONFIG.DEFAULT_TEST_TIMER_DESKTOP.toString();
        }
        if (inputTestTimerMobile) {
            inputTestTimerMobile.value = localStorage.getItem('drillflow_test_timer_mobile') || APP_CONFIG.DEFAULT_TEST_TIMER_MOBILE.toString();
        }
        if (inputTestPassThreshold) {
            inputTestPassThreshold.value = getTestPassThreshold().toString();
        }

        // Paliers de points CECRL
        const cefrThresholds = getCefrThresholds();
        if (inputCefrA1) inputCefrA1.value = cefrThresholds.A1.toString();
        if (inputCefrA2) inputCefrA2.value = cefrThresholds.A2.toString();
        if (inputCefrB1) inputCefrB1.value = cefrThresholds.B1.toString();
        if (inputCefrB2) inputCefrB2.value = cefrThresholds.B2.toString();
        if (inputCefrC1) inputCefrC1.value = cefrThresholds.C1.toString();
        if (inputCefrC2) inputCefrC2.value = cefrThresholds.C2.toString();

        if (selectAppLang) {
            selectAppLang.value = localStorage.getItem('app_lang') || 'fr';
        }

        updateAudioSwitch(currentAudio);
        updateAccentsSwitch(currentAccents);
        updateThemeSwitch(currentTheme);
        applyTheme(currentTheme);
    }

    function updateAudioSwitch(val) {
        currentAudio = val;
        if (btnAudioOn && btnAudioOff) {
            if (val === 'on') {
                btnAudioOn.classList.add('active');
                btnAudioOff.classList.remove('active');
            } else {
                btnAudioOff.classList.add('active');
                btnAudioOn.classList.remove('active');
            }
        }
    }

    function updateAccentsSwitch(val) {
        currentAccents = val;
        if (btnAccentsOn && btnAccentsOff) {
            if (val === 'on') {
                btnAccentsOn.classList.add('active');
                btnAccentsOff.classList.remove('active');
            } else {
                btnAccentsOff.classList.add('active');
                btnAccentsOn.classList.remove('active');
            }
        }
    }

    function updateThemeSwitch(val) {
        currentTheme = val;
        if (btnThemeLight && btnThemeDark) {
            if (val === 'light') {
                btnThemeLight.classList.add('active');
                btnThemeDark.classList.remove('active');
            } else {
                btnThemeDark.classList.add('active');
                btnThemeLight.classList.remove('active');
            }
        }
    }

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
    }

    // 3. Événements des boutons switch
    if (btnAudioOn) btnAudioOn.onclick = () => { updateAudioSwitch('on'); saveSettings(false); };
    if (btnAudioOff) btnAudioOff.onclick = () => { updateAudioSwitch('off'); saveSettings(false); };

    if (btnAccentsOn) btnAccentsOn.onclick = () => { updateAccentsSwitch('on'); saveSettings(false); };
    if (btnAccentsOff) btnAccentsOff.onclick = () => { updateAccentsSwitch('off'); saveSettings(false); };

    if (btnThemeDark) btnThemeDark.onclick = () => { updateThemeSwitch('dark'); applyTheme('dark'); saveSettings(false); };
    if (btnThemeLight) btnThemeLight.onclick = () => { updateThemeSwitch('light'); applyTheme('light'); saveSettings(false); };

    // Événements des sélecteurs
    if (selectMode) selectMode.onchange = () => saveSettings(false);
    if (selectSrc) selectSrc.onchange = () => saveSettings(false);
    if (selectTgt) selectTgt.onchange = () => saveSettings(false);
    if (selectAppLang) selectAppLang.onchange = () => saveSettings(false);

    // Événements des champs texte et numériques (avec debounce)
    const inputsToWatch = [
        inputPoolSize,
        inputPossibleVolumes,
        inputReinsertMin,
        inputReinsertMax,
        inputVolume,
        inputCertLockDays,
        inputTestWords,
        inputTestTimerDesktop,
        inputTestTimerMobile,
        inputTestPassThreshold,
        inputCefrA1,
        inputCefrA2,
        inputCefrB1,
        inputCefrB2,
        inputCefrC1,
        inputCefrC2
    ];

    let debounceTimer = null;
    inputsToWatch.forEach(inp => {
        if (!inp) return;
        inp.addEventListener('change', () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            saveSettings(false);
        });
        inp.addEventListener('blur', () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            saveSettings(false);
        });
        inp.addEventListener('input', () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                saveSettings(false);
            }, 500);
        });
    });

    // 4. Enregistrement (Auto-save + Cloud Firestore)
    async function saveSettings(silent = false) {
        const poolSize = inputPoolSize ? parseInt(inputPoolSize.value, 10) : APP_CONFIG.DEFAULT_ACTIVE_POOL_SIZE;
        if (isNaN(poolSize) || poolSize < 10) {
            if (!silent) showToast('⚠️ La taille du pool doit être au moins de 10 mots.', true);
            updateSyncBadge('⚠️ Valeur du pool invalide', '#ef4444');
            return false;
        }

        const rawVols = (inputPossibleVolumes ? inputPossibleVolumes.value : '5, 10, 15, 20')
            .split(',')
            .map(v => parseInt(v.trim(), 10))
            .filter(n => !isNaN(n) && n > 0);
        if (rawVols.length === 0) {
            if (!silent) showToast('⚠️ Vous devez définir au moins un nombre de mots possible (ex: 5, 10, 15, 20).', true);
            updateSyncBadge('⚠️ Volumes invalides', '#ef4444');
            return false;
        }
        const cleanVols = Array.from(new Set(rawVols)).sort((a, b) => a - b);

        const rMin = inputReinsertMin ? parseInt(inputReinsertMin.value, 10) : APP_CONFIG.DEFAULT_REINSERT_MIN;
        const rMax = inputReinsertMax ? parseInt(inputReinsertMax.value, 10) : APP_CONFIG.DEFAULT_REINSERT_MAX;
        if (isNaN(rMin) || isNaN(rMax) || rMin < 1 || rMax < rMin) {
            if (!silent) showToast('⚠️ L\'intervalle de réinsertion est invalide (Min >= 1 et Max >= Min).', true);
            updateSyncBadge('⚠️ Réinsertion invalide', '#ef4444');
            return false;
        }

        const vol = inputVolume ? parseInt(inputVolume.value, 10) : APP_CONFIG.DEFAULT_VOLUME;
        if (isNaN(vol) || vol < 1) {
            if (!silent) showToast('⚠️ Le volume de session doit être d\'au moins 1 mot.', true);
            return false;
        }

        if (selectSrc && selectTgt && selectSrc.value === selectTgt.value) {
            if (!silent) showToast('⚠️ La langue source et la langue cible doivent être différentes.', true);
            updateSyncBadge('⚠️ Langues source et cible identiques', '#ef4444');
            return false;
        }

        const lockDays = inputCertLockDays ? parseInt(inputCertLockDays.value, 10) : APP_CONFIG.CERT_NAME_LOCK_DAYS;
        if (isNaN(lockDays) || lockDays < 1) {
            if (!silent) showToast('⚠️ Le délai de verrouillage du nom doit être d\'au moins 1 jour.', true);
            return false;
        }

        // Test de Niveau
        const testWords = inputTestWords ? parseInt(inputTestWords.value, 10) : APP_CONFIG.DEFAULT_TEST_WORDS_PER_LEVEL;
        if (isNaN(testWords) || testWords < 3 || testWords > 50) {
            if (!silent) showToast('⚠️ Le nombre de mots par niveau pour le test doit être entre 3 et 50.', true);
            return false;
        }

        const testTimerDesk = inputTestTimerDesktop ? parseInt(inputTestTimerDesktop.value, 10) : APP_CONFIG.DEFAULT_TEST_TIMER_DESKTOP;
        if (isNaN(testTimerDesk) || testTimerDesk < 3 || testTimerDesk > 60) {
            if (!silent) showToast('⚠️ Le temps par mot sur PC doit être entre 3 et 60 secondes.', true);
            return false;
        }

        const testTimerMob = inputTestTimerMobile ? parseInt(inputTestTimerMobile.value, 10) : APP_CONFIG.DEFAULT_TEST_TIMER_MOBILE;
        if (isNaN(testTimerMob) || testTimerMob < 3 || testTimerMob > 60) {
            if (!silent) showToast('⚠️ Le temps par mot sur mobile doit être entre 3 et 60 secondes.', true);
            return false;
        }

        const testThreshold = inputTestPassThreshold ? parseInt(inputTestPassThreshold.value, 10) : APP_CONFIG.DEFAULT_TEST_PASS_THRESHOLD;
        if (isNaN(testThreshold) || testThreshold < 10 || testThreshold > 100) {
            if (!silent) showToast('⚠️ Le seuil de passage doit être entre 10% et 100%.', true);
            return false;
        }

        // Paliers de points CECRL
        const cefrA1 = inputCefrA1 ? parseInt(inputCefrA1.value, 10) : DEFAULT_CEFR_THRESHOLDS.A1;
        const cefrA2 = inputCefrA2 ? parseInt(inputCefrA2.value, 10) : DEFAULT_CEFR_THRESHOLDS.A2;
        const cefrB1 = inputCefrB1 ? parseInt(inputCefrB1.value, 10) : DEFAULT_CEFR_THRESHOLDS.B1;
        const cefrB2 = inputCefrB2 ? parseInt(inputCefrB2.value, 10) : DEFAULT_CEFR_THRESHOLDS.B2;
        const cefrC1 = inputCefrC1 ? parseInt(inputCefrC1.value, 10) : DEFAULT_CEFR_THRESHOLDS.C1;
        const cefrC2 = inputCefrC2 ? parseInt(inputCefrC2.value, 10) : DEFAULT_CEFR_THRESHOLDS.C2;

        if (isNaN(cefrA1) || isNaN(cefrA2) || isNaN(cefrB1) || isNaN(cefrB2) || isNaN(cefrC1) || isNaN(cefrC2) ||
            cefrA1 <= 0 || cefrA2 <= cefrA1 || cefrB1 <= cefrA2 || cefrB2 <= cefrB1 || cefrC1 <= cefrB2 || cefrC2 <= cefrC1) {
            if (!silent) showToast('⚠️ Les paliers CECRL doivent être strictement croissants (0 < A1 < A2 < B1 < B2 < C1 < C2).', true);
            updateSyncBadge('⚠️ Paliers CECRL non croissants', '#ef4444');
            return false;
        }

        const payload = {
            active_pool_size: poolSize,
            possible_volumes: cleanVols.join(', '),
            reinsert_min: rMin,
            reinsert_max: rMax,
            default_mode: selectMode ? selectMode.value : APP_CONFIG.DEFAULT_MODE,
            default_volume: vol,
            default_src: selectSrc ? selectSrc.value : APP_CONFIG.DEFAULT_SRC,
            default_tgt: selectTgt ? selectTgt.value : APP_CONFIG.DEFAULT_TGT,
            cert_name_lock_days: lockDays,
            test_words_per_level: testWords,
            test_timer_desktop: testTimerDesk,
            test_timer_mobile: testTimerMob,
            test_pass_threshold: testThreshold,
            cefr_thresholds: {
                A1: cefrA1,
                A2: cefrA2,
                B1: cefrB1,
                B2: cefrB2,
                C1: cefrC1,
                C2: cefrC2
            }
        };

        // Sauvegarde locale des préférences UI utilisateur
        localStorage.setItem('drillflow_auto_speak', currentAudio);
        localStorage.setItem('drillflow_tolerate_accents', currentAccents);
        localStorage.setItem('drillflow_theme', currentTheme);
        if (selectAppLang) localStorage.setItem('app_lang', selectAppLang.value);

        updateSyncBadge('⏳ Enregistrement dans la base de données...', '#3b82f6');

        // Enregistrement dans Firestore centralisé
        const result = await saveAppConfigToCloud(payload);
        if (result.success) {
            updateSyncBadge('⚡ Sauvegardé dans la base de données', '#10b981');
            if (!silent) showToast('⚡ Enregistré dans la base de données');
            return true;
        } else {
            updateSyncBadge('⚠️ Sauvegardé en local (erreur cloud)', '#f59e0b');
            if (!silent) showToast('⚠️ Sauvegarde locale réussie, erreur connexion base de données.', true);
            return false;
        }
    }

    // 5. Rétablir par défaut
    async function resetToDefaults() {
        if (!confirm('Rétablir tous les paramètres par défaut et synchroniser la base de données ?')) return;

        if (inputPoolSize) inputPoolSize.value = APP_CONFIG.DEFAULT_ACTIVE_POOL_SIZE.toString();
        if (inputPossibleVolumes) inputPossibleVolumes.value = APP_CONFIG.DEFAULT_POSSIBLE_VOLUMES.join(', ');
        if (inputReinsertMin) inputReinsertMin.value = APP_CONFIG.DEFAULT_REINSERT_MIN.toString();
        if (inputReinsertMax) inputReinsertMax.value = APP_CONFIG.DEFAULT_REINSERT_MAX.toString();
        if (selectMode) selectMode.value = APP_CONFIG.DEFAULT_MODE;
        if (inputVolume) inputVolume.value = APP_CONFIG.DEFAULT_VOLUME.toString();
        if (selectSrc) selectSrc.value = APP_CONFIG.DEFAULT_SRC;
        if (selectTgt) selectTgt.value = APP_CONFIG.DEFAULT_TGT;
        if (inputCertLockDays) inputCertLockDays.value = APP_CONFIG.CERT_NAME_LOCK_DAYS.toString();

        // Test de niveau
        if (inputTestWords) inputTestWords.value = APP_CONFIG.DEFAULT_TEST_WORDS_PER_LEVEL.toString();
        if (inputTestTimerDesktop) inputTestTimerDesktop.value = APP_CONFIG.DEFAULT_TEST_TIMER_DESKTOP.toString();
        if (inputTestTimerMobile) inputTestTimerMobile.value = APP_CONFIG.DEFAULT_TEST_TIMER_MOBILE.toString();
        if (inputTestPassThreshold) inputTestPassThreshold.value = APP_CONFIG.DEFAULT_TEST_PASS_THRESHOLD.toString();

        // Paliers CECRL
        if (inputCefrA1) inputCefrA1.value = DEFAULT_CEFR_THRESHOLDS.A1.toString();
        if (inputCefrA2) inputCefrA2.value = DEFAULT_CEFR_THRESHOLDS.A2.toString();
        if (inputCefrB1) inputCefrB1.value = DEFAULT_CEFR_THRESHOLDS.B1.toString();
        if (inputCefrB2) inputCefrB2.value = DEFAULT_CEFR_THRESHOLDS.B2.toString();
        if (inputCefrC1) inputCefrC1.value = DEFAULT_CEFR_THRESHOLDS.C1.toString();
        if (inputCefrC2) inputCefrC2.value = DEFAULT_CEFR_THRESHOLDS.C2.toString();

        if (selectAppLang) selectAppLang.value = 'fr';

        updateAudioSwitch('off');
        updateAccentsSwitch('on');
        updateThemeSwitch('dark');
        applyTheme('dark');

        await saveSettings(false);
    }

    let toastTimeout = null;
    let toastHideTimeout = null;
    function showToast(msg, isError = false) {
        if (!toastEl) return;
        if (toastTimeout) clearTimeout(toastTimeout);
        if (toastHideTimeout) clearTimeout(toastHideTimeout);

        toastEl.textContent = msg;
        toastEl.style.background = isError ? '#ef4444' : '#10b981';
        toastEl.classList.remove('hidden');
        toastEl.style.opacity = '1';
        toastEl.style.transform = 'translateX(-50%) translateY(0)';
        toastTimeout = setTimeout(() => {
            toastEl.style.opacity = '0';
            toastEl.style.transform = 'translateX(-50%) translateY(20px)';
            toastHideTimeout = setTimeout(() => toastEl.classList.add('hidden'), 300);
        }, 2400);
    }

    if (btnSave) btnSave.onclick = () => saveSettings(false);
    if (btnReset) btnReset.onclick = resetToDefaults;

    // Chargement initial : on affiche d'abord les valeurs locales, puis on synchronise avec la DB
    loadCurrentSettings();
    updateSyncBadge('⏳ Synchronisation cloud...', '#3b82f6');
    try {
        const cloudData = await fetchAppConfigFromCloud();
        if (cloudData) {
            loadCurrentSettings();
            updateSyncBadge('☁️ Connecté à la base de données ⚡', '#10b981');
        } else {
            updateSyncBadge('☁️ Mode local (défauts actifs)', '#64748b');
        }
    } catch (e) {
        console.warn("Erreur chargement cloud:", e);
        updateSyncBadge('⚠️ Connexion hors-ligne', '#f59e0b');
    }
}

// Lancement robuste quel que soit le timing de chargement du module
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initConfigPage);
} else {
    initConfigPage();
}
