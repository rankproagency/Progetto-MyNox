# Scanner Buttafuori — Design Spec
**Data:** 2026-05-05  
**Scope:** Validazione biglietti QR ingresso nella dashboard web MyNox

---

## Obiettivo

Permettere ai buttafuori di scannerizzare i QR dei biglietti direttamente dal browser del loro telefono, accedendo alla dashboard come `club_staff` con permesso `can_scan_tickets` assegnato esplicitamente dal proprietario della discoteca. Ogni biglietto ha anche un codice breve leggibile (es. `A7XK2M`) come fallback quando il QR non è scannerizzabile.

---

## Flusso utente

1. Il buttafuori accede alla dashboard con le proprie credenziali staff
2. Nella sidebar appare la voce **Scanner** (visibile solo se ha `can_scan_tickets = true`)
3. Apre `/club/scan` — la pagina carica automaticamente la serata di oggi
4. Se ci sono più eventi nella stessa giornata, compare un dropdown per selezionare quello corretto
5. Il buttafuori può sempre cambiare evento dal selettore in alto
6. Tab **Scansiona**: fotocamera attiva con mirino viola — inquadra il QR del cliente
7. Feedback immediato: flash verde (valido) o rosso (già usato / non valido) a tutto schermo, poi card con nome e tipo biglietto
8. Auto-reset dopo 3 secondi → pronto per la prossima scansione
9. Tab **Cerca**: il buttafuori digita il codice breve del biglietto (6 caratteri, mostrato nell'app sotto il QR) — fallback quando la fotocamera non funziona o il cliente ha lo schermo rotto

---

## Permessi e ruoli

### Nuovo permesso: `can_scan_tickets`
- Aggiunto alla tabella `club_staff` come colonna boolean (default `false`)
- Solo il `club_admin` può attivarlo dalla sezione **Staff** della dashboard tramite toggle
- Il preset **Buttafuori** viene aggiornato con `can_scan_tickets: true` (unico permesso del ruolo)
- Senza questo permesso: link Scanner non appare in sidebar, accesso diretto a `/club/scan` → redirect a `/club/dashboard`

### Propagazione del permesso
- `types/index.ts` — `StaffPermissions` e `ClubStaff` aggiornati
- `lib/auth.ts` — `FULL_PERMISSIONS` aggiornato
- `StaffManager.tsx` — nuovo toggle "Scansione biglietti" nella lista permessi e nei preset
- `ClubSidebar.tsx` — nuovo nav item `{ href: '/club/scan', label: 'Scanner', permission: 'can_scan_tickets' }`
- `update-staff-permissions/route.ts` — `can_scan_tickets` aggiunto a `ALLOWED_KEYS`

---

## Architettura tecnica

### Pagina server: `/app/(club)/club/scan/page.tsx`
- Verifica auth tramite `getProfile()`
- Verifica `can_scan_tickets` tramite `getStaffPermissions()` → redirect se mancante
- Carica gli eventi di oggi per il club (usando `createAdminClient()`)
- Passa eventi al componente client `TicketScanner`

### Componente client: `/components/club/TicketScanner.tsx`
- Libreria: `html5-qrcode` (compatibile Safari iOS + Chrome Android, nessuna dipendenza nativa)
- Stato interno: `idle | scanning | success | error`
- Al successo/errore: flash a tutto schermo (verde/rosso) per 500ms, poi card risultato
- Auto-reset a `idle` dopo 3 secondi
- Selettore evento in cima: mostra l'evento di oggi, dropdown se ce ne sono più nella stessa giornata
- Tab Scansiona / Cerca — la ricerca accetta il codice breve a 6 caratteri del biglietto

### API: `POST /api/club/validate-ticket/route.ts`
**Request:** `{ code: string, eventId: string }` — `code` è il QR content (`MYNOX-TICKET-{uuid}`) oppure il codice breve a 6 caratteri

**Logica:**
1. Verifica autenticazione e che il caller abbia `can_scan_tickets` per quel club
2. Determina il tipo di codice: se contiene `MYNOX-TICKET-` → cerca per `qr_code`; altrimenti cerca per `entry_code`
3. Verifica che `event_id = eventId` e che l'evento appartenga al club del caller
4. Se `status = "valid"` → aggiorna a `"used"`, restituisce `{ ok: true, name, ticketType }`
5. Se `status = "used"` → restituisce `{ ok: false, reason: "already_used", usedAt }`
6. Altrimenti → `{ ok: false, reason: "invalid" }` (no info sensibili)

Usa `createAdminClient()` per le operazioni DB (bypassare RLS).

### Codice breve (`entry_code`)
- Colonna `entry_code VARCHAR(6)` aggiunta alla tabella `tickets` con constraint `UNIQUE`
- Generato alla creazione del biglietto nella Edge Function `confirm-payment`
- Formato: 6 caratteri alfanumerici uppercase, senza caratteri ambigui (`0`, `O`, `1`, `I`, `L`)
- Charset sicuro: `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (32 caratteri → 32^6 = ~1 miliardo di combinazioni)
- Mostrato nell'app mobile sotto il QR con font grande, etichetta "Codice manuale"

---

## File da creare

| File | Tipo | Descrizione |
|------|------|-------------|
| `supabase/migrations/add_can_scan_tickets.sql` | Nuovo | ADD COLUMN can_scan_tickets a club_staff + ADD COLUMN entry_code a tickets |
| `app/(club)/club/scan/page.tsx` | Nuovo | Server component: auth, permesso, eventi oggi |
| `components/club/TicketScanner.tsx` | Nuovo | Client component: camera, tabs, feedback |
| `app/api/club/validate-ticket/route.ts` | Nuovo | POST endpoint validazione QR |

## File da modificare

| File | Modifica |
|------|----------|
| `types/index.ts` | Aggiungi `can_scan_tickets` a `StaffPermissions` e `ClubStaff` |
| `lib/auth.ts` | Aggiungi `can_scan_tickets: true` a `FULL_PERMISSIONS` |
| `components/club/StaffManager.tsx` | Nuovo toggle + aggiorna preset Buttafuori |
| `components/layout/ClubSidebar.tsx` | Nuovo nav item Scanner |
| `app/api/club/update-staff-permissions/route.ts` | Aggiungi `can_scan_tickets` a `ALLOWED_KEYS` |

---

## Feedback visivo

| Stato | Colore flash | Card |
|-------|-------------|------|
| Valido | Verde (#22c55e) | Nome + tipo biglietto |
| Già usato | Rosso (#ef4444) | "Già scansionato" + orario |
| Non valido | Rosso (#ef4444) | "Biglietto non valido" |

---

## Fuori scope (per ora)

- Validazione QR free drink (secondo step futuro)
- Generazione `entry_code` per i biglietti esistenti (solo per i nuovi acquisti)
- Modalità offline / cache locale biglietti
- Storico scansioni della serata (da aggiungere dopo)
