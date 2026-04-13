# Dashboard B2B MyNox — Design Spec
**Data:** 2026-04-13  
**Stato:** Approvato

---

## Panoramica

Web app separata (`mynox-dashboard`) che permette a MyNox (admin) e alle discoteche partner (club_admin) di gestire eventi, biglietti e statistiche. Si connette allo stesso progetto Supabase dell'app mobile.

---

## Stack Tecnico

| Layer | Tecnologia |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Linguaggio | TypeScript strict |
| Styling | Tailwind CSS |
| Componenti UI | shadcn/ui (tema dark personalizzato) |
| Grafici | Recharts |
| Backend/DB | Supabase (stesso progetto dell'app mobile) |
| Auth | Supabase Auth (stessa istanza) |
| Deploy | Vercel |

---

## Identità Visiva

Professionale e sobrio — ispirato a Stripe Dashboard / Linear / Vercel. Dark mode esclusiva.

| Token | Valore |
|-------|--------|
| Background | `#0a0a0f` |
| Surface | `#111118` |
| Surface elevated | `#1a1a24` |
| Border | `rgba(255,255,255,0.08)` |
| Accent | `#a855f7` (usato con parsimonia) |
| Testo primario | `#f1f5f9` |
| Testo secondario | `#94a3b8` |
| Success | `#22c55e` |
| Error | `#ef4444` |

Font: **Inter** (non DM Sans — più adatto a contesti business).  
Niente glow, niente pulse, niente gradient aggressivi. Badge, tag e highlight usano colori flat.

---

## Architettura

```
mynox-dashboard/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (admin)/
│   │   ├── layout.tsx          # Sidebar admin
│   │   ├── dashboard/
│   │   │   └── page.tsx
│   │   ├── clubs/
│   │   │   ├── page.tsx        # Lista club
│   │   │   └── [id]/
│   │   │       └── page.tsx    # Dettaglio club
│   │   ├── events/
│   │   │   ├── page.tsx        # Tutti gli eventi
│   │   │   └── [id]/
│   │   │       └── page.tsx    # Dettaglio evento
│   │   └── users/
│   │       └── page.tsx
│   └── (club)/
│       ├── layout.tsx          # Sidebar club
│       ├── dashboard/
│       │   └── page.tsx
│       ├── events/
│       │   ├── page.tsx
│       │   ├── new/
│       │   │   └── page.tsx
│       │   └── [id]/
│       │       └── page.tsx
│       └── analytics/
│           └── page.tsx
├── components/
│   ├── ui/                     # shadcn/ui components
│   ├── layout/
│   │   ├── AdminSidebar.tsx
│   │   └── ClubSidebar.tsx
│   ├── charts/
│   │   ├── SalesChart.tsx
│   │   └── TicketBreakdown.tsx
│   └── tables/
│       ├── EventsTable.tsx
│       └── TicketsTable.tsx
├── lib/
│   ├── supabase.ts             # Client Supabase
│   └── auth.ts                 # Helper ruoli e redirect
└── types/
    └── index.ts                # Tipi condivisi
```

---

## Database — Modifiche Necessarie

Aggiungere alla tabella `profiles` esistente:

```sql
alter table public.profiles
  add column if not exists role text not null default 'customer'
    check (role in ('customer', 'club_admin', 'admin')),
  add column if not exists club_id uuid references public.clubs(id);
```

Aggiornare le RLS policies per permettere a `club_admin` di scrivere sui propri eventi.

---

## Autenticazione e Routing

Login unico su `/login`. Dopo il login, redirect automatico basato sul ruolo:

| Ruolo | Redirect |
|-------|---------|
| `admin` | `/admin/dashboard` |
| `club_admin` | `/club/dashboard` |
| `customer` | Errore — accesso negato |

Middleware Next.js protegge tutte le route `/admin/*` e `/club/*`.  
Un `club_admin` non può accedere a `/admin/*` — reindirizzato a `/club/dashboard`.

---

## Pannello Admin

### `/admin/dashboard`
KPI globali in cima (card):
- Biglietti venduti oggi / questo mese
- Incasso totale (lordo e netto dopo commissioni)
- Numero eventi attivi
- Nuovi utenti registrati (ultimi 7 giorni)

Tabella eventi recenti con stato (pubblicato/bozza), vendite, % riempimento.

### `/admin/clubs`
Tabella di tutti i club con: nome, città, eventi attivi, stato (attivo/inattivo).  
Bottone "Aggiungi club" apre form in modal: nome, città, indirizzo, immagine, contatti.  
Click su un club apre `/admin/clubs/[id]` con dettaglio completo e lista eventi.

### `/admin/events`
Tabella di tutti gli eventi (paginata) con filtri per club, data, stato.  
Toggle rapido pubblica/nascondi inline.  
Click apre dettaglio con preview, biglietti venduti, tavoli prenotati.

### `/admin/users`
Lista utenti registrati con: nome, email, data registrazione, numero biglietti acquistati.  
Filtro per ruolo. Possibilità di promuovere un utente a `club_admin` e assegnarlo a un club.

---

## Pannello Discoteca

### `/club/dashboard`
KPI della propria discoteca:
- Biglietti venduti oggi e questo mese
- Incasso netto (dopo commissione 8% MyNox)
- Prossimo evento (con countdown)
- Ultimi 5 biglietti venduti (tabella live)

### `/club/events`
Lista dei propri eventi. Ogni riga mostra: nome, data, vendite/capacità (progress bar), stato.  
Bottone "Crea evento" in alto a destra.

### `/club/events/new` e `/club/events/[id]`
Form completo per creare/modificare un evento:
- Informazioni base: nome, descrizione, data, orario inizio/fine
- Media: URL immagine copertina
- Dettagli: dress code, capienza, generi musicali
- Lineup: aggiungi artisti con nome e orario (lista dinamica)
- Tipi biglietto: aggiungi/rimuovi tipi (label, prezzo, quantità, include drink)
- Tavoli: aggiungi/rimuovi tavoli (label, capienza, caparra, disponibile sì/no)
- Stato: bozza o pubblicato

### `/club/analytics`
Grafici interattivi (Recharts):
- **Vendite nel tempo** — linea per evento, ultimi 30 giorni
- **Breakdown biglietti** — torta Uomo / Donna / Early Bird per evento
- **Incasso lordo vs netto** — barre raggruppate per evento
- **Tasso di riempimento** — % venduto per ogni evento

Filtro per range di date e per evento specifico.

---

## Componenti Chiave

| Componente | Descrizione |
|-----------|-------------|
| `StatCard` | Card KPI con valore, label, delta rispetto al periodo precedente |
| `EventsTable` | Tabella paginata con sorting e filtri |
| `EventForm` | Form evento con sezioni collassabili, validazione Zod |
| `SalesChart` | Grafico linee vendite (Recharts, responsive) |
| `TicketBreakdown` | Grafico torta breakdown tipi biglietto |
| `AdminSidebar` | Sidebar fissa con nav admin e logo MyNox |
| `ClubSidebar` | Sidebar fissa con nav club, nome discoteca in cima |

---

## Deployment

- Repository: `mynox-dashboard` (nuova repo GitHub, stesso org)
- Variabili d'ambiente: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- Deploy: Vercel (collegato alla repo, auto-deploy su push a `main`)
- URL iniziale: `mynox-dashboard.vercel.app`
- Dominio custom: `dashboard.mynox.it` (da configurare quando disponibile)
