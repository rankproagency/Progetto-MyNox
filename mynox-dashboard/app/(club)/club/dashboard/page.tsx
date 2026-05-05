import { createAdminClient } from '@/lib/supabase/admin';
import { getProfile } from '@/lib/auth';

export const dynamic = 'force-dynamic';
import Link from 'next/link';
import { CalendarDays, Ticket, Plus, Settings, ChevronRight, Clock, BarChart2, CheckCircle2, Circle } from 'lucide-react';
import RealtimeSalesChart, { type HourlyBucket } from '@/components/club/RealtimeSalesChart';

const pad = (n: number) => String(n).padStart(2, '0');

function getLast12HourBuckets(): HourlyBucket[] {
  const now = new Date();
  const buckets: HourlyBucket[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now);
    d.setHours(d.getHours() - i, 0, 0, 0);
    const isoKey =
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-` +
      `${pad(d.getDate())}T${pad(d.getHours())}:00`;
    const label = `${pad(d.getHours())}:00`;
    buckets.push({ label, isoKey, count: 0, revenue: 0 });
  }
  return buckets;
}

async function getDashboardData(clubId: string) {
  const supabase = createAdminClient();
  const today = new Date().toISOString().slice(0, 10);
  const in7Days = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data: clubData } = await supabase
    .from('clubs')
    .select('image_url, name, city, address')
    .eq('id', clubId)
    .single();

  const { data: publishedEvent } = await supabase
    .from('events')
    .select('id')
    .eq('club_id', clubId)
    .eq('is_published', true)
    .limit(1)
    .maybeSingle();

  const { data: clubEventIds } = await supabase
    .from('events')
    .select('id')
    .eq('club_id', clubId);

  const eventIds = (clubEventIds ?? []).map((e) => e.id);

  // Prendo prima gli eventi prossimi (senza ticket_types join)
  const { data: upcomingEventsRaw } = await supabase
    .from('events')
    .select('id, name, date, start_time, capacity, is_published')
    .eq('club_id', clubId)
    .gte('date', today)
    .lte('date', in7Days)
    .order('date', { ascending: true });

  const upcomingEventIds = (upcomingEventsRaw ?? []).map((e) => e.id);

  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [{ data: recentTickets }, { data: club }, { data: soldTicketRows }, { data: totalQtyRows }, { data: realtimeTicketRows }] = await Promise.all([
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
    upcomingEventIds.length > 0
      ? supabase
          .from('tickets')
          .select('event_id')
          .in('event_id', upcomingEventIds)
          .in('status', ['valid', 'used'])
      : Promise.resolve({ data: [] }),
    upcomingEventIds.length > 0
      ? supabase
          .from('ticket_types')
          .select('event_id, total_quantity')
          .in('event_id', upcomingEventIds)
      : Promise.resolve({ data: [] }),
    eventIds.length > 0
      ? supabase
          .from('tickets')
          .select('created_at, price_paid, ticket_types(price)')
          .in('event_id', eventIds)
          .in('status', ['valid', 'used'])
          .gte('created_at', twentyFourHoursAgo)
          .order('created_at', { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  // Conta biglietti venduti reali per evento
  const soldByEvent: Record<string, number> = {};
  (soldTicketRows ?? []).forEach((t: any) => {
    soldByEvent[t.event_id] = (soldByEvent[t.event_id] ?? 0) + 1;
  });

  // Somma posti totali per evento (da ticket_types)
  const totalQtyByEvent: Record<string, number> = {};
  (totalQtyRows ?? []).forEach((t: any) => {
    totalQtyByEvent[t.event_id] = (totalQtyByEvent[t.event_id] ?? 0) + (t.total_quantity ?? 0);
  });

  const upcomingEvents = (upcomingEventsRaw ?? []).map((e) => ({
    ...e,
    soldQty: soldByEvent[e.id] ?? 0,
    totalQty: totalQtyByEvent[e.id] ?? 0,
  }));

  const checklist = {
    hasImage: !!clubData?.image_url,
    hasPublishedEvent: !!publishedEvent,
  };

  const initialBuckets = getLast12HourBuckets();
  (realtimeTicketRows ?? []).forEach((t: any) => {
    const d = new Date(t.created_at);
    const isoKey =
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-` +
      `${pad(d.getDate())}T${pad(d.getHours())}:00`;
    const bucket = initialBuckets.find((b) => b.isoKey === isoKey);
    if (bucket) {
      bucket.count++;
      bucket.revenue += t.ticket_types?.price ?? (t.price_paid ?? 0) / 1.08;
    }
  });

  return {
    clubName: club?.name ?? '',
    upcomingEvents,
    recentTickets: recentTickets ?? [],
    checklist,
    initialBuckets,
    eventIds,
  };
}

export default async function ClubDashboardPage() {
  const profile = await getProfile();
  if (!profile?.club_id) return <p className="text-slate-400">Club non configurato. Contatta l&apos;amministratore.</p>;

  const isOwner = profile.role === 'club_admin';
  let permissions = { can_manage_events: true, can_manage_tables: true, can_view_analytics: true, can_view_participants: true };
  if (!isOwner) {
    const { getStaffPermissions } = await import('@/lib/auth');
    const p = await getStaffPermissions(profile.id, profile.club_id);
    if (p) permissions = p;
    else permissions = { can_manage_events: false, can_manage_tables: false, can_view_analytics: false, can_view_participants: false };
  }

  const canViewRevenue = isOwner || permissions.can_view_analytics;

  const { clubName, upcomingEvents, recentTickets, checklist, initialBuckets, eventIds } = await getDashboardData(profile.club_id);
  const isProfileComplete = checklist.hasImage && checklist.hasPublishedEvent;

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

      {/* Checklist setup — visibile solo se incompleto */}
      {!isProfileComplete && (
        <div className="mb-8 bg-amber-500/5 border border-amber-500/20 rounded-xl px-5 py-4">
          <p className="text-sm font-semibold text-amber-400 mb-3">Completa il tuo profilo per essere visibile sull&apos;app</p>
          <div className="space-y-2">
            <CheckItem done={checklist.hasImage} label="Carica un'immagine copertina" href="/club/settings" />
            <CheckItem done={checklist.hasPublishedEvent} label="Pubblica il tuo primo evento" href="/club/events/new" />
          </div>
        </div>
      )}

      {/* Azioni rapide */}
      <div className="grid grid-cols-4 gap-3 mb-10">
        {permissions.can_manage_events && (
          <Link href="/club/events/new"
            className="flex items-center gap-3 bg-purple-600 hover:bg-purple-500 rounded-xl px-4 py-3.5 transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
              <Plus size={16} className="text-white" />
            </div>
            <span className="text-sm font-semibold text-white">Nuovo evento</span>
          </Link>
        )}
        {permissions.can_manage_events && (
          <Link href="/club/events"
            className="flex items-center gap-3 bg-[#111118] hover:bg-white/5 border border-white/8 rounded-xl px-4 py-3.5 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
              <CalendarDays size={16} className="text-slate-400" />
            </div>
            <span className="text-sm font-medium text-slate-300">I miei eventi</span>
          </Link>
        )}
        {permissions.can_view_analytics && (
          <Link href="/club/analytics"
            className="flex items-center gap-3 bg-[#111118] hover:bg-white/5 border border-white/8 rounded-xl px-4 py-3.5 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
              <BarChart2 size={16} className="text-slate-400" />
            </div>
            <span className="text-sm font-medium text-slate-300">Analytics</span>
          </Link>
        )}
        {isOwner && (
          <Link href="/club/settings"
            className="flex items-center gap-3 bg-[#111118] hover:bg-white/5 border border-white/8 rounded-xl px-4 py-3.5 transition-colors">
            <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
              <Settings size={16} className="text-slate-400" />
            </div>
            <span className="text-sm font-medium text-slate-300">Profilo club</span>
          </Link>
        )}
      </div>

      {/* Grafico vendite in tempo reale */}
      <div className="mb-6">
        <RealtimeSalesChart eventIds={eventIds} initialBuckets={initialBuckets} showRevenue={canViewRevenue} />
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
                const { soldQty, totalQty } = event;
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
                    {canViewRevenue && (
                      <p className="text-sm font-semibold text-purple-400">
                        €{Number(ticket.ticket_types?.price ?? (ticket.price_paid ?? 0) / 1.08).toFixed(2)}
                      </p>
                    )}
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

function CheckItem({ done, label, href }: { done: boolean; label: string; href: string }) {
  return (
    <div className="flex items-center gap-2.5">
      {done
        ? <CheckCircle2 size={15} className="text-green-400 shrink-0" />
        : <Circle size={15} className="text-amber-400/50 shrink-0" />
      }
      {done
        ? <span className="text-sm text-slate-500 line-through">{label}</span>
        : <Link href={href} className="text-sm text-amber-300 hover:text-amber-200 transition-colors">{label} →</Link>
      }
    </div>
  );
}
