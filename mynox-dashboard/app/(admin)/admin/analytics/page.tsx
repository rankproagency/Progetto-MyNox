import { createClient } from '@/lib/supabase/server';
import { TrendingUp, Ticket, Percent, Building2 } from 'lucide-react';
import AdminAnalyticsCharts from '@/components/admin/AdminAnalyticsCharts';

async function getAnalyticsData() {
  const supabase = await createClient();

  const { data: tickets } = await supabase
    .from('tickets')
    .select('created_at, event_id, ticket_types(price), events(name, clubs(name))')
    .in('status', ['valid', 'used'])
    .order('created_at', { ascending: true });

  const all = tickets ?? [];

  // ── Ricavi e commissioni per mese (ultimi 6 mesi) ──
  const revenueByMonth: Record<string, number> = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' });
    revenueByMonth[key] = 0;
  }
  all.forEach((t: any) => {
    const key = new Date(t.created_at).toLocaleDateString('it-IT', { month: 'short', year: '2-digit' });
    if (key in revenueByMonth) revenueByMonth[key] += t.ticket_types?.price ?? 0;
  });
  const revenueByMonthData = Object.entries(revenueByMonth).map(([mese, ricavi]) => ({
    mese,
    ricavi: +ricavi.toFixed(2),
    commissioni: +(ricavi * 0.08).toFixed(2),
  }));

  // ── Biglietti e ricavi per club ──
  const byClub: Record<string, { biglietti: number; ricavi: number }> = {};
  all.forEach((t: any) => {
    const name = (t.events as any)?.clubs?.name ?? 'Sconosciuto';
    if (!byClub[name]) byClub[name] = { biglietti: 0, ricavi: 0 };
    byClub[name].biglietti += 1;
    byClub[name].ricavi += t.ticket_types?.price ?? 0;
  });
  const ticketsByClub = Object.entries(byClub)
    .map(([club, d]) => ({ club, biglietti: d.biglietti, ricavi: +d.ricavi.toFixed(2) }))
    .sort((a, b) => b.ricavi - a.ricavi)
    .slice(0, 8);

  // ── Top 5 eventi per ricavi ──
  const byEvent: Record<string, { name: string; club: string; biglietti: number; ricavi: number }> = {};
  all.forEach((t: any) => {
    const id = t.event_id;
    if (!id) return;
    const name = (t.events as any)?.name ?? '—';
    const club = (t.events as any)?.clubs?.name ?? '—';
    if (!byEvent[id]) byEvent[id] = { name, club, biglietti: 0, ricavi: 0 };
    byEvent[id].biglietti += 1;
    byEvent[id].ricavi += t.ticket_types?.price ?? 0;
  });
  const topEvents = Object.values(byEvent)
    .sort((a, b) => b.ricavi - a.ricavi)
    .slice(0, 5)
    .map((e) => ({ ...e, ricavi: +e.ricavi.toFixed(2) }));

  // ── KPI totali ──
  const totalRevenue = all.reduce((sum: number, t: any) => sum + (t.ticket_types?.price ?? 0), 0);
  const totalTickets = all.length;
  const totalCommission = totalRevenue * 0.08;
  const activeClubs = Object.keys(byClub).length;

  return { revenueByMonthData, ticketsByClub, topEvents, totalRevenue, totalTickets, totalCommission, activeClubs };
}

export default async function AdminAnalyticsPage() {
  const data = await getAnalyticsData();

  const kpis = [
    {
      label: 'Ricavi totali piattaforma',
      value: `€${data.totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: TrendingUp,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10',
      border: 'border-purple-500/20',
    },
    {
      label: 'Commissioni MyNox (8%)',
      value: `€${data.totalCommission.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: Percent,
      color: 'text-green-400',
      bg: 'bg-green-500/10',
      border: 'border-green-500/20',
    },
    {
      label: 'Biglietti venduti',
      value: data.totalTickets.toLocaleString('it-IT'),
      icon: Ticket,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      border: 'border-blue-500/20',
    },
    {
      label: 'Club con vendite',
      value: data.activeClubs.toLocaleString('it-IT'),
      icon: Building2,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
    },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-slate-400 mt-1">Performance globale della piattaforma MyNox.</p>
      </div>

      <div className="grid grid-cols-4 gap-5 mb-8">
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

      <AdminAnalyticsCharts
        revenueByMonth={data.revenueByMonthData}
        ticketsByClub={data.ticketsByClub}
        topEvents={data.topEvents}
      />
    </div>
  );
}
