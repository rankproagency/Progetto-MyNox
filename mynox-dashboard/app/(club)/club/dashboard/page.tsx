import { createClient } from '@/lib/supabase/server';
import { getProfile } from '@/lib/auth';
import { Ticket, TrendingUp, CalendarDays, BarChart3 } from 'lucide-react';

async function getClubStats(clubId: string) {
  const supabase = await createClient();

  // Prendo gli eventi del club
  const { data: events } = await supabase
    .from('events')
    .select('id, name, date, tickets_sold, capacity, is_published')
    .eq('club_id', clubId)
    .order('date', { ascending: false })
    .limit(5);

  const eventIds = (events ?? []).map((e) => e.id);

  // Biglietti e ricavi solo sugli eventi del club
  let totalTickets = 0;
  let revenue = 0;

  if (eventIds.length > 0) {
    const { count } = await supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .in('event_id', eventIds)
      .in('status', ['valid', 'used']);

    const { data: ticketRevenue } = await supabase
      .from('tickets')
      .select('ticket_types(price)')
      .in('event_id', eventIds)
      .in('status', ['valid', 'used']);

    totalTickets = count ?? 0;
    revenue = (ticketRevenue ?? []).reduce((sum: number, t: any) => {
      return sum + (t.ticket_types?.price ?? 0);
    }, 0);
  }

  const totalEvents = events?.length ?? 0;
  const publishedEvents = events?.filter((e) => e.is_published).length ?? 0;

  return {
    revenue,
    totalTickets,
    totalEvents,
    publishedEvents,
    recentEvents: events ?? [],
  };
}

export default async function ClubDashboardPage() {
  const profile = await getProfile();
  if (!profile?.club_id) return <p className="text-slate-400">Club non configurato. Contatta l&apos;amministratore.</p>;

  const stats = await getClubStats(profile.club_id);

  const kpis = [
    {
      label: 'Ricavi totali',
      value: `€${stats.revenue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
    },
    {
      label: 'Biglietti venduti',
      value: stats.totalTickets.toLocaleString('it-IT'),
      icon: Ticket,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
    },
    {
      label: 'Eventi pubblicati',
      value: stats.publishedEvents.toLocaleString('it-IT'),
      icon: CalendarDays,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
    },
    {
      label: 'Eventi totali',
      value: stats.totalEvents.toLocaleString('it-IT'),
      icon: BarChart3,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">Panoramica della tua discoteca.</p>
      </div>

      <div className="grid grid-cols-4 gap-5 mb-10">
        {kpis.map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className="bg-[#111118] border border-white/8 rounded-xl p-5 flex items-start gap-4">
            <div className={`w-10 h-10 rounded-lg ${bg} border ${border} flex items-center justify-center flex-shrink-0`}>
              <Icon size={18} className={color} />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium mb-1">{label}</p>
              <p className="text-2xl font-bold text-white">{value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#111118] border border-white/8 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/8">
          <h2 className="text-sm font-semibold text-white">I tuoi eventi recenti</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8">
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Nome</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Data</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Biglietti</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Stato</th>
            </tr>
          </thead>
          <tbody>
            {stats.recentEvents.length > 0 ? (
              stats.recentEvents.map((event) => (
                <tr key={event.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="px-5 py-4 text-white font-medium">{event.name}</td>
                  <td className="px-5 py-4 text-slate-300">
                    {new Date(event.date).toLocaleDateString('it-IT')}
                  </td>
                  <td className="px-5 py-4 text-slate-300">
                    {event.tickets_sold}{event.capacity ? ` / ${event.capacity}` : ''}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      event.is_published
                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                        : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    }`}>
                      {event.is_published ? 'Pubblicato' : 'Bozza'}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-5 py-10 text-center text-slate-500">
                  Nessun evento ancora.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
