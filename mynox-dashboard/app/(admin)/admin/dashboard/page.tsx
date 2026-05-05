import { createClient } from '@/lib/supabase/server';
import { Users, Building2, Ticket, TrendingUp } from 'lucide-react';

async function getStats() {
  const supabase = await createClient();

  const [
    { count: totalClubs },
    { count: totalUsers },
    { count: totalTickets },
    { data: ticketRevenue },
    { data: recentEvents },
  ] = await Promise.all([
    supabase.from('clubs').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'customer'),
    supabase.from('tickets').select('*', { count: 'exact', head: true }).in('status', ['valid', 'used']),
    supabase.from('tickets').select('event_id, ticket_types(price)').in('status', ['valid', 'used']),
    supabase
      .from('events')
      .select('id, name, date, tickets_sold, capacity, clubs(name)')
      .eq('is_published', true)
      .order('date', { ascending: false })
      .limit(5),
  ]);

  const revenue = (ticketRevenue ?? []).reduce((sum: number, t: any) => {
    return sum + (t.ticket_types?.price ?? 0);
  }, 0);

  const revenueByEvent: Record<string, number> = {};
  for (const t of ticketRevenue ?? []) {
    const id = (t as any).event_id;
    if (id) revenueByEvent[id] = (revenueByEvent[id] ?? 0) + ((t as any).ticket_types?.price ?? 0);
  }

  return {
    totalClubs: totalClubs ?? 0,
    totalUsers: totalUsers ?? 0,
    totalTickets: totalTickets ?? 0,
    revenue,
    recentEvents: recentEvents ?? [],
    revenueByEvent,
  };
}

export default async function AdminDashboardPage() {
  const stats = await getStats();

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
      label: 'Discoteche attive',
      value: stats.totalClubs.toLocaleString('it-IT'),
      icon: Building2,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
    },
    {
      label: 'Utenti registrati',
      value: stats.totalUsers.toLocaleString('it-IT'),
      icon: Users,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 mt-1">Panoramica generale della piattaforma MyNox.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-5 mb-10">
        {kpis.map(({ label, value, icon: Icon, color, bg, border }) => (
          <div
            key={label}
            className={`bg-[#111118] border border-white/8 rounded-xl p-5 flex items-start gap-4`}
          >
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

      {/* Recent events */}
      <div className="bg-[#111118] border border-white/8 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/8">
          <h2 className="text-sm font-semibold text-white">Eventi recenti</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8">
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Nome</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Discoteca</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Data</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Biglietti</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Ricavi</th>
            </tr>
          </thead>
          <tbody>
            {stats.recentEvents.length > 0 ? (
              stats.recentEvents.map((event: any) => (
                <tr key={event.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="px-5 py-4 text-white font-medium">{event.name}</td>
                  <td className="px-5 py-4 text-slate-300">{event.clubs?.name ?? '—'}</td>
                  <td className="px-5 py-4 text-slate-300">
                    {new Date(event.date).toLocaleDateString('it-IT')}
                  </td>
                  <td className="px-5 py-4 text-slate-300">
                    {event.tickets_sold}
                    {event.capacity ? ` / ${event.capacity}` : ''}
                  </td>
                  <td className="px-5 py-4 font-semibold text-purple-400">
                    €{(stats.revenueByEvent[event.id] ?? 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-slate-500">
                  Nessun evento pubblicato.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
