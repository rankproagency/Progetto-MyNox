import { getProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import AnalyticsCharts from '@/components/club/AnalyticsCharts';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

async function getAnalyticsData(clubId: string) {
  const supabase = await createClient();

  const { data: events } = await supabase
    .from('events')
    .select('id, name, date, tickets_sold, capacity')
    .eq('club_id', clubId)
    .eq('is_published', true)
    .order('date', { ascending: true });

  const eventIds = (events ?? []).map((e) => e.id);

  let tickets: any[] = [];
  if (eventIds.length > 0) {
    const { data } = await supabase
      .from('tickets')
      .select('created_at, status, ticket_types(price)')
      .in('event_id', eventIds)
      .in('status', ['valid', 'used'])
      .order('created_at', { ascending: true });
    tickets = data ?? [];
  }

  // Ricavi per mese (ultimi 6 mesi)
  const now = new Date();
  const revenueByMonth: Record<string, number> = {};
  const ticketsByMonth: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' });
    revenueByMonth[key] = 0;
    ticketsByMonth[key] = 0;
  }
  tickets.forEach((t: any) => {
    const d = new Date(t.created_at);
    const key = d.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' });
    if (key in revenueByMonth) {
      revenueByMonth[key] += t.ticket_types?.price ?? 0;
      ticketsByMonth[key] = (ticketsByMonth[key] ?? 0) + 1;
    }
  });
  const revenueData = Object.entries(revenueByMonth).map(([mese, ricavi]) => ({ mese, ricavi }));

  // KPI mese corrente vs mese precedente
  const currentMonthKey = now.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' });
  const prevMonthKey = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    .toLocaleDateString('it-IT', { month: 'short', year: '2-digit' });

  const currentRevenue = revenueByMonth[currentMonthKey] ?? 0;
  const prevRevenue = revenueByMonth[prevMonthKey] ?? 0;
  const currentTickets = ticketsByMonth[currentMonthKey] ?? 0;
  const prevTickets = ticketsByMonth[prevMonthKey] ?? 0;

  function pct(curr: number, prev: number) {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  }

  const totalRevenue = tickets.reduce((sum: number, t: any) => sum + (t.ticket_types?.price ?? 0), 0);
  const totalTickets = tickets.length;
  const avgTicketPrice = totalTickets > 0 ? totalRevenue / totalTickets : 0;

  const totalCapacity = (events ?? []).reduce((sum, e) => sum + (e.capacity ?? 0), 0);
  const totalSold = (events ?? []).reduce((sum, e) => sum + (e.tickets_sold ?? 0), 0);
  const fillRate = totalCapacity > 0 ? Math.round((totalSold / totalCapacity) * 100) : 0;

  const salesByEvent = (events ?? []).map((e) => ({
    name: e.name.length > 20 ? e.name.slice(0, 20) + '…' : e.name,
    venduti: e.tickets_sold,
    capacita: e.capacity ?? 0,
  }));

  return {
    salesByEvent,
    revenueData,
    totalRevenue,
    totalTickets,
    avgTicketPrice,
    fillRate,
    currentRevenue,
    prevRevenue,
    currentTickets,
    prevTickets,
    revenuePct: pct(currentRevenue, prevRevenue),
    ticketsPct: pct(currentTickets, prevTickets),
  };
}

export default async function ClubAnalyticsPage() {
  const profile = await getProfile();
  if (!profile?.club_id) return <p className="text-slate-400">Club non configurato. Contatta l&apos;amministratore.</p>;

  const data = await getAnalyticsData(profile.club_id);

  const kpis = [
    {
      label: 'Ricavi totali',
      value: `€${data.totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: `€${data.currentRevenue.toFixed(2)} questo mese`,
      trend: data.revenuePct,
    },
    {
      label: 'Biglietti venduti',
      value: data.totalTickets.toLocaleString('it-IT'),
      sub: `${data.currentTickets} questo mese`,
      trend: data.ticketsPct,
    },
    {
      label: 'Prezzo medio biglietto',
      value: `€${data.avgTicketPrice.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      sub: 'Su tutti gli eventi',
      trend: null,
    },
    {
      label: 'Tasso di riempimento',
      value: `${data.fillRate}%`,
      sub: 'Media su tutti gli eventi',
      trend: null,
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-slate-400 mt-1">Performance storica dei tuoi eventi.</p>
      </div>

      <div className="grid grid-cols-4 gap-5 mb-8">
        {kpis.map(({ label, value, sub, trend }) => (
          <div key={label} className="bg-[#111118] border border-white/8 rounded-xl p-5">
            <p className="text-xs text-slate-400 font-medium mb-1 uppercase tracking-wide">{label}</p>
            <p className="text-2xl font-bold text-white mb-2">{value}</p>
            <div className="flex items-center gap-2">
              {trend !== null && <TrendBadge pct={trend} />}
              <p className="text-xs text-slate-500">{sub}</p>
            </div>
          </div>
        ))}
      </div>

      <AnalyticsCharts salesByEvent={data.salesByEvent} revenueData={data.revenueData} />
    </div>
  );
}

function TrendBadge({ pct }: { pct: number }) {
  if (pct === 0) return (
    <span className="inline-flex items-center gap-0.5 text-xs text-slate-400 bg-slate-400/10 border border-slate-400/20 px-1.5 py-0.5 rounded-full shrink-0">
      <Minus size={10} /> 0%
    </span>
  );
  const up = pct > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full border shrink-0 ${
      up
        ? 'text-green-400 bg-green-400/10 border-green-400/20'
        : 'text-red-400 bg-red-400/10 border-red-400/20'
    }`}>
      {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {up ? '+' : ''}{pct}%
    </span>
  );
}
