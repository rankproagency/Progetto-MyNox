import { createClient } from '@/lib/supabase/server';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import AdminAnalyticsCharts from '@/components/admin/AdminAnalyticsCharts';

async function getAnalyticsData() {
  const supabase = await createClient();

  const { data: tickets } = await supabase
    .from('tickets')
    .select('created_at, event_id, price_paid, ticket_type_id, ticket_types(price), events(name, clubs(name))')
    .in('status', ['valid', 'used'])
    .order('created_at', { ascending: true });

  const all = tickets ?? [];

  const now = new Date();

  // Ricavi per mese (ultimi 6 mesi)
  const revenueByMonth: Record<string, number> = {};
  const ticketsByMonth: Record<string, number> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' });
    revenueByMonth[key] = 0;
    ticketsByMonth[key] = 0;
  }
  all.forEach((t: any) => {
    const key = new Date(t.created_at).toLocaleDateString('it-IT', { month: 'short', year: '2-digit' });
    if (key in revenueByMonth) {
      revenueByMonth[key] += t.ticket_types?.price ?? t.price_paid ?? 0;
      if (t.ticket_type_id !== null) ticketsByMonth[key] += 1;
    }
  });
  const revenueByMonthData = Object.entries(revenueByMonth).map(([mese, ricavi]) => ({
    mese,
    ricavi: +ricavi.toFixed(2),
    commissioni: +(ricavi * 0.08).toFixed(2),
  }));

  // Confronto mese corrente vs precedente
  const currentKey = now.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' });
  const prevKey = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    .toLocaleDateString('it-IT', { month: 'short', year: '2-digit' });

  const currRev = revenueByMonth[currentKey] ?? 0;
  const prevRev = revenueByMonth[prevKey] ?? 0;
  const currTickets = ticketsByMonth[currentKey] ?? 0;
  const prevTickets = ticketsByMonth[prevKey] ?? 0;

  function pct(curr: number, prev: number) {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  }

  // Per club
  const byClub: Record<string, { biglietti: number; ricavi: number }> = {};
  all.forEach((t: any) => {
    const name = (t.events as any)?.clubs?.name ?? 'Sconosciuto';
    if (!byClub[name]) byClub[name] = { biglietti: 0, ricavi: 0 };
    if (t.ticket_type_id !== null) byClub[name].biglietti += 1;
    byClub[name].ricavi += t.ticket_types?.price ?? t.price_paid ?? 0;
  });
  const ticketsByClub = Object.entries(byClub)
    .map(([club, d]) => ({ club, biglietti: d.biglietti, ricavi: +d.ricavi.toFixed(2) }))
    .sort((a, b) => b.ricavi - a.ricavi)
    .slice(0, 8);

  // Top eventi
  const byEvent: Record<string, { name: string; club: string; biglietti: number; ricavi: number }> = {};
  all.forEach((t: any) => {
    const id = t.event_id;
    if (!id) return;
    const name = (t.events as any)?.name ?? '—';
    const club = (t.events as any)?.clubs?.name ?? '—';
    if (!byEvent[id]) byEvent[id] = { name, club, biglietti: 0, ricavi: 0 };
    if (t.ticket_type_id !== null) byEvent[id].biglietti += 1;
    byEvent[id].ricavi += t.ticket_types?.price ?? t.price_paid ?? 0;
  });
  const topEvents = Object.values(byEvent)
    .sort((a, b) => b.ricavi - a.ricavi)
    .slice(0, 5)
    .map((e) => ({ ...e, ricavi: +e.ricavi.toFixed(2) }));

  const totalRevenue = all.reduce((sum: number, t: any) => sum + (t.ticket_types?.price ?? t.price_paid ?? 0), 0);
  const totalCommission = totalRevenue * 0.08;

  return {
    revenueByMonthData,
    ticketsByClub,
    topEvents,
    totalRevenue,
    totalCommission,
    currRev,
    prevRev,
    currTickets,
    prevTickets,
    revPct: pct(currRev, prevRev),
    tickPct: pct(currTickets, prevTickets),
  };
}

export default async function AdminAnalyticsPage() {
  const data = await getAnalyticsData();

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-slate-400 mt-1">Performance storica della piattaforma MyNox.</p>
      </div>

      {/* KPI con trend */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-[#111118] border border-white/8 rounded-xl p-5">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Ricavi piattaforma</p>
          <p className="text-3xl font-bold text-white mb-2">
            €{data.totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <TrendBadge pct={data.revPct} />
            <p className="text-xs text-slate-500">€{data.currRev.toFixed(2)} questo mese vs €{data.prevRev.toFixed(2)} il mese scorso</p>
          </div>
        </div>

        <div className="bg-[#111118] border border-white/8 rounded-xl p-5 border-l-2 border-l-green-500/40">
          <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Commissioni MyNox (8%)</p>
          <p className="text-3xl font-bold text-green-400 mb-2">
            €{data.totalCommission.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <TrendBadge pct={data.revPct} />
            <p className="text-xs text-slate-500">€{(data.currRev * 0.08).toFixed(2)} questo mese</p>
          </div>
        </div>
      </div>

      <AdminAnalyticsCharts
        revenueByMonth={data.revenueByMonthData}
        ticketsByClub={data.ticketsByClub}
        topEvents={data.topEvents}
      />
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
      up ? 'text-green-400 bg-green-400/10 border-green-400/20' : 'text-red-400 bg-red-400/10 border-red-400/20'
    }`}>
      {up ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
      {up ? '+' : ''}{pct}%
    </span>
  );
}
