# Montagna Dashboard

Un prototipo mobile-first di web app per monitorare e automatizzare la casa e il terreno in montagna. L'app vive su Vite + React + Tailwind e simula tutti i dispositivi per essere scalabile quando arriveranno gli hardware reali.

## Architettura del progetto

- **Root statico**: `index.html` carica `src/main.tsx` e crea il punto di ingresso React.
- **Styling**: Tailwind CSS con `card-glow` personalizzata, palette scura e gradienti per un look moderno già ottimizzato per smartphone.
- **Componenti**: `src/components` contiene la barra di navigazione mobile-first, card riutilizzabili (`OverviewCard`), liste cronologiche (`HistoryList`) e altri blocchi UI indipendenti.
- **Mock & servizi**: `src/services/mockData.ts` definisce tipi e generatori casuali per prese smart, sensori, meteo, robot e telecamere. L'obiettivo è mantenere la logica simile a una API reale (ogni dispositivo ha un `id`, `status` e metriche) così che in futuro basterà sostituire i generatori con chiamate reali.
- **Hook principale**: `src/hooks/useSimulator.ts` orchestra i dati simulati, aggiorna lo stato ogni 6 secondi, gestisce notifiche, comandi manuali e automazioni, e rimanda funzioni di controllo a `App.tsx`.

## Pagine & componenti principali

| File | Ruolo |
| --- | --- |
| `src/App.tsx` | Layout della dashboard: hero, schede meteo/sensori, controlli per prese/irrigazione/robot/telecamere, dialoghi di notifiche e log. |
| `src/components/Navigation.tsx` | Header sticky con toggle per automazione e link fittizi per future tab. |
| `src/components/OverviewCard.tsx` | Card con titolo, valore e hint per evidenziare meteo/umidità. |
| `src/components/HistoryList.tsx` | Lista stilizzata per log di irrigazione e alert camera. |
| `src/services/mockData.ts` | Tipi (`SmartPlug`, `RobotState`, ecc.) e generatori di esempio con valori ragionevoli per montagna. |
| `src/hooks/useSimulator.ts` | Gestisce stati derivati, logiche di simulazione e azioni dei controlli (toggle prese, irrigazioni, comandi robot, alert camera, notifiche). |

### Flusso utente

1. Il `Navigation` rimane visibile in alto e permette di attivare/disattivare l'automazione.
2. Il `main` mostra valori chiave (meteo, umidità) e subito sotto toggle delle prese smart mock con consumo istantaneo.
3. Sezione irrigazione+robot offre bottoni per trigger manuali e simulazione di comportamenti automatici basati sui dati mock.
4. Telecamere e cronologie usano `HistoryList` per visualizzare allarmi e irrigazioni, mentre la sezione notifiche mostra gli ultimi eventi generati dalla simulazione.

## Simulazione dati

1. `useSimulator` inizializza tutti gli stati tramite i costruttori di `mockData`. Ogni 6 secondi aggiorna letture sensori, meteo, potenza delle prese e livello batteria del robot.
2. Le azioni (toggle dei plug, comandi del robot, irrigazione manuale/auto, simulazione di un alert) aggiungono voci nei log e inviano notifiche sintetiche tramite `pushNotification`.
3. Le letture sensore sono rappresentate con unità (%, °C) e tipologie (`soil`, `air`) pronte per essere sostituite da un nodo reale (es. `fetch("/api/sensors")`).
4. Il comportamento di irrigazione puo essere collegato in futuro a regole reali via webhook/meteo reale: basta sostituire `randomWeather` con una chiamata API e la funzione di `triggerIrrigation` puo invocare il backend.

## Meteo reale (Ragalna CT + Contrada Milia)

- La logica meteo usa un endpoint serverless sicuro (`/api/weather`) che aggrega **Open-Meteo**, **WeatherAPI** e **OpenWeather** sul backend.
- I dati vengono corretti con un offset di quota per simulare Contrada Milia (circa +600m rispetto a Ragalna). La correzione applica un lapse rate di 0.0065 °C per metro.
- Il risultato finale media temperatura, umidita e probabilita di pioggia, scegliendo la condizione piu prudente.
- File principali: `src/services/weatherService.ts`, `src/hooks/useSimulator.ts`, `functions/api/weather.js`, `server/weather-core.js`.

## Tecnologie consigliate

- **Frontend**: Vite + React + TypeScript per sviluppo veloce, bundle leggero e supporto a Progressive Web App.
- **Styling**: Tailwind CSS per classi utility mobile-first senza scrivere CSS custom complesso.
- **State management**: Hook personalizzato (`useSimulator`) con dati centralizzati; si può evolvere con Zustand/Redux se servono più viste o utenze.
- **Hosting gratuito**: build statico è compatibile con GitHub Pages, Netlify, Render o Cloudflare Pages. Non viene richiesto backend night, quindi basta distribuire la cartella `dist`.

## Esempio base di codice (Dashboard key card)

L'elemento centrale è una card come questa:

```tsx
<OverviewCard title="Meteo" value={`${weather.temperature.toFixed(1)} °C`} hint={weather.condition}>
  <p className="text-xs text-slate-300">Umidità {weather.humidity}% · Pioggia {weather.rainProbability}%</p>
  <p className="pt-2 text-xs text-amber-200">{weatherNote}</p>
</OverviewCard>
```

Mostra i dati meteo simulati e fornisce indicazioni (es. "pioggia probabile") per guidare le automazioni dell'irrigazione.

## Variabili ambiente

Copia `.env.example` in `.env` e inserisci (opzionale):

```bash
WEATHERAPI_KEY=
OPENWEATHER_KEY=
VITE_DEVICES_API_URL=
```

Se non imposti le chiavi, il sistema usera solo Open-Meteo in fallback.

## Sicurezza chiavi API (scelta migliore)

- Le chiavi meteo non vengono piu lette dal frontend.
- Il browser chiama solo `/api/weather`.
- Le chiavi restano server-side (Cloudflare Pages Functions o server Node tuo).
- Configurazione Cloudflare in `wrangler.toml`.

## Come eseguire e sviluppare

```bash
npm install
npm run dev      # server di sviluppo Vite
npm run build    # produce dist/ per il deploy
npm run preview  # verifica il build localmente
npm run start:server  # avvia server Node (dist + /api/weather)
```

Per aggiungere nuove sezioni basta creare un nuovo componente in `src/components` e importarlo in `App.tsx`, oppure estendere `useSimulator` con altri generatori (es. sensori ambientali, consumi energetici, sensori di porta). Il design e mobile-first, con card impilate su smartphone e layout multi-colonna sopra i 768px.

## PWA e offline

- `public/manifest.webmanifest` definisce l'app installabile.
- `public/service-worker.js` fa cache degli asset principali per una navigazione base anche offline.
- La registrazione avviene in `src/main.tsx`.

## Sito 100% gratuito con API attive (Cloudflare Pages)

GitHub Pages **non** esegue funzioni server-side, quindi le API non funzionano li. 
Per un sito completo **gratuito** con API attive usa Cloudflare Pages.

Passi semplici:

1. Crea un account gratuito su Cloudflare.
2. Vai su Pages -> Create a project -> Connect to Git.
3. Seleziona il repo `web-app-montagna`.
4. Build command: `npm run build`
5. Output directory: `dist`
6. Settings -> Environment variables:
  - `WEATHERAPI_KEY`
  - `OPENWEATHER_KEY`
7. Deploy.

Risultato:
- Sito online su `https://<nome-progetto>.pages.dev`
- API meteo attiva su `https://<nome-progetto>.pages.dev/api/weather`

## Deploy automatico su GitHub Pages (senza saper configurare)

Il progetto e gia pronto: workflow automatico in `.github/workflows/deploy-gh-pages.yml`.

Fai solo questi passaggi minimi su GitHub:

1. Crea un repository nuovo su GitHub.
2. Carica questo progetto sul branch `main`.
3. Apri GitHub -> repository -> Settings -> Pages.
4. In Build and deployment seleziona `GitHub Actions`.
5. Vai in tab Actions e avvia (o attendi) `Deploy to GitHub Pages`.

URL finale:

- se repo e `username.github.io` allora sito su root
- se repo e diverso, sito su `https://username.github.io/nome-repo/`

Nota: GitHub Pages non esegue Functions server-side, quindi endpoint `/api/weather` non e disponibile li. In quel caso l'app usa fallback Open-Meteo lato client.

## Deploy su server tuo (quando vorrai)

1. Build: `npm run build`
2. Imposta env server:
  - `WEATHERAPI_KEY`
  - `OPENWEATHER_KEY`
3. Avvia: `npm run start:server`
4. Avrai sia frontend statico che API meteo su stesso host (`/api/weather`).

## Altri hosting gratuiti

### GitHub Pages
1. `npm run build` genera `dist/`.
2. Creare branch `gh-pages` o usare action per deploy automatico [`peaceiris/actions-gh-pages`](https://github.com/peaceiris/actions-gh-pages).
3. Nelle impostazioni GitHub, punta GitHub Pages alla cartella `dist/`.

### GitHub Pages
1. `npm run build` genera `dist/`.
2. Deploy statico su `dist`.
3. Nota: su GitHub Pages non hai Functions, quindi meteo multi-fonte server-side non e disponibile.

### GitLab Pages (100% gratuito)
1. Usa template `Pages/Plain HTML`.
2. Carica il file `.gitlab-ci.yml` gia pronto nel repository.
3. Push su `main` e attendi il job `pages` verde.
4. URL finale: `https://<namespace>.gitlab.io/<nome-progetto>/`.
5. Nota: GitLab Pages non esegue Functions, quindi `/api/weather` non e disponibile (fallback Open-Meteo lato client).

## Idee aggiuntive

1. **Mappa termica del terreno**: aggiungere widget con grafico delle zone irrigate e valore di umidità per quadranti.
2. **Ottimizzazione consumi**: registrare energia assorbita dalle prese e proporre finestre di accensione (es. pompa durante le ore non ghiacciate).
3. **Sicurezza avanzata**: integrare rilevatori di temperatura (rischio gelo/incendio) e inviare alert su mobile via Web Push o email.
4. **Regole basate su IoT**: creare un editor di regole ("se umidità < 35% E manca pioggia E nessuna presenza umana => accendi irrigazione"), pronto per collegare un motore di automazione.
5. **Modalità viaggio**: riduce le automazioni e attiva notifiche solo per eventi critici quando sei lontano dalla montagna.

## Prossimi passi suggeriti

1. Collegare un servizio meteo reale (OpenWeather, WeatherAPI) e sostituire `randomWeather`.
2. Collegare MQTT o WebSocket per letture live dei sensori/plugs reali.
3. Aggiungere autenticazione zero-cost (Netlify Identity, Supabase) se servono più utenti.
4. Costruire versioni progressive (PWA) con cache per funzionare offline/sulla strada.
