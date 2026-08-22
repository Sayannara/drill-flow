const fs = require('fs');
let content = fs.readFileSync('js/drill.js', 'utf8');

const contextLogic = `

// --- CONTEXT DRILL LOGIC ---
let contextState = {
    pairs: [],
    matchesLeft: 0,
    selectedWordId: null
};

function startContextDrill() {
    const wordsWithExamples = sessionState.originalWords.filter(w => w['ex_' + sessionState.langTarget]);
    if (wordsWithExamples.length === 0) {
        document.getElementById('nav-home').click();
        return;
    }

    const endContainer = document.getElementById('end-session-container');
    if (endContainer) endContainer.style.display = 'none';

    const contextContainer = document.getElementById('context-drill-container');
    if (contextContainer) contextContainer.style.display = 'flex';

    contextState.pairs = wordsWithExamples.map(w => {
        const targetWord = w[sessionState.langTarget];
        const sentence = w['ex_' + sessionState.langTarget];
        const escapedWord = targetWord.replace(/[.*+?^\\$\\{\\}()|[\\]\\\\]/g, '\\\\$&');
        const regex = new RegExp('(' + escapedWord + ')', 'gi');
        const sentenceHtml = sentence.replace(regex, '<span class="context-dropzone" data-id="' + w.id + '"></span>');
        return {
            id: w.id,
            wordText: targetWord,
            sentenceHtml: sentenceHtml
        };
    });

    contextState.matchesLeft = contextState.pairs.length;
    contextState.selectedWordId = null;

    renderContextDrill();
}

function renderContextDrill() {
    const poolEl = document.getElementById('context-word-pool');
    const sentencesEl = document.getElementById('context-sentences-list');
    
    poolEl.innerHTML = '';
    sentencesEl.innerHTML = '';

    const shuffledWords = shuffle([...contextState.pairs]);
    const shuffledSentences = shuffle([...contextState.pairs]);

    shuffledWords.forEach(pair => {
        const btn = document.createElement('div');
        btn.className = 'context-word-btn';
        btn.textContent = pair.wordText;
        btn.dataset.id = pair.id;
        btn.draggable = true;

        btn.addEventListener('dragstart', (e) => {
            e.dataTransfer.setData('text/plain', pair.id);
            btn.classList.add('dragging');
        });
        btn.addEventListener('dragend', () => {
            btn.classList.remove('dragging');
        });

        btn.addEventListener('click', () => {
            document.querySelectorAll('.context-word-btn').forEach(b => b.classList.remove('selected'));
            btn.classList.add('selected');
            contextState.selectedWordId = pair.id;
            
            document.querySelectorAll('.context-dropzone').forEach(dz => {
                if (!dz.classList.contains('success')) {
                    dz.classList.add('selectable');
                }
            });
        });

        poolEl.appendChild(btn);
    });

    shuffledSentences.forEach(pair => {
        const card = document.createElement('div');
        card.className = 'context-sentence-card';
        card.id = 'sentence-card-' + pair.id;
        
        const text = document.createElement('div');
        text.className = 'context-sentence-text';
        text.innerHTML = pair.sentenceHtml;

        card.appendChild(text);
        sentencesEl.appendChild(card);

        const dzs = card.querySelectorAll('.context-dropzone');
        dzs.forEach(dz => {
            dz.addEventListener('dragover', (e) => {
                e.preventDefault();
                dz.classList.add('drag-over');
            });
            dz.addEventListener('dragleave', () => {
                dz.classList.remove('drag-over');
            });
            dz.addEventListener('drop', (e) => {
                e.preventDefault();
                dz.classList.remove('drag-over');
                const draggedId = e.dataTransfer.getData('text/plain');
                handleContextMatch(draggedId, dz.dataset.id, dz, card);
            });

            dz.addEventListener('click', () => {
                if (contextState.selectedWordId && !dz.classList.contains('success')) {
                    handleContextMatch(contextState.selectedWordId, dz.dataset.id, dz, card);
                }
            });
        });
    });
}

function handleContextMatch(draggedId, targetId, dzEl, cardEl) {
    if (draggedId === targetId) {
        if (window.appSettings && window.appSettings.soundEnabled !== false) {
            const audio = new Audio('assets/sounds/correct.mp3');
            audio.volume = 0.5;
            audio.play().catch(e => console.log('Audio error:', e));
        }

        const btn = document.querySelector('.context-word-btn[data-id="' + draggedId + '"]');
        if (btn) {
            btn.classList.remove('selected');
            btn.classList.add('success-match');
            setTimeout(() => btn.style.display = 'none', 500);
        }

        dzEl.classList.remove('selectable');
        dzEl.classList.add('success');
        dzEl.textContent = btn ? btn.textContent : '...';

        cardEl.classList.add('matched');
        setTimeout(() => cardEl.style.display = 'none', 500);

        contextState.selectedWordId = null;
        document.querySelectorAll('.context-dropzone.selectable').forEach(d => d.classList.remove('selectable'));

        contextState.matchesLeft--;
        if (contextState.matchesLeft <= 0) {
            setTimeout(showContextEndSession, 600);
        }
    } else {
        if (window.appSettings && window.appSettings.soundEnabled !== false) {
            const audio = new Audio('assets/sounds/incorrect.mp3');
            audio.volume = 0.5;
            audio.play().catch(e => console.log('Audio error:', e));
        }
        dzEl.classList.add('error-shake');
        setTimeout(() => dzEl.classList.remove('error-shake'), 400);
    }
}

function showContextEndSession() {
    const contextContainer = document.getElementById('context-drill-container');
    if (contextContainer) contextContainer.style.display = 'none';
    
    const endContainer = document.getElementById('end-session-container');
    if (endContainer) {
        endContainer.style.display = 'flex';
        const promo = document.getElementById('context-drill-promo');
        if (promo) promo.style.display = 'none';
    }

    if (typeof confetti === 'function') {
        const duration = 2 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };
        function randomInRange(min, max) { return Math.random() * (max - min) + min; }
        const interval = setInterval(function() {
            const timeLeft = animationEnd - Date.now();
            if (timeLeft <= 0) return clearInterval(interval);
            const particleCount = 50 * (timeLeft / duration);
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
            confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
        }, 250);
    }
}

window.startContextDrill = startContextDrill;
`;

content += '\n' + contextLogic;
fs.writeFileSync('js/drill.js', content, 'utf8');
