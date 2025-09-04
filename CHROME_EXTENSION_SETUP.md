# Clipp Chrome Extension - Installationsguide

## Problem du stötte på
Du försökte ladda hela React-projektet som Chrome extension, men Chrome behöver bara vissa filer i rätt struktur.

## Lösning: Skapa ren extension-mapp

### Steg 1: Skapa ny mapp
1. Skapa en ny mapp på din dator: `clipp-chrome-extension`

### Steg 2: Kopiera dessa filer från din GitHub-clone:

**Huvudfiler (kopiera till rotmappen):**
- `manifest.json`
- `background.js`
- `content.js` 
- `content.css`
- `popup.html`
- `popup.js`
- `popup.css`

**Skapa config-mapp och kopiera:**
- `config/stores.json`

**Skapa locales-mapp och kopiera:**
- `locales/sv.json`
- `locales/en.json`

**Skapa icons-mapp och kopiera:**
- `icons/icon16.png`
- `icons/icon32.png`
- `icons/icon48.png`
- `icons/icon128.png`
- `icons/icon512.png`
- `icons/flag-sv.png`
- `icons/flag-en.png`

### Steg 3: Final mappstruktur
```
clipp-chrome-extension/
├── manifest.json
├── background.js
├── content.js
├── content.css
├── popup.html
├── popup.js
├── popup.css
├── config/
│   └── stores.json
├── locales/
│   ├── sv.json
│   └── en.json
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    ├── icon128.png
    ├── icon512.png
    ├── flag-sv.png
    └── flag-en.png
```

### Steg 4: Ladda extension i Chrome
1. Öppna Chrome
2. Gå till `chrome://extensions/`
3. Aktivera "Developer mode"
4. Klicka "Load unpacked"
5. Välj din `clipp-chrome-extension` mapp
6. Klart! ✅

## Viktigt: Ignorera dessa React-filer
- `src/` mappen
- `node_modules/`
- `package.json`
- `vite.config.ts`
- `tailwind.config.ts`
- Alla andra React/Vite-filer

**Dessa behövs INTE för Chrome extension!**

## Testning
Efter installation:
1. Se Clipp-ikonen i Chrome toolbar
2. Besök zalando.se
3. Se den flytande Clipp-knappen längst ned till höger
4. Klicka för att testa rabattkod-funktionen

## Felsökning
Om du får fel:
- Kontrollera att alla filer finns på rätt plats
- Kolla manifest.json är korrekt
- Se Chrome Developer Console för fel-meddelanden