import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Building2, Users, CalendarDays, ChevronRight, Ticket, Clock } from 'lucide-react';

async function getDashboardData() {
  const supabase = await createClient();
  const since7Days = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const today = new Date().toISOString().slice(0, 10);

  const [
    { data: recentUsers },
    { data: recentClubs },
    { data: recentTickets },
    { data: upcomingEvents },
    { count: totalUsers },
    { count: totalClubs },
    { count: totalTickets },
  ] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, created_at, role')
      .eq('role', 'customer')
      .gte('created_at', since7Days)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase
      .from('clubs')
      .select('id, name, city, created_at')
      .order('created_at', { ascending: false })
      .limit(4),
    supabase
      .from('tickets')
      .select('id, created_at, ticket_types(label, price), events(name, clubs(name))')
      .in('status', ['valid', 'used'])
      .order('created_at', { ascending: false })
      .limit(6),
    supabase
      .from('events')
      .select('id, name, date, start_time, tickets_sold, capacity, clubs(name), is_published')
      .gte('date', today)
      .eq('is_published', true)
      .order('date', { ascending: true })
      .limit(5),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
    supabase.from('clubs').select('*', { count: 'exact', head: true }),
    supabase.from('tickets').select('*', { count: 'exact', head: true }).in('status', ['valid', 'used']),
  ]);

  return {
    recentUsers: recentUsers ?? [],
    recentClubs: recentClubs ?? [],
    recentTickets: recentTickets ?? [],
    upcomingEvents: upcomingEvents ?? [],
    totalUsers: totalUsers ?? 0,
    totalClubs: totalClubs ?? 0,
    totalTickets: totalTickets ?? 0,
  };
}

export default async function AdminDashboardPage() {
  const data = await getDashboardData();

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? 'Buongiorno' :
    now.getHours() < 18 ? 'Buon pomeriggio' : 'Buonasera';

  return (
    <div>
      <div className="mb-8">
        <p className="text-slate-400 text-sm mb-1">{greeting}</p>
        <h1 className="text-2xl font-bold text-white">Panoramica MyNox</h1>
      </div>

      {/* KPI rapidi */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <Link href="/admin/users" className="bg-[#111118] border border-white/8 hover:border-purple-500/30 rounded-xl px-5 py-4 transition-colors group">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Utenti registrati</p>
            <Users size={14} className="text-slate-600 group-hover:text-purple-400 transition-colors" />
          </div>
          <p className="text-2xl font-bold text-white">{data.totalUsers.toLocaleString('it-IT')}</p>
          <p className="text-xs text-slate-500 mt-1">{data.recentUsers.length} nuovi questa settimana</p>
        </Link>
        <Link href="/admin/clubs" className="bg-[#111118] border border-white/8 hover:border-purple-500/30 rounded-xl px-5 py-4 transition-colors group">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Discoteche</p>
            <Building2 size={14} className="text-slate-600 group-hover:text-purple-400 transition-colors" />
          </div>
          <p className="text-2xl font-bold text-white">{data.totalClubs.toLocaleString('it-IT')}</p>
          <p className="text-xs text-slate-500 mt-1">Sulla piattaforma</p>
        </Link>
        <Link href="/admin/analytics" className="bg-[#111118] border border-white/8 hover:border-purple-500/30 rounded-xl px-5 py-4 transition-colors group">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-400 uppercase tracking-wider">Biglietti venduti</p>
            <Ticket size={14} className="text-slate-600 group-hover:text-purple-400 transition-colors" />
          </div>
          <p className="text-2xl font-bold text-white">{data.totalTickets.toLocaleString('it-IT')}</p>
          <p className="text-xs text-slate-500 mt-1">Vedi analytics →</p>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        {/* Nuovi utenti questa settimana */}
        <div className="bg-[#111118] border border-white/8 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Nuovi utenti — 7 giorni</h2>
            <Link href="/admin/users" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
              Tutti <ChevronRight size={12} />
            </Link>
          </div>
          {data.recentUsers.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-500 text-sm">Nessun nuovo utente.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {data.recentUsers.map((u: any) => (
                <div key={u.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-purple-500/20 border border-purple-500/30 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-purple-400">
                        {(u.full_name || u.email || '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm text-white font-medium">{u.full_name || '—'}</p>
                      <p className="text-xs text-slate-500">{u.email}</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 shrink-0">
                    {new Date(u.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ultimi biglietti venduti */}
        <div className="bg-[#111118] border border-white/8 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Ultimi biglietti venduti</h2>
            <Link href="/admin/analytics" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
              Analytics <ChevronRight size={12} />
            </Link>
          </div>
          {data.recentTickets.length === 0 ? (
            <div className="px-5 py-10 text-center text-slate-500 text-sm">Nessun biglietto ancora.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {data.recentTickets.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white font-medium truncate">{(t.events as any)?.name ?? '—'}</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {(t.events as any)?.clubs?.name ?? '—'} · {t.ticket_types?.label ?? '—'}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-sm font-semibold text-purple-400">€{Number(t.ticket_types?.price ?? 0).toFixed(2)}</p>
                    <p className="text-xs text-slate-500">
                      {new Date(t.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Prossimi eventi in piattaforma */}
      <div className="bg-[#111118] border border-white/8 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white">Prossimi eventi in piattaforma</h2>
          <Link href="/admin/events" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
            Vedi tutti <ChevronRight size={12} />
          </Link>
        </div>
        {data.upcomingEvents.length === 0 ? (
          <div className="px-5 py-10 text-center text-slate-500 text-sm">Nessun evento in programma.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8">
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Evento</th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Discoteca</th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Data</th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Orario</th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Biglietti</th>
              </tr>
            </thead>
            <tbody>
              {data.upcomingEvents.map((ev: any) => (
                <tr key={ev.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="px-5 py-4 text-white font-medium">{ev.name}</td>
                  <td className="px-5 py-4 text-slate-300">{ev.clubs?.name ?? '—'}</td>
                  <td className="px-5 py-4 text-slate-300">{new Date(ev.date).toLocaleDateString('it-IT')}</td>
                  <td className="px-5 py-4 text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <Clock size={11} />
                      {ev.start_time}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-300">
                    {ev.tickets_sold ?? 0}{ev.capacity ? ` / ${ev.capacity}` : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
