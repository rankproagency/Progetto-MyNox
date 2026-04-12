# CLAUDE.md — MyNox

## Panoramica Progetto

MyNox è un marketplace mobile (iOS + Android) che connette clienti e discoteche, eliminando i PR come intermediari. Digitalizza l'intera esperienza nightlife: scoperta eventi, acquisto biglietti, ingresso con QR, riscatto free drink.

**Città di lancio:** Padova  
**Stato:** MVP in sviluppo — schermate visive complete, backend da collegare

---

## Stack Tecnico

| Layer | Tecnologia |
|-------|-----------|
| App mobile | React Native + Expo SDK 54 (iOS + Android) |
| Routing | Expo Router (file-based) |
| Linguaggio | TypeScript (strict) |
| Backend / Auth / DB | Supabase (PostgreSQL) — da configurare |
| Pagamenti | Stripe — da integrare |
| Dashboard B2B | React (web app separata) — da costruire |

---

## Comandi Principali

```bash
# Installazione dipendenze
npm install

# Avvio app mobile (Expo)
npm start
# oppure
npx expo start

# Type check
npx tsc --noEmit
```

> Nota: installare dipendenze con `--legacy-peer-deps` se ci sono conflitti peer (problema noto con react@19.1.0)

---

## Struttura Cartelle (attuale)

```
mynox/
├── app/
│   ├── _layout.tsx           # Root layout (StatusBar, Stack navigator)
│   ├── checkout.tsx          # Schermata checkout
│   ├── (tabs)/
│   │   ├── _layout.tsx       # Tab bar con blur (Home/Eventi/Biglietti/Profilo)
│   │   ├── index.tsx         # Home — carousel, sezione stasera, lista settimana, ricerca, selezione città
│   │   ├── events.tsx        # Lista eventi con filtri per giorno
│   │   ├── tickets.tsx       # I miei biglietti
│   │   └── profile.tsx       # Profilo utente
│   ├── event/
│   │   └── [id].tsx          # Pagina evento (hero, biglietti, tavoli, CTA)
│   └── ticket/
│       └── [id].tsx          # Biglietto con QR ingresso + QR free drink
├── components/
│   ├── EventCard.tsx         # Card grande per carousel (con glow viola + badge pulse)
│   ├── EventListItem.tsx     # Riga evento per lista
│   └── TonightHero.tsx       # Card hero grande "Stasera"
├── lib/
│   └── mockData.ts           # Dati mock (da sostituire con Supabase)
├── hooks/                    # Custom hooks (vuoto — da popolare)
├── types/
│   └── index.ts              # Tipi dominio: Event, Ticket, Club, User, TicketType, Table
├── constants/
│   └── colors.ts             # Tutti i colori dell'app
└── supabase/                 # Migrations e schema SQL (da creare)
```

---

## Identità Visiva — Regole Assolute

- **Dark mode esclusiva** — nessun tema chiaro, mai
- **Colore sfondo:** `#07080f`
- **Accent principale:** `#a855f7` (viola neon) — cambiato da blu a viola
- **Accent dark:** `#9333ea`
- **Testo primario:** `#f8fafc`
- **Font:** bold, moderno, grandi per le CTA
- **Mood:** premium, veloce, notturno
- **Tab bar:** frosted glass con `expo-blur` (BlurView intensity 60, tint dark)
- **Card "In evidenza":** glow viola sotto + badge prezzo con animazione pulse
- **Sfondo home:** gradient viola sottile in alto (`rgba(168,85,247,0.12)` → transparent)
- **Logo MYNOX:** text shadow glow viola

Non introdurre mai bianchi, grigi chiari o temi alternativi.

---

## Principi di Sviluppo

### UX è tutto
> **Meno click → più vendite → più profitto.**

- Ogni schermata ha **un unico obiettivo** — nessuna distrazione
- Il checkout deve essere completabile in **3 tap massimo**
- Favorire sempre Apple Pay / Google Pay come primo metodo di pagamento
- Zero friction: nessun form lungo, nessun passaggio inutile

### TypeScript
- Usa TypeScript strict ovunque — **mai `any`**
- Definisci sempre i tipi in `types/` per entità del dominio
- Preferisci `interface` per oggetti del dominio, `type` per unions e utility types

### Componenti React Native
- Componenti funzionali con hooks — mai class components
- Estrai logica complessa in custom hooks (`hooks/`)
- Usa `StyleSheet.create()` per gli stili, non inline styles

### Supabase
- Tutte le query passano attraverso il client in `lib/supabase.ts`
- Gestisci sempre gli errori di Supabase esplicitamente
- Le Row Level Security (RLS) policies sono obbligatorie su ogni tabella
- Non esporre mai la service role key lato client

### Stripe
- Il pagamento avviene sempre server-side (Supabase Edge Function)
- Il QR viene generato **solo dopo conferma pagamento da Stripe webhook**
- Non fidarsi mai del client per lo stato del pagamento

---

## Logica di Business Critica

### QR Biglietto
- Un QR per l'ingresso (scannerizzato dal buttafuori)
- Un QR separato per il free drink (stato: `available` / `used`)
- Il barista segna il drink come usato **toccando un bottone sullo schermo del cliente** — non ha un'app propria
- Un QR usato non può essere riusato — validare lato server

### Buttafuori
- Ha potere assoluto di negare l'accesso
- Se nega → **nessun rimborso** — il cliente accetta questo disclaimer all'acquisto
- Disclaimer presente nel checkout come testo obbligatorio

### Tavoli e Bottiglie
- In app si paga **solo la caparra**
- Il resto si paga in loco — non gestire questo in app
- Caparre non rimborsabili (stessa logica del biglietto)

### Commissione servizio
- 8% su ogni transazione (biglietto + caparra)
- Calcolata e mostrata nel checkout

### Selezione città
- Implementata nella Home — città selezionata mostrata nell'header con chevron
- Padova: disponibile. Altre città (Venezia, Verona, Milano, Roma): badge "Presto"
- Struttura pronta per espansione — basta aggiungere `available: true`

---

## Attori e Permessi (RLS Supabase)

| Ruolo | Accesso |
|-------|---------|
| `customer` | Vede eventi pubblici, i propri biglietti, il proprio profilo |
| `club_admin` | Gestisce solo i propri eventi, vede le proprie statistiche |
| `bouncer` | Può validare QR biglietti (solo lettura + update stato) |
| `service_role` | Solo Edge Functions — mai esposto al client |

---

## Cosa NON Fare

- Non usare `any` in TypeScript
- Non generare logica di pagamento lato client
- Non esporre chiavi Stripe o Supabase service role nel codice client
- Non aggiungere light mode o temi alternativi
- Non aggiungere feature non richieste (guardaroba digitale, AI, social features — roadmap futura)
- Non usare librerie UI esterne con stili chiari o Material Design
- Non fare rimborsi automatici — non esiste nell'MVP
- Non aggiungere commenti ovvi al codice

---

## Edge Case da Gestire

| Scenario | Comportamento |
|----------|--------------|
| QR free drink già usato | Mostra stato "Usato" — blocca riscatto |
| Pagamento fallito | Non generare QR — mostrare errore chiaro |
| Buttafuori nega accesso | Nessun rimborso — UI deve essere chiara |
| Cliente offline | Mostrare QR da cache locale (già scaricato) |
| Biglietto regalato a un amico | Acquisto multiplo + invio digitale in-app |

---

## Milestone

| Milestone | Stato |
|-----------|-------|
| Setup progetto React Native + Expo | ✅ Completato |
| Struttura cartelle + Expo Router | ✅ Completato |
| Schermata Home (carousel, stasera, ricerca, città) | ✅ Completato |
| Schermata Eventi con filtri per giorno | ✅ Completato |
| Pagina Evento (hero, biglietti, tavoli, CTA) | ✅ Completato |
| Schermata Checkout (riepilogo, disclaimer, metodi pagamento) | ✅ Completato |
| Schermata Biglietti + QR (ingresso + free drink) | ✅ Completato |
| Schermata Profilo (stats, storico, preferenze) | ✅ Completato |
| Restyling visual (blur tab bar, glow, pulse, gradient) | ✅ Completato |
| Schema database Supabase | ⬜ Prossimo |
| Supabase Auth (login/registrazione) | ⬜ Da fare |
| Collegare dati reali (sostituire mock data) | ⬜ Da fare |
| Integrazione Stripe | ⬜ Da fare |
| Dashboard B2B discoteche | ⬜ Da fare |
| MVP funzionante end-to-end | ⬜ In sviluppo |

---

## Dipendenze Notevoli

```json
"expo": "~54.0.33"
"expo-router": "~6.0.23"
"expo-blur": installato
"expo-linear-gradient": installato
"react-native-qrcode-svg": installato
"react-native-svg": installato
"@expo/vector-icons": installato
"react-native-safe-area-context": installato
"react-native-screens": installato
```
