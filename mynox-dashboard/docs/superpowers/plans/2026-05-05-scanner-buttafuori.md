# Scanner Buttafuori — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aggiungere lo scanner QR per i buttafuori nella dashboard web, con permesso `can_scan_tickets` assegnato dal club admin, codice manuale a 6 caratteri come fallback, e validazione biglietti in tempo reale.

**Architecture:** Pagina server `/club/scan` verifica auth + permesso e carica gli eventi di oggi; componente client `TicketScanner` gestisce fotocamera (`html5-qrcode`) e ricerca manuale; API `POST /api/club/validate-ticket` marca il biglietto come `used`. Ogni biglietto genera un `entry_code` a 6 caratteri nella Edge Function `confirm-payment`.

**Tech Stack:** Next.js App Router, html5-qrcode, Supabase (admin client), TypeScript strict

---

### Task 1: DB Migration — `can_scan_tickets` + `entry_code`

**Files:**
- Create: `mynox-dashboard/supabase/migrations/add_can_scan_tickets.sql`

- [ ] **Crea il file migration SQL**

```sql
-- Aggiungi can_scan_tickets alla tabella club_staff
ALTER TABLE club_staff
  ADD COLUMN IF NOT EXISTS can_scan_tickets boolean NOT NULL DEFAULT false;

-- Aggiungi entry_code alla tabella tickets
ALTER TABLE tickets
  ADD COLUMN IF NOT EXISTS entry_code varchar(6) UNIQUE;
```

- [ ] **Esegui la migration nel progetto Supabase**

Apri il pannello SQL di Supabase e incolla + esegui il contenuto del file.

- [ ] **Commit**

```bash
cd /Users/pietrotortelotti/Desktop/mynox/mynox-dashboard
git add supabase/migrations/add_can_scan_tickets.sql
git commit -m "feat: migration can_scan_tickets e entry_code"
```

---

### Task 2: TypeScript Types

**Files:**
- Modify: `mynox-dashboard/types/index.ts`

- [ ] **Aggiorna `StaffPermissions` e `ClubStaff`**

In `types/index.ts`, aggiungi `can_scan_tickets` a entrambe le interfacce:

```typescript
export interface StaffPermissions {
  can_manage_events: boolean;
  can_manage_tables: boolean;
  can_view_analytics: boolean;
  can_view_participants: boolean;
  can_scan_tickets: boolean;
}

export interface ClubStaff {
  id: string;
  user_id: string;
  club_id: string;
  invited_by: string | null;
  can_manage_events: boolean;
  can_manage_tables: boolean;
  can_view_analytics: boolean;
  can_view_participants: boolean;
  can_scan_tickets: boolean;
  created_at: string;
  profiles?: { name: string; email: string };
}
```

Aggiorna anche `Ticket` per includere `entry_code`:

```typescript
export interface Ticket {
  id: string;
  user_id: string;
  event_id: string | null;
  ticket_type_id: string | null;
  event_name: string | null;
  club_name: string | null;
  ticket_label: string | null;
  qr_code: string;
  drink_qr_code: string;
  entry_code: string | null;
  status: 'valid' | 'used' | 'denied' | 'pending';
  drink_used: boolean;
  created_at: string;
}
```

- [ ] **Commit**

```bash
git add types/index.ts
git commit -m "feat: aggiungi can_scan_tickets e entry_code ai tipi"
```

---

### Task 3: Auth + Permessi API

**Files:**
- Modify: `mynox-dashboard/lib/auth.ts`
- Modify: `mynox-dashboard/app/api/club/update-staff-permissions/route.ts`
- Modify: `mynox-dashboard/app/(club)/layout.tsx`

- [ ] **Aggiorna `FULL_PERMISSIONS` in `lib/auth.ts`**

```typescript
export const FULL_PERMISSIONS: StaffPermissions = {
  can_manage_events: true,
  can_manage_tables: true,
  can_view_analytics: true,
  can_view_participants: true,
  can_scan_tickets: true,
};
```

- [ ] **Aggiorna `ALLOWED_KEYS` in `update-staff-permissions/route.ts`**

```typescript
const ALLOWED_KEYS = [
  'can_manage_events',
  'can_manage_tables',
  'can_view_analytics',
  'can_view_participants',
  'can_scan_tickets',
] as const;
```

- [ ] **Aggiorna il fallback permessi nel layout `app/(club)/layout.tsx`**

```typescript
const permissions = isOwner
  ? FULL_PERMISSIONS
  : await getStaffPermissions(profile.id, profile.club_id!) ?? {
      can_manage_events: false,
      can_manage_tables: false,
      can_view_analytics: false,
      can_view_participants: false,
      can_scan_tickets: false,
    };
```

- [ ] **Commit**

```bash
git add lib/auth.ts app/api/club/update-staff-permissions/route.ts app/(club)/layout.tsx
git commit -m "feat: propagazione permesso can_scan_tickets"
```

---

### Task 4: Staff Manager UI

**Files:**
- Modify: `mynox-dashboard/components/club/StaffManager.tsx`

- [ ] **Aggiorna `PermKey`, `PERMISSION_LABELS` e preset Buttafuori**

Sostituisci la definizione `PermKey` e le costanti:

```typescript
type PermKey = keyof Pick<ClubStaff,
  'can_manage_events' | 'can_manage_tables' | 'can_view_analytics' | 'can_scan_tickets'
>;

const PERMISSION_LABELS: { key: PermKey; label: string }[] = [
  { key: 'can_manage_events', label: 'Gestione eventi' },
  { key: 'can_manage_tables', label: 'Tavoli & piantina' },
  { key: 'can_view_analytics', label: 'Analytics (incassi)' },
  { key: 'can_scan_tickets', label: 'Scanner biglietti' },
];
```

Aggiorna il preset `buttafuori` in `PRESETS`:

```typescript
{
  id: 'buttafuori',
  label: 'Buttafuori',
  description: 'Solo scanner',
  icon: ShieldCheck,
  permissions: {
    can_manage_events: false,
    can_manage_tables: false,
    can_view_analytics: false,
    can_scan_tickets: true,
  },
},
```

Aggiorna anche tutti gli altri preset aggiungendo `can_scan_tickets: false` e il preset `full` con `can_scan_tickets: true`:

```typescript
{ id: 'responsabile_sala', ..., permissions: { can_manage_events: false, can_manage_tables: true, can_view_analytics: false, can_scan_tickets: false } },
{ id: 'gestore_eventi', ..., permissions: { can_manage_events: true, can_manage_tables: false, can_view_analytics: true, can_scan_tickets: false } },
{ id: 'full', ..., permissions: { can_manage_events: true, can_manage_tables: true, can_view_analytics: true, can_scan_tickets: true } },
{ id: 'custom', ..., permissions: { can_manage_events: false, can_manage_tables: false, can_view_analytics: false, can_scan_tickets: false } },
```

Aggiorna anche lo stato iniziale di `customPermissions`:

```typescript
const [customPermissions, setCustomPermissions] = useState<Pick<StaffPermissions, PermKey>>({
  can_manage_events: false,
  can_manage_tables: false,
  can_view_analytics: false,
  can_scan_tickets: false,
});
```

- [ ] **Commit**

```bash
git add components/club/StaffManager.tsx
git commit -m "feat: aggiungi scanner biglietti ai permessi staff"
```

---

### Task 5: Sidebar — voce Scanner

**Files:**
- Modify: `mynox-dashboard/components/layout/ClubSidebar.tsx`

- [ ] **Aggiungi import `ScanLine` e voce nav**

```typescript
import {
  Home, CalendarDays, BarChart3, Map, LogOut, Settings, Users, ScanLine,
} from 'lucide-react';
```

Aggiungi la voce in `NAV_ITEMS` dopo Analytics:

```typescript
{ href: '/club/scan', label: 'Scanner', icon: ScanLine, permission: 'can_scan_tickets' },
```

- [ ] **Commit**

```bash
git add components/layout/ClubSidebar.tsx
git commit -m "feat: aggiungi voce Scanner nella sidebar"
```

---

### Task 6: Installa `html5-qrcode`

- [ ] **Installa la libreria**

```bash
cd /Users/pietrotortelotti/Desktop/mynox/mynox-dashboard
npm install html5-qrcode
```

- [ ] **Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: installa html5-qrcode"
```

---

### Task 7: API Validazione Biglietto

**Files:**
- Create: `mynox-dashboard/app/api/club/validate-ticket/route.ts`

- [ ] **Crea la route**

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function getCallerClubId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('role, club_id')
    .eq('id', user.id)
    .single();

  if (!profile?.club_id) return null;
  if (profile.role === 'club_admin') return profile.club_id as string;

  if (profile.role === 'club_staff') {
    const { data: staffRecord } = await admin
      .from('club_staff')
      .select('can_scan_tickets')
      .eq('user_id', user.id)
      .eq('club_id', profile.club_id)
      .single();
    if (!staffRecord?.can_scan_tickets) return null;
    return profile.club_id as string;
  }

  return null;
}

export async function POST(req: NextRequest) {
  const clubId = await getCallerClubId();
  if (!clubId) return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 403 });

  const { code, eventId } = await req.json();
  if (!code || !eventId) return NextResponse.json({ ok: false, reason: 'invalid' }, { status: 400 });

  const admin = createAdminClient();

  const { data: event } = await admin
    .from('events')
    .select('id')
    .eq('id', eventId)
    .eq('club_id', clubId)
    .single();

  if (!event) return NextResponse.json({ ok: false, reason: 'invalid' }, { status: 404 });

  const isQrCode = (code as string).startsWith('MYNOX-TICKET-');
  const field = isQrCode ? 'qr_code' : 'entry_code';

  const { data: ticket } = await admin
    .from('tickets')
    .select('id, status, updated_at, user_id, ticket_type_id')
    .eq(field, code)
    .eq('event_id', eventId)
    .maybeSingle();

  if (!ticket) return NextResponse.json({ ok: false, reason: 'invalid' });

  if (ticket.status === 'used') {
    return NextResponse.json({
      ok: false,
      reason: 'already_used',
      usedAt: new Date(ticket.updated_at).toLocaleTimeString('it-IT', {
        hour: '2-digit',
        minute: '2-digit',
      }),
    });
  }

  if (ticket.status !== 'valid') {
    return NextResponse.json({ ok: false, reason: 'invalid' });
  }

  await admin
    .from('tickets')
    .update({ status: 'used' })
    .eq('id', ticket.id);

  const [{ data: profile }, { data: ticketType }] = await Promise.all([
    admin.from('profiles').select('name').eq('id', ticket.user_id).single(),
    ticket.ticket_type_id
      ? admin.from('ticket_types').select('label').eq('id', ticket.ticket_type_id).single()
      : Promise.resolve({ data: null }),
  ]);

  return NextResponse.json({
    ok: true,
    name: profile?.name ?? 'Cliente',
    ticketType: ticketType?.label ?? 'Biglietto',
  });
}
```

- [ ] **Commit**

```bash
git add app/api/club/validate-ticket/route.ts
git commit -m "feat: API validazione biglietto QR e codice manuale"
```

---

### Task 8: Componente `TicketScanner`

**Files:**
- Create: `mynox-dashboard/components/club/TicketScanner.tsx`

- [ ] **Crea il componente client**

```typescript
'use client';

import { useEffect, useRef, useState } from 'react';
import { Scan, Search } from 'lucide-react';

type ScanState = 'idle' | 'success' | 'error';
type Tab = 'scan' | 'search';

interface ScanResult {
  ok: boolean;
  name?: string;
  ticketType?: string;
  reason?: 'already_used' | 'invalid' | 'unauthorized';
  usedAt?: string;
}

interface Event {
  id: string;
  name: string;
}

interface Props {
  events: Event[];
  defaultEventId: string;
}

export default function TicketScanner({ events, defaultEventId }: Props) {
  const [tab, setTab] = useState<Tab>('scan');
  const [selectedEventId, setSelectedEventId] = useState(defaultEventId);
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const scannerRef = useRef<any>(null);
  const processingRef = useRef(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout>>();

  async function handleCode(code: string) {
    if (processingRef.current) return;
    processingRef.current = true;

    const res = await fetch('/api/club/validate-ticket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, eventId: selectedEventId }),
    });
    const data: ScanResult = await res.json();

    setResult(data);
    setScanState(data.ok ? 'success' : 'error');

    clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      setScanState('idle');
      setResult(null);
      processingRef.current = false;
    }, 3000);
  }

  useEffect(() => {
    if (tab !== 'scan') return;
    let html5QrCode: any;

    async function init() {
      const { Html5Qrcode } = await import('html5-qrcode');
      html5QrCode = new Html5Qrcode('qr-reader');
      scannerRef.current = html5QrCode;
      try {
        await html5QrCode.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 220, height: 220 } },
          (text: string) => { handleCode(text); },
          () => {}
        );
      } catch {
        // Camera non disponibile — l'utente vedrà solo la tab Cerca
      }
    }

    init();

    return () => {
      if (html5QrCode) html5QrCode.stop().catch(() => {});
      clearTimeout(resetTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, selectedEventId]);

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = manualCode.trim().toUpperCase();
    if (code.length < 6 || manualLoading) return;
    setManualLoading(true);
    await handleCode(code);
    setManualLoading(false);
    setManualCode('');
  }

  return (
    <div className="min-h-screen bg-[#07080f] flex flex-col pb-safe">

      {/* Header */}
      <div className="px-4 pt-5 pb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${scanState === 'idle' ? 'bg-green-400 animate-pulse' : scanState === 'success' ? 'bg-green-400' : 'bg-red-400'}`} />
          <span className="text-white text-sm font-semibold">Scanner ingresso</span>
        </div>
        {events.length > 1 ? (
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500/40 max-w-[160px] truncate"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
        ) : (
          <span className="text-slate-400 text-xs truncate max-w-[160px]">{events[0]?.name}</span>
        )}
      </div>

      {/* Tabs */}
      <div className="mx-4 mb-4 flex bg-white/5 rounded-xl p-1 gap-1">
        {(['scan', 'search'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => { setTab(t); setScanState('idle'); setResult(null); processingRef.current = false; }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
              tab === t ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t === 'scan' ? <><Scan size={13} /> Scansiona</> : <><Search size={13} /> Codice manuale</>}
          </button>
        ))}
      </div>

      {/* Contenuto tab */}
      {tab === 'scan' ? (
        <div className="mx-4 rounded-2xl overflow-hidden relative bg-black flex-1" style={{ minHeight: 340 }}>
          {scanState !== 'idle' && (
            <div className={`absolute inset-0 z-10 pointer-events-none transition-opacity duration-150 ${
              scanState === 'success' ? 'bg-green-500/25' : 'bg-red-500/25'
            }`} />
          )}
          <div id="qr-reader" className="w-full h-full" style={{ minHeight: 340 }} />
        </div>
      ) : (
        <div className="mx-4 flex-1">
          <form onSubmit={handleManualSubmit} className="flex flex-col gap-3">
            <p className="text-slate-400 text-xs text-center mb-1">Digita il codice di 6 caratteri mostrato sul biglietto del cliente</p>
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="A7XK2M"
              maxLength={6}
              autoFocus
              className="bg-white/5 border border-white/10 rounded-xl px-4 py-5 text-3xl text-white text-center font-mono tracking-[0.3em] placeholder:text-slate-700 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/20"
            />
            <button
              type="submit"
              disabled={manualCode.length < 6 || manualLoading}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-semibold py-3.5 rounded-xl transition-colors text-sm"
            >
              {manualLoading ? 'Verifica in corso...' : 'Valida biglietto'}
            </button>
          </form>
        </div>
      )}

      {/* Result card */}
      {result && (
        <div className={`mx-4 mt-4 mb-4 rounded-2xl p-4 flex items-center gap-3 border transition-all ${
          result.ok
            ? 'bg-green-500/10 border-green-500/30'
            : 'bg-red-500/10 border-red-500/30'
        }`}>
          <div className={`w-11 h-11 rounded-full flex items-center justify-center text-xl shrink-0 font-bold ${
            result.ok ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
          }`}>
            {result.ok ? '✓' : '✗'}
          </div>
          <div className="flex-1 min-w-0">
            {result.ok ? (
              <>
                <p className="text-green-400 font-bold text-sm">Ingresso valido</p>
                <p className="text-slate-300 text-xs mt-0.5 truncate">{result.name} · {result.ticketType}</p>
              </>
            ) : result.reason === 'already_used' ? (
              <>
                <p className="text-red-400 font-bold text-sm">Biglietto già usato</p>
                <p className="text-slate-400 text-xs mt-0.5">Prima scansione alle {result.usedAt}</p>
              </>
            ) : (
              <p className="text-red-400 font-bold text-sm">Biglietto non valido</p>
            )}
          </div>
          <p className="text-slate-600 text-xs shrink-0">3s</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add components/club/TicketScanner.tsx
git commit -m "feat: componente TicketScanner con camera e codice manuale"
```

---

### Task 9: Pagina `/club/scan`

**Files:**
- Create: `mynox-dashboard/app/(club)/club/scan/page.tsx`

- [ ] **Crea la pagina server**

```typescript
import { redirect } from 'next/navigation';
import { getProfile, getStaffPermissions } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import TicketScanner from '@/components/club/TicketScanner';

export const dynamic = 'force-dynamic';

export default async function ScanPage() {
  const profile = await getProfile();
  if (!profile?.club_id) {
    return <p className="text-slate-400">Club non configurato.</p>;
  }

  const isOwner = profile.role === 'club_admin';
  let canScan = isOwner;
  if (!isOwner) {
    const perms = await getStaffPermissions(profile.id, profile.club_id);
    canScan = perms?.can_scan_tickets ?? false;
  }
  if (!canScan) redirect('/club/dashboard');

  const today = new Date().toISOString().slice(0, 10);
  const admin = createAdminClient();
  const { data: events } = await admin
    .from('events')
    .select('id, name')
    .eq('club_id', profile.club_id)
    .eq('date', today)
    .eq('is_published', true)
    .order('name');

  if (!events || events.length === 0) {
    return (
      <div className="min-h-screen bg-[#07080f] flex flex-col items-center justify-center p-8 text-center">
        <p className="text-slate-300 font-semibold mb-1">Nessuna serata in programma oggi</p>
        <p className="text-slate-500 text-sm">Pubblica un evento con la data di oggi per abilitare lo scanner.</p>
      </div>
    );
  }

  return <TicketScanner events={events} defaultEventId={events[0].id} />;
}
```

- [ ] **Commit**

```bash
git add app/(club)/club/scan/page.tsx
git commit -m "feat: pagina scanner /club/scan"
```

---

### Task 10: Edge Function — genera `entry_code`

**Files:**
- Modify: `supabase/functions/confirm-payment/index.ts` (nel progetto mobile `/Users/pietrotortelotti/Desktop/mynox/`)

- [ ] **Aggiungi la funzione `generateEntryCode` e usala nella insert**

Aggiungi questa funzione prima di `Deno.serve`:

```typescript
function generateEntryCode(): string {
  const charset = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => charset[b % charset.length]).join('');
}
```

Nel `toInsert`, aggiungi `entry_code`:

```typescript
const toInsert = Array.from({ length: quantity }, () => {
  const id = crypto.randomUUID();
  return {
    id,
    event_id: meta.event_id,
    user_id: meta.user_id,
    ticket_type_id: meta.ticket_type_id || null,
    table_id: meta.table_id || null,
    table_name: meta.table_name || null,
    qr_code: `MYNOX-TICKET-${id}`,
    drink_qr_code: includesDrink ? `MYNOX-DRINK-${id}` : null,
    drink_used: false,
    status: 'valid',
    price_paid: priceEach,
    stripe_payment_intent_id: payment_intent_id,
    entry_code: generateEntryCode(),
  };
});
```

- [ ] **Commit**

```bash
cd /Users/pietrotortelotti/Desktop/mynox
git add supabase/functions/confirm-payment/index.ts
git commit -m "feat: genera entry_code alla creazione biglietto"
```

---

### Task 11: App Mobile — mostra `entry_code` sul biglietto

**Files:**
- Modify: `app/ticket/[id].tsx` (nel progetto mobile `/Users/pietrotortelotti/Desktop/mynox/`)
- Modify: `contexts/TicketsContext.tsx`

- [ ] **Aggiungi `entry_code` al tipo ticket nel context e alla select**

In `TicketsContext.tsx`, aggiungi `entry_code` alla select e alla mappatura del biglietto. Cerca la query `.select(...)` e aggiungi `entry_code` tra i campi. Nella mappatura aggiungi:

```typescript
entryCode: t.entry_code ?? null,
```

- [ ] **Mostra il codice nella schermata biglietto**

In `app/ticket/[id].tsx`, dopo il componente QR code e prima della sezione free drink, aggiungi il blocco del codice manuale. Cerca il div che wrappa `<QRCode` e dopo la sua chiusura aggiungi:

```tsx
{ticket.entryCode && (
  <View style={styles.entryCodeBox}>
    <Text style={styles.entryCodeLabel}>Codice manuale</Text>
    <Text style={styles.entryCodeText}>{ticket.entryCode}</Text>
    <Text style={styles.entryCodeHint}>Mostralo al buttafuori se il QR non funziona</Text>
  </View>
)}
```

Aggiungi gli stili corrispondenti in `StyleSheet.create`:

```typescript
entryCodeBox: {
  marginTop: 16,
  alignItems: 'center',
  paddingVertical: 12,
  paddingHorizontal: 20,
  backgroundColor: 'rgba(168,85,247,0.08)',
  borderRadius: 12,
  borderWidth: 1,
  borderColor: 'rgba(168,85,247,0.2)',
},
entryCodeLabel: {
  fontSize: 10,
  color: Colors.textMuted,
  textTransform: 'uppercase',
  letterSpacing: 1,
  marginBottom: 4,
},
entryCodeText: {
  fontSize: 28,
  fontWeight: '700',
  color: Colors.textPrimary,
  fontFamily: 'monospace',
  letterSpacing: 6,
},
entryCodeHint: {
  fontSize: 10,
  color: Colors.textMuted,
  marginTop: 4,
  textAlign: 'center',
},
```

- [ ] **Commit**

```bash
cd /Users/pietrotortelotti/Desktop/mynox
git add app/ticket/\[id\].tsx contexts/TicketsContext.tsx
git commit -m "feat: mostra entry_code sul biglietto nell'app mobile"
```
