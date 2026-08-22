const fs = require('fs');
let i18n = fs.readFileSync('js/i18n.js', 'utf8');

i18n = i18n.replace(/label_source:\s*"Langue de d.*?part.*?"/, 'label_source: "Traduire de :"');
i18n = i18n.replace(/label_target:\s*"Langue d'arriv.*?"/, 'label_target: "Vers :"');

i18n = i18n.replace(/label_source:\s*"Source Language"/, 'label_source: "Translate from:"');
i18n = i18n.replace(/label_target:\s*"Target Language"/, 'label_target: "To:"');

i18n = i18n.replace(/label_source:\s*"Ausgangssprache"/, 'label_source: "Übersetzen von:"');
i18n = i18n.replace(/label_target:\s*"Zielsprache"/, 'label_target: "Nach:"');

i18n = i18n.replace(/label_source:\s*"Idioma de origen"/, 'label_source: "Traducir de:"');
i18n = i18n.replace(/label_target:\s*"Idioma de destino"/, 'label_target: "Hacia:"');

fs.writeFileSync('js/i18n.js', i18n, 'utf8');
