// Configuration Panel JS - drillFlow.
import { APP_CONFIG, getCertNameLockDays, getTestWordsPerLevel, getTestPassThreshold } from './config/app-config.js';

document.addEventListener('DOMContentLoaded', () => {
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

    // État temporaire des commutateurs
    let currentAudio = localStorage.getItem('drillflow_auto_speak') === 'on' ? 'on' : 'off';
    let currentAccents = localStorage.getItem('drillflow_tolerate_accents') === 'off' ? 'off' : 'on';
    let currentTheme = localStorage.getItem('drillflow_theme') || 'dark';

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
            selectMode.value = localStorage.getItem('voc_last_mode') || APP_CONFIG.DEFAULT_MODE;
        }
        if (inputVolume) {
            inputVolume.value = localStorage.getItem('voc_last_vol') || APP_CONFIG.DEFAULT_VOLUME.toString();
        }
        if (selectSrc) {
            selectSrc.value = localStorage.getItem('voc_last_src') || APP_CONFIG.DEFAULT_SRC;
        }
        if (selectTgt) {
            selectTgt.value = localStorage.getItem('voc_last_tgt') || APP_CONFIG.DEFAULT_TGT;
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

    // 3. Événements des boutons switch (avec sauvegarde automatique)
    if (btnAudioOn) btnAudioOn.onclick = () => { updateAudioSwitch('on'); saveSettings(false); };
    if (btnAudioOff) btnAudioOff.onclick = () => { updateAudioSwitch('off'); saveSettings(false); };

    if (btnAccentsOn) btnAccentsOn.onclick = () => { updateAccentsSwitch('on'); saveSettings(false); };
    if (btnAccentsOff) btnAccentsOff.onclick = () => { updateAccentsSwitch('off'); saveSettings(false); };

    if (btnThemeDark) btnThemeDark.onclick = () => { updateThemeSwitch('dark'); applyTheme('dark'); saveSettings(false); };
    if (btnThemeLight) btnThemeLight.onclick = () => { updateThemeSwitch('light'); applyTheme('light'); saveSettings(false); };

    // Événements des sélecteurs (avec sauvegarde automatique)
    if (selectMode) selectMode.onchange = () => saveSettings(false);
    if (selectSrc) selectSrc.onchange = () => saveSettings(false);
    if (selectTgt) selectTgt.onchange = () => saveSettings(false);
    if (selectAppLang) selectAppLang.onchange = () => saveSettings(false);

    // Événements des champs texte et numériques (avec debounce et validation automatique)
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
        inputTestPassThreshold
    ];

    let debounceTimer = null;
    inputsToWatch.forEach(inp => {
        if (!inp) return;
        inp.addEventListener('change', () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            saveSettings(false);
        });
        inp.addEventListener('input', () => {
            if (debounceTimer) clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                saveSettings(true);
            }, 500);
        });
    });

    // 4. Enregistrement (Auto-save)
    function saveSettings(silent = false) {
        const poolSize = parseInt(inputPoolSize.value, 10);
        if (isNaN(poolSize) || poolSize < 10) {
            if (!silent) showToast('⚠️ La taille du pool doit être au moins de 10 mots.', true);
            return false;
        }

        const rawVols = (inputPossibleVolumes ? inputPossibleVolumes.value : '5, 10, 15, 20')
            .split(',')
            .map(v => parseInt(v.trim(), 10))
            .filter(n => !isNaN(n) && n > 0);
        if (rawVols.length === 0) {
            if (!silent) showToast('⚠️ Vous devez définir au moins un nombre de mots possible (ex: 5, 10, 15, 20).', true);
            return false;
        }
        const cleanVols = Array.from(new Set(rawVols)).sort((a, b) => a - b);

        const rMin = parseInt(inputReinsertMin.value, 10);
        const rMax = parseInt(inputReinsertMax.value, 10);
        if (isNaN(rMin) || isNaN(rMax) || rMin < 1 || rMax < rMin) {
            if (!silent) showToast('⚠️ L\'intervalle de réinsertion est invalide (Min >= 1 et Max >= Min).', true);
            return false;
        }

        const vol = parseInt(inputVolume.value, 10);
        if (isNaN(vol) || vol < 1) {
            if (!silent) showToast('⚠️ Le volume de session doit être d\'au moins 1 mot.', true);
            return false;
        }

        if (selectSrc.value === selectTgt.value) {
            if (!silent) showToast('⚠️ La langue source et la langue cible doivent être différentes.', true);
            return false;
        }

        const lockDays = inputCertLockDays ? parseInt(inputCertLockDays.value, 10) : 30;
        if (isNaN(lockDays) || lockDays < 1) {
            if (!silent) showToast('⚠️ Le délai de verrouillage du nom doit être d\'au moins 1 jour.', true);
            return false;
        }

        // Test de Niveau
        const testWords = inputTestWords ? parseInt(inputTestWords.value, 10) : 12;
        if (isNaN(testWords) || testWords < 3 || testWords > 50) {
            if (!silent) showToast('⚠️ Le nombre de mots par niveau pour le test doit être entre 3 et 50.', true);
            return false;
        }

        const testTimerDesk = inputTestTimerDesktop ? parseInt(inputTestTimerDesktop.value, 10) : 20;
        if (isNaN(testTimerDesk) || testTimerDesk < 3 || testTimerDesk > 60) {
            if (!silent) showToast('⚠️ Le temps par mot sur PC doit être entre 3 et 60 secondes.', true);
            return false;
        }

        const testTimerMob = inputTestTimerMobile ? parseInt(inputTestTimerMobile.value, 10) : 25;
        if (isNaN(testTimerMob) || testTimerMob < 3 || testTimerMob > 60) {
            if (!silent) showToast('⚠️ Le temps par mot sur mobile doit être entre 3 et 60 secondes.', true);
            return false;
        }

        const testThreshold = inputTestPassThreshold ? parseInt(inputTestPassThreshold.value, 10) : 50;
        if (isNaN(testThreshold) || testThreshold < 10 || testThreshold > 100) {
            if (!silent) showToast('⚠️ Le seuil de passage doit être entre 10% et 100%.', true);
            return false;
        }

        localStorage.setItem('drillflow_active_pool_size', poolSize.toString());
        localStorage.setItem('drillflow_possible_volumes', cleanVols.join(', '));
        localStorage.setItem('drillflow_reinsert_min', rMin.toString());
        localStorage.setItem('drillflow_reinsert_max', rMax.toString());
        localStorage.setItem('voc_last_mode', selectMode.value);
        localStorage.setItem('voc_last_vol', vol.toString());
        localStorage.setItem('voc_last_src', selectSrc.value);
        localStorage.setItem('voc_last_tgt', selectTgt.value);
        localStorage.setItem('drillflow_cert_name_lock_days', lockDays.toString());
        
        // Test de niveau
        localStorage.setItem('drillflow_test_words_per_level', testWords.toString());
        localStorage.setItem('drillflow_test_timer_desktop', testTimerDesk.toString());
        localStorage.setItem('drillflow_test_timer_mobile', testTimerMob.toString());
        localStorage.setItem('drillflow_test_pass_threshold', testThreshold.toString());

        localStorage.setItem('drillflow_auto_speak', currentAudio);
        localStorage.setItem('drillflow_tolerate_accents', currentAccents);
        localStorage.setItem('drillflow_theme', currentTheme);
        localStorage.setItem('app_lang', selectAppLang.value);

        showToast('✓ Modifications enregistrées');
        return true;
    }

    // 5. Rétablir par défaut
    function resetToDefaults() {
        if (!confirm('Rétablir tous les paramètres par défaut ?')) return;

        inputPoolSize.value = APP_CONFIG.DEFAULT_ACTIVE_POOL_SIZE.toString();
        if (inputPossibleVolumes) inputPossibleVolumes.value = APP_CONFIG.DEFAULT_POSSIBLE_VOLUMES.join(', ');
        inputReinsertMin.value = APP_CONFIG.DEFAULT_REINSERT_MIN.toString();
        inputReinsertMax.value = APP_CONFIG.DEFAULT_REINSERT_MAX.toString();
        selectMode.value = APP_CONFIG.DEFAULT_MODE;
        inputVolume.value = APP_CONFIG.DEFAULT_VOLUME.toString();
        selectSrc.value = APP_CONFIG.DEFAULT_SRC;
        selectTgt.value = APP_CONFIG.DEFAULT_TGT;
        if (inputCertLockDays) inputCertLockDays.value = APP_CONFIG.CERT_NAME_LOCK_DAYS.toString();

        // Test de niveau
        if (inputTestWords) inputTestWords.value = APP_CONFIG.DEFAULT_TEST_WORDS_PER_LEVEL.toString();
        if (inputTestTimerDesktop) inputTestTimerDesktop.value = APP_CONFIG.DEFAULT_TEST_TIMER_DESKTOP.toString();
        if (inputTestTimerMobile) inputTestTimerMobile.value = APP_CONFIG.DEFAULT_TEST_TIMER_MOBILE.toString();
        if (inputTestPassThreshold) inputTestPassThreshold.value = APP_CONFIG.DEFAULT_TEST_PASS_THRESHOLD.toString();

        selectAppLang.value = 'fr';

        updateAudioSwitch('off');
        updateAccentsSwitch('on');
        updateThemeSwitch('dark');
        applyTheme('dark');

        saveSettings(false);
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
        }, 2200);
    }

    if (btnSave) btnSave.onclick = () => saveSettings(false);
    if (btnReset) btnReset.onclick = resetToDefaults;

    loadCurrentSettings();
});
