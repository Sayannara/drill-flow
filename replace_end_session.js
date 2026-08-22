const fs = require('fs');
let c = fs.readFileSync('js/drill.js', 'utf8');

const startStr = "if (endContainer) {\n        endContainer.style.display = 'flex';";
const endStr = "// DAcclenchement des confettis";

const startIndex = c.indexOf(startStr);
const endIndex = c.indexOf(endStr);

if (startIndex !== -1 && endIndex !== -1) {
    const replacement = `if (endContainer) {
        endContainer.style.display = 'flex';
        
        // Afficher la promo context-drill si des mots ont des exemples
        const promo = document.getElementById('context-drill-promo');
        const wordsWithExamples = sessionState.originalWords ? sessionState.originalWords.filter(w => w['ex_' + sessionState.langTarget]) : [];
        if (promo) {
            if (wordsWithExamples.length > 0) {
                promo.style.display = 'block';
            } else {
                promo.style.display = 'none';
            }
        }
        
        const btnStartContext = document.getElementById('btn-start-context-drill');
        if (btnStartContext) {
            btnStartContext.onclick = () => {
                if (window.startContextDrill) window.startContextDrill();
            };
        }

        const btnNewBatch = document.getElementById('btn-new-batch');
        if (btnNewBatch) {
            btnNewBatch.onclick = () => {
                // Pour déclencher la navigation, on simule un clic sur le bouton home du menu
                document.getElementById('nav-home').click();
            };
        }
    }
    
    `;
    c = c.substring(0, startIndex) + replacement + c.substring(endIndex);
    fs.writeFileSync('js/drill.js', c, 'utf8');
    console.log("Replaced successfully!");
} else {
    console.log("Could not find start or end index.");
}
