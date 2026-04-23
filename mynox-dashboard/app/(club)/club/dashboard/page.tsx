import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import Link from 'next/link';
import { CalendarDays, Ticket, Plus, Settings, ChevronRight, Clock } from 'lucide-react';

async function getDashboardData(clubId: string) {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  // Prima prendo gli event_id del club per filtrare i biglietti correttamente
  const { data: clubEventIds } = await supabase
    .from('events')
    .select('id')
    .eq('club_id', clubId);

  const eventIds = (clubEventIds ?? []).map((e) => e.id);

  const [{ data: upcomingEvents }, { data: recentTickets }, { data: club }] = await Promise.all([
    supabase
      .from('events')
      .select('id, name, date, start_time, capacity, is_published, ticket_types(total_quantity, sold_quantity)')
      .eq('club_id', clubId)
      .gte('date', today)
      .lte('date', in7Days)
      .order('date', { ascending: true }),
    eventIds.length > 0
      ? supabase
          .from('tickets')
          .select('id, created_at, status, table_name, price_paid, ticket_types(label, price), events(name)')
          .in('event_id', eventIds)
          .in('status', ['valid', 'used'])
          .order('created_at', { ascending: false })
          .limit(6)
      : Promise.resolve({ data: [] }),
    supabase
      .from('clubs')
      .select('name')
      .eq('id', clubId)
      .single(),
  ]);

  return {
    clubName: club?.name ?? '',
    upcomingEvents: upcomingEvents ?? [],
    recentTickets: recentTickets ?? [],
  };
}

export default async function ClubDashboardPage() {
  const profile = await getProfile();
  if (!profile?.club_id) return <p className="text-slate-400">Club non configurato. Contatta l&apos;amministratore.</p>;

  const { clubName, upcomingEvents, recentTickets } = await getDashboardData(profile.club_id);

  const now = new Date();
  const greeting =
    now.getHours() < 12 ? 'Buongiorno' :
    now.getHours() < 18 ? 'Buon pomeriggio' : 'Buonasera';

  return (
    <div>
      {/* Intestazione */}
      <div className="mb-8">
        <p className="text-slate-400 text-sm mb-1">{greeting}</p>
        <h1 className="text-2xl font-bold text-white">{clubName}</h1>
      </div>

      {/* Azioni rapide */}
      <div className="grid grid-cols-3 gap-3 mb-10">
        <Link href="/club/events/new"
          className="flex items-center gap-3 bg-purple-600 hover:bg-purple-500 rounded-xl px-4 py-3.5 transition-colors group">
          <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
            <Plus size={16} className="text-white" />
          </div>
          <span className="text-sm font-semibold text-white">Nuovo evento</span>
        </Link>
        <Link href="/club/events"
          className="flex items-center gap-3 bg-[#111118] hover:bg-white/5 border border-white/8 rounded-xl px-4 py-3.5 transition-colors">
          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
            <CalendarDays size={16} className="text-slate-400" />
          </div>
          <span className="text-sm font-medium text-slate-300">I miei eventi</span>
        </Link>
        <Link href="/club/settings"
          className="flex items-center gap-3 bg-[#111118] hover:bg-white/5 border border-white/8 rounded-xl px-4 py-3.5 transition-colors">
          <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
            <Settings size={16} className="text-slate-400" />
          </div>
          <span className="text-sm font-medium text-slate-300">Profilo club</span>
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-6">
        {/* Prossimi 7 giorni */}
        <div className="bg-[#111118] border border-white/8 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Prossimi 7 giorni</h2>
            <Link href="/club/events" className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 transition-colors">
              Vedi tutti <ChevronRight size={12} />
            </Link>
          </div>

          {upcomingEvents.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <CalendarDays size={32} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Nessun evento nei prossimi 7 giorni</p>
              <Link href="/club/events/new" className="inline-flex items-center gap-1.5 mt-3 text-xs text-purple-400 hover:text-purple-300 transition-colors">
                <Plus size={12} /> Crea un evento
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {upcomingEvents.map((event: any) => {
                const totalQty = (event.ticket_types ?? []).reduce((s: number, t: any) => s + (t.total_quantity ?? 0), 0);
                const soldQty = (event.ticket_types ?? []).reduce((s: number, t: any) => s + (t.sold_quantity ?? 0), 0);
                const remaining = totalQty > 0 ? totalQty - soldQty : null;
                const fillPct = totalQty > 0 ? Math.round((soldQty / totalQty) * 100) : 0;

                return (
                  <Link key={event.id} href={`/club/events/${event.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-white/3 transition-colors group">
                    <div className="text-center shrink-0 w-10">
                      <p className="text-xs text-slate-500 uppercase">
                        {new Date(event.date).toLocaleDateString('it-IT', { weekday: 'short' })}
                      </p>
                      <p className="text-lg font-bold text-white leading-none">
                        {new Date(event.date).getDate()}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{event.name}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock size={10} className="text-slate-500 shrink-0" />
                        <span className="text-xs text-slate-500">{event.start_time}</span>
                        {!event.is_published && (
                          <span className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 px-1.5 py-0.5 rounded-full">
                            Bozza
                          </span>
                        )}
                      </div>
                      {remaining !== null && (
                        <div className="mt-2">
                          <div className="flex justify-between text-xs text-slate-500 mb-1">
                            <span>{soldQty} venduti</span>
                            <span>{remaining} rimasti</span>
                          </div>
                          <div className="h-1 bg-white/8 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded-full transition-all"
                              style={{ width: `${fillPct}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                    <ChevronRight size={14} className="text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Biglietti recenti */}
        <div className="bg-[#111118] border border-white/8 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-white/8 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-white">Ultimi biglietti venduti</h2>
            <Ticket size={14} className="text-slate-500" />
          </div>

          {recentTickets.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <Ticket size={32} className="text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Nessun biglietto venduto ancora</p>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {recentTickets.map((ticket: any) => (
                <div key={ticket.id} className="flex items-center justify-between px-5 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white font-medium truncate">{ticket.events?.name ?? '—'}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{ticket.ticket_types?.label ?? (ticket.table_name ? `Tavolo – ${ticket.table_name}` : '—')}</p>
                  </div>
                  <div className="text-right shrink-0 ml-4">
                    <p className="text-sm font-semibold text-purple-400">
                      €{Number(ticket.ticket_types?.price ?? ticket.price_paid ?? 0).toFixed(2)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {new Date(ticket.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
