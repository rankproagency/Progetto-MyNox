# Dashboard B2B — Piano 1: Foundation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Creare il progetto Next.js `mynox-dashboard` con autenticazione Supabase, middleware di protezione route, layout sidebar per admin e club, e la migration del database.

**Architecture:** Progetto Next.js 15 separato in `/Users/pietrotortelotti/Desktop/mynox-dashboard/`. Si connette allo stesso Supabase del progetto mobile. Usa App Router con route groups `(auth)`, `(admin)`, `(club)`. Middleware protegge le route in base al ruolo dell'utente letto da `profiles.role`.

**Tech Stack:** Next.js 15, TypeScript strict, Tailwind CSS, shadcn/ui, Supabase JS v2, Zod

---

## Mappa File

| File | Responsabilità |
|------|---------------|
| `app/layout.tsx` | Root layout, font Inter, theme dark |
| `app/(auth)/login/page.tsx` | Pagina login con form email/password |
| `app/(admin)/layout.tsx` | Layout admin con AdminSidebar |
| `app/(admin)/dashboard/page.tsx` | Placeholder dashboard admin |
| `app/(club)/layout.tsx` | Layout club con ClubSidebar |
| `app/(club)/dashboard/page.tsx` | Placeholder dashboard club |
| `components/layout/AdminSidebar.tsx` | Sidebar navigazione admin |
| `components/layout/ClubSidebar.tsx` | Sidebar navigazione club |
| `components/ui/` | Componenti shadcn installati |
| `lib/supabase/client.ts` | Client Supabase browser |
| `lib/supabase/server.ts` | Client Supabase server (SSR) |
| `lib/auth.ts` | Helper: getProfile, getRoleRedirect |
| `middleware.ts` | Protezione route per ruolo |
| `types/index.ts` | Tipi dominio condivisi |
| `supabase/migration_roles.sql` | Migration: aggiunge role e club_id a profiles |

---

## Task 1: Inizializza progetto Next.js

**Files:**
- Create: `/Users/pietrotortelotti/Desktop/mynox-dashboard/` (nuovo progetto)

- [ ] **Crea il progetto**

```bash
cd /Users/pietrotortelotti/Desktop
npx create-next-app@latest mynox-dashboard \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*"
cd mynox-dashboard
```

- [ ] **Installa dipendenze**

```bash
npm install @supabase/supabase-js @supabase/ssr zod
npm install recharts
npm install -D @types/node
```

- [ ] **Installa shadcn/ui**

```bash
npx shadcn@latest init
```

Quando chiede, scegli:
- Style: `Default`
- Base color: `Neutral`
- CSS variables: `yes`

- [ ] **Installa componenti shadcn necessari**

```bash
npx shadcn@latest add button input label card table badge separator avatar dropdown-menu dialog form toast
```

- [ ] **Verifica che il progetto parta**

```bash
npm run dev
```

Apri `http://localhost:3000` — deve mostrare la pagina default di Next.js.

- [ ] **Commit**

```bash
git init
git add .
git commit -m "chore: init Next.js 15 project with shadcn/ui"
```

---

## Task 2: Configura tema dark MyNox

**Files:**
- Modify: `app/globals.css`
- Modify: `tailwind.config.ts`

- [ ] **Sostituisci `app/globals.css`**

```css
@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

:root {
  --background: #0a0a0f;
  --foreground: #f1f5f9;
  --card: #111118;
  --card-foreground: #f1f5f9;
  --popover: #111118;
  --popover-foreground: #f1f5f9;
  --primary: #a855f7;
  --primary-foreground: #ffffff;
  --secondary: #1a1a24;
  --secondary-foreground: #f1f5f9;
  --muted: #1a1a24;
  --muted-foreground: #94a3b8;
  --accent: #a855f7;
  --accent-foreground: #ffffff;
  --destructive: #ef4444;
  --destructive-foreground: #ffffff;
  --border: rgba(255,255,255,0.08);
  --input: #1a1a24;
  --ring: #a855f7;
  --radius: 0.625rem;
  --success: #22c55e;
}

* {
  border-color: var(--border);
  box-sizing: border-box;
}

body {
  background-color: var(--background);
  color: var(--foreground);
  font-family: 'Inter', sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* Scrollbar dark */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: var(--background); }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); border-radius: 3px; }
```

- [ ] **Aggiorna `app/layout.tsx`** per forzare dark mode e caricare Inter:

```tsx
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'MyNox Dashboard',
  description: 'Pannello gestione MyNox',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="it" className="dark">
      <body className={inter.className}>
        {children}
      </body>
    </html>
  );
}
```

- [ ] **Verifica tema**

```bash
npm run dev
```

Lo sfondo deve essere `#0a0a0f` — quasi nero con tinta viola.

- [ ] **Commit**

```bash
git add -A
git commit -m "chore: configura tema dark MyNox"
```

---

## Task 3: Tipi dominio e variabili d'ambiente

**Files:**
- Create: `types/index.ts`
- Create: `.env.local`

- [ ] **Crea `.env.local`** con le credenziali Supabase (stesse dell'app mobile):

```
NEXT_PUBLIC_SUPABASE_URL=https://xsprvlayjncbxhhhifnn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzcHJ2bGF5am5jYnhoaGhpZm5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMTAyMjIsImV4cCI6MjA5MTU4NjIyMn0.jhOvoBVj7Y_e3dOjtx9rCQiEGnv6H-1bXiDAksSgv_A
```

- [ ] **Crea `types/index.ts`**

```typescript
export type Role = 'admin' | 'club_admin' | 'customer';

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: Role;
  club_id: string | null;
  member_since: string;
}

export interface Club {
  id: string;
  name: string;
  city: string;
  address: string | null;
  image_url: string | null;
  instagram: string | null;
  tiktok: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
}

export interface TicketType {
  id: string;
  event_id: string;
  label: string;
  price: number;
  includes_drink: boolean;
  total_quantity: number | null;
  sold_quantity: number;
}

export interface Table {
  id: string;
  event_id: string;
  label: string;
  capacity: number;
  deposit: number;
  is_available: boolean;
}

export interface LineupArtist {
  name: string;
  time: string;
}

export interface Event {
  id: string;
  club_id: string;
  club?: Club;
  name: string;
  description: string | null;
  date: string;
  start_time: string;
  end_time: string | null;
  image_url: string | null;
  genres: string[];
  dress_code: string | null;
  capacity: number;
  tickets_sold: number;
  lineup: LineupArtist[];
  is_published: boolean;
  ticket_types?: TicketType[];
  tables?: Table[];
  created_at: string;
}

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
  status: 'valid' | 'used' | 'denied' | 'pending';
  drink_used: boolean;
  created_at: string;
}
```

- [ ] **Aggiungi `.env.local` a `.gitignore`**

Apri `.gitignore` e verifica che contenga `.env.local`. Se non c'è, aggiungilo.

- [ ] **Commit**

```bash
git add types/ .gitignore
git commit -m "feat: tipi dominio e configurazione env"
```

---

## Task 4: Client Supabase

**Files:**
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`

- [ ] **Crea `lib/supabase/client.ts`** (usato nei Client Components):

```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

- [ ] **Crea `lib/supabase/server.ts`** (usato nei Server Components e middleware):

```typescript
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Ignorato in Server Components read-only
          }
        },
      },
    }
  );
}
```

- [ ] **Crea `lib/auth.ts`** (helper per ruoli):

```typescript
import { createClient } from '@/lib/supabase/server';
import type { Profile, Role } from '@/types';

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return data as Profile | null;
}

export function getRoleRedirect(role: Role): string {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'club_admin') return '/club/dashboard';
  return '/login?error=unauthorized';
}
```

- [ ] **Commit**

```bash
git add lib/
git commit -m "feat: client Supabase browser e server"
```

---

## Task 5: Migration database — ruoli

**Files:**
- Create: `supabase/migration_roles.sql`

- [ ] **Crea `supabase/migration_roles.sql`**

```sql
-- Aggiunge ruolo e club_id alla tabella profiles
alter table public.profiles
  add column if not exists role text not null default 'customer'
    check (role in ('customer', 'club_admin', 'admin')),
  add column if not exists club_id uuid references public.clubs(id);

-- RLS: club_admin può inserire eventi nel proprio club
create policy "club_admin inserisce eventi del proprio club"
  on public.events for insert
  with check (
    club_id = (
      select club_id from public.profiles
      where id = auth.uid() and role = 'club_admin'
    )
  );

-- RLS: club_admin può aggiornare eventi del proprio club
create policy "club_admin aggiorna eventi del proprio club"
  on public.events for update
  using (
    club_id = (
      select club_id from public.profiles
      where id = auth.uid() and role = 'club_admin'
    )
  );

-- RLS: club_admin può inserire ticket_types per i propri eventi
create policy "club_admin gestisce ticket_types"
  on public.ticket_types for all
  using (
    event_id in (
      select id from public.events
      where club_id = (
        select club_id from public.profiles
        where id = auth.uid() and role = 'club_admin'
      )
    )
  );

-- RLS: club_admin può gestire tavoli per i propri eventi
create policy "club_admin gestisce tables"
  on public.tables for all
  using (
    event_id in (
      select id from public.events
      where club_id = (
        select club_id from public.profiles
        where id = auth.uid() and role = 'club_admin'
      )
    )
  );
```

- [ ] **Esegui la migration su Supabase**

Vai su `supabase.com → progetto → SQL Editor`, incolla il contenuto di `migration_roles.sql` ed esegui.

- [ ] **Imposta il tuo account come admin**

Nel SQL Editor di Supabase, esegui (sostituendo con la tua email):

```sql
update public.profiles
set role = 'admin'
where email = 'TUA_EMAIL@esempio.com';
```

- [ ] **Commit**

```bash
git add supabase/
git commit -m "feat: migration ruoli e RLS policies per club_admin"
```

---

## Task 6: Middleware protezione route

**Files:**
- Create: `middleware.ts`

- [ ] **Crea `middleware.ts`**

```typescript
import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  const pathname = request.nextUrl.pathname;

  // Non autenticato → login
  if (!user && (pathname.startsWith('/admin') || pathname.startsWith('/club'))) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user) {
    // Redirect da / e /login al pannello corretto
    if (pathname === '/' || pathname === '/login') {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      const role = profile?.role;
      if (role === 'admin') return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      if (role === 'club_admin') return NextResponse.redirect(new URL('/club/dashboard', request.url));
      // customer → unauthorized
      return NextResponse.redirect(new URL('/login?error=unauthorized', request.url));
    }

    // club_admin non può accedere ad /admin/*
    if (pathname.startsWith('/admin')) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      if (profile?.role !== 'admin') {
        return NextResponse.redirect(new URL('/club/dashboard', request.url));
      }
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/', '/login', '/admin/:path*', '/club/:path*'],
};
```

- [ ] **Commit**

```bash
git add middleware.ts
git commit -m "feat: middleware protezione route per ruolo"
```

---

## Task 7: Pagina Login

**Files:**
- Create: `app/(auth)/login/page.tsx`
- Create: `app/(auth)/layout.tsx`

- [ ] **Crea `app/(auth)/layout.tsx`**

```tsx
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0f]">
      {children}
    </div>
  );
}
```

- [ ] **Crea `app/(auth)/login/page.tsx`**

```tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError('Email o password non corretti.');
      setLoading(false);
      return;
    }

    // Il middleware gestisce il redirect in base al ruolo
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm bg-[#111118] border-white/8">
      <CardHeader className="text-center pb-6">
        <div className="text-2xl font-black tracking-widest text-white mb-1">MYNOX</div>
        <CardTitle className="text-lg font-semibold text-white">Dashboard</CardTitle>
        <CardDescription className="text-slate-400">
          Accedi con il tuo account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-300 text-sm">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@esempio.com"
              required
              className="bg-[#1a1a24] border-white/8 text-white placeholder:text-slate-500 focus:border-purple-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password" className="text-slate-300 text-sm">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              className="bg-[#1a1a24] border-white/8 text-white placeholder:text-slate-500 focus:border-purple-500"
            />
          </div>
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold"
          >
            {loading ? 'Accesso...' : 'Accedi'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
```

- [ ] **Verifica che la pagina login funzioni**

```bash
npm run dev
```

Vai su `http://localhost:3000/login` — deve mostrare il form di login dark.

- [ ] **Commit**

```bash
git add app/
git commit -m "feat: pagina login con redirect per ruolo"
```

---

## Task 8: Componente AdminSidebar

**Files:**
- Create: `components/layout/AdminSidebar.tsx`

- [ ] **Crea `components/layout/AdminSidebar.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  LayoutDashboard,
  Building2,
  CalendarDays,
  Users,
  LogOut,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/clubs', label: 'Discoteche', icon: Building2 },
  { href: '/admin/events', label: 'Eventi', icon: CalendarDays },
  { href: '/admin/users', label: 'Utenti', icon: Users },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-[#111118] border-r border-white/8 flex flex-col z-40">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-white/8">
        <div className="text-xl font-black tracking-widest text-white">MYNOX</div>
        <div className="text-xs text-slate-500 mt-0.5 uppercase tracking-wider">Admin</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/8">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-400/5 w-full transition-colors"
        >
          <LogOut size={16} />
          Esci
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Installa lucide-react** (icone):

```bash
npm install lucide-react
```

- [ ] **Commit**

```bash
git add components/ package.json package-lock.json
git commit -m "feat: AdminSidebar con navigazione e logout"
```

---

## Task 9: Componente ClubSidebar

**Files:**
- Create: `components/layout/ClubSidebar.tsx`

- [ ] **Crea `components/layout/ClubSidebar.tsx`**

```tsx
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  LayoutDashboard,
  CalendarDays,
  BarChart3,
  LogOut,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/club/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/club/events', label: 'I miei eventi', icon: CalendarDays },
  { href: '/club/analytics', label: 'Analytics', icon: BarChart3 },
];

interface ClubSidebarProps {
  clubName: string;
}

export default function ClubSidebar({ clubName }: ClubSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-[#111118] border-r border-white/8 flex flex-col z-40">
      {/* Logo + nome club */}
      <div className="px-6 py-5 border-b border-white/8">
        <div className="text-xl font-black tracking-widest text-white">MYNOX</div>
        <div className="text-xs text-slate-400 mt-1 font-medium truncate">{clubName}</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/8">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-400/5 w-full transition-colors"
        >
          <LogOut size={16} />
          Esci
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Commit**

```bash
git add components/layout/ClubSidebar.tsx
git commit -m "feat: ClubSidebar con nome discoteca e navigazione"
```

---

## Task 10: Layout Admin + pagina dashboard placeholder

**Files:**
- Create: `app/(admin)/layout.tsx`
- Create: `app/(admin)/dashboard/page.tsx`

- [ ] **Crea `app/(admin)/layout.tsx`**

```tsx
import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import AdminSidebar from '@/components/layout/AdminSidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();

  if (!profile || profile.role !== 'admin') {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      <AdminSidebar />
      <main className="ml-56 flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Crea `app/(admin)/dashboard/page.tsx`** (placeholder funzionante):

```tsx
export default function AdminDashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Dashboard</h1>
      <p className="text-slate-400">Benvenuto nel pannello admin MyNox.</p>
    </div>
  );
}
```

- [ ] **Verifica che il flusso auth → admin funzioni**

```bash
npm run dev
```

1. Vai su `http://localhost:3000/login`
2. Accedi con la tua email (quella che hai impostato come admin nel Task 5)
3. Devi essere reindirizzato a `/admin/dashboard`
4. La sidebar deve essere visibile a sinistra

- [ ] **Commit**

```bash
git add app/
git commit -m "feat: layout admin con sidebar e protezione ruolo"
```

---

## Task 11: Layout Club + pagina dashboard placeholder

**Files:**
- Create: `app/(club)/layout.tsx`
- Create: `app/(club)/dashboard/page.tsx`

- [ ] **Crea `app/(club)/layout.tsx`**

```tsx
import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import ClubSidebar from '@/components/layout/ClubSidebar';
import { createClient } from '@/lib/supabase/server';

export default async function ClubLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();

  if (!profile || profile.role !== 'club_admin') {
    redirect('/login');
  }

  const supabase = await createClient();
  const { data: club } = await supabase
    .from('clubs')
    .select('name')
    .eq('id', profile.club_id!)
    .single();

  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      <ClubSidebar clubName={club?.name ?? 'La tua discoteca'} />
      <main className="ml-56 flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
```

- [ ] **Crea `app/(club)/dashboard/page.tsx`** (placeholder):

```tsx
export default function ClubDashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-2">Dashboard</h1>
      <p className="text-slate-400">Benvenuto nel pannello discoteca MyNox.</p>
    </div>
  );
}
```

- [ ] **Commit**

```bash
git add app/
git commit -m "feat: layout club con sidebar e protezione ruolo"
```

---

## Task 12: Push su GitHub e verifica finale

- [ ] **Crea repository su GitHub**

Vai su `github.com` → New repository → nome: `mynox-dashboard` → Private → Create.

- [ ] **Collega e pusha**

```bash
git remote add origin https://github.com/rankproagency/mynox-dashboard.git
git branch -M main
git push -u origin main
```

- [ ] **Verifica type check**

```bash
npx tsc --noEmit
```

Deve completare senza errori.

- [ ] **Test finale del flusso completo**

1. `npm run dev`
2. `http://localhost:3000` → redirect a `/login`
3. Login con account admin → redirect a `/admin/dashboard` con sidebar
4. Logout → redirect a `/login`
5. Prova a navigare a `/admin/dashboard` senza login → redirect a `/login`

---

## Risultato Atteso

Al termine di questo piano:
- Progetto Next.js 15 funzionante con tema dark MyNox
- Login → redirect automatico al pannello corretto per ruolo
- `/admin/dashboard` protetto e accessibile solo agli admin
- `/club/dashboard` protetto e accessibile solo ai club_admin
- Sidebar navigazione per entrambi i ruoli
- Database con colonna `role` su `profiles`
- Repository su GitHub pronto per il Piano 2 (Admin Panel)
