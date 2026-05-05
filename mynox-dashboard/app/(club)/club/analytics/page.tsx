import { getProfile, getStaffPermissions } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
import AnalyticsCharts from '@/components/club/AnalyticsCharts';
import { TrendingUp, TrendingDown, Minus, Lock } from 'lucide-react';

async function getAnalyticsData(clubId: string) {
  const supabase = createAdminClient();

  const { data: events } = await supabase
    .from('events')
    .select('id, name, date, tickets_sold, capacity')
    .eq('club_id', clubId)
    .eq('is_published', true)
    .order('date', { ascending: true });

  const eventIds = (events ?? []).map((e) => e.id);

  let tickets: any[] = [];
  let availableTables: any[] = [];
  if (eventIds.length > 0) {
    const [{ data: ticketsData }, { data: tablesData }] = await Promise.all([
      supabase
        .from('tickets')
        .select('event_id, created_at, status, price_paid, ticket_types(price)')
        .in('event_id', eventIds)
        .in('status', ['valid', 'used'])
        .order('created_at', { ascending: true }),
      supabase
        .from('tables')
        .select('event_id')
        .in('event_id', eventIds),
    ]);
    tickets = ticketsData ?? [];
    availableTables = tablesData ?? [];
  }

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
      revenueByMonth[key] += t.ticket_types?.price ?? (t.price_paid ?? 0) / 1.08;
      if (t.ticket_types !== null) ticketsByMonth[key] = (ticketsByMonth[key] ?? 0) + 1;
    }
  });
  const revenueData = Object.entries(revenueByMonth).map(([mese, ricavi]) => ({ mese, ricavi }));

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

  const totalRevenue = tickets.reduce((sum: number, t: any) => sum + (t.ticket_types?.price ?? (t.price_paid ?? 0) / 1.08), 0);
  const ticketsOnly = tickets.filter((t: any) => t.ticket_types !== null);
  const totalTickets = ticketsOnly.length;
  const avgTicketPrice = ticketsOnly.length > 0
    ? ticketsOnly.reduce((sum: number, t: any) => sum + (t.ticket_types?.price ?? 0), 0) / ticketsOnly.length
    : 0;

  const soldByEvent: Record<string, number> = {};
  tickets.forEach((t: any) => {
    if (t.ticket_types !== null && t.event_id) {
      soldByEvent[t.event_id] = (soldByEvent[t.event_id] ?? 0) + 1;
    }
  });
  const totalCapacity = (events ?? []).reduce((sum, e) => sum + (e.capacity ?? 0), 0);
  const totalSold = (events ?? []).reduce((sum, e) => sum + (soldByEvent[e.id] ?? 0), 0);
  const fillRate = totalCapacity > 0 ? Math.round((totalSold / totalCapacity) * 100) : 0;

  const tablesOnly = tickets.filter((t: any) => t.ticket_types === null);
  const totalTableRevenue = tablesOnly.reduce((sum: number, t: any) => sum + (t.price_paid ?? 0) / 1.08, 0);
  const eventsWithTables = new Set(tablesOnly.map((t: any) => t.event_id).filter(Boolean)).size;
  const avgTablesPerEvent = eventsWithTables > 0 ? tablesOnly.length / eventsWithTables : 0;
  const avgTableRevenuePerEvent = eventsWithTables > 0 ? totalTableRevenue / eventsWithTables : 0;

  const availableByEvent: Record<string, number> = {};
  availableTables.forEach((t: any) => {
    if (t.event_id) availableByEvent[t.event_id] = (availableByEvent[t.event_id] ?? 0) + 1;
  });
  const bookedByEvent: Record<string, number> = {};
  tablesOnly.forEach((t: any) => {
    if (t.event_id) bookedByEvent[t.event_id] = (bookedByEvent[t.event_id] ?? 0) + 1;
  });

  const salesByEvent = (events ?? []).map((e) => ({
    name: e.name.length > 20 ? e.name.slice(0, 20) + '…' : e.name,
    venduti: e.tickets_sold,
    capacita: e.capacity ?? 0,
  }));

  const tablesByEvent = (events ?? [])
    .filter((e) => (availableByEvent[e.id] ?? 0) > 0 || (bookedByEvent[e.id] ?? 0) > 0)
    .map((e) => ({
      name: e.name.length > 20 ? e.name.slice(0, 20) + '…' : e.name,
      prenotati: bookedByEvent[e.id] ?? 0,
      disponibili: availableByEvent[e.id] ?? 0,
    }));

  return {
    salesByEvent, revenueData, totalRevenue, totalTickets, avgTicketPrice,
    fillRate, currentRevenue, currentTickets,
    revenuePct: pct(currentRevenue, prevRevenue),
    ticketsPct: pct(currentTickets, prevTickets),
    totalTableRevenue, avgTablesPerEvent, avgTableRevenuePerEvent, tablesByEvent,
  };
}

export default async function ClubAnalyticsPage() {
  const profile = await getProfile();
  if (!profile?.club_id) return <p className="text-slate-400">Club non configurato. Contatta l&apos;amministratore.</p>;

  const isOwner = profile.role === 'club_admin';
  let canViewRevenue = isOwner;
  if (!isOwner) {
    const perms = await getStaffPermissions(profile.id, profile.club_id);
    canViewRevenue = perms?.can_view_analytics ?? false;
  }

  const data = await getAnalyticsData(profile.club_id);

  return (
    <div>
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-slate-400 mt-1">Performance storica dei tuoi eventi.</p>
        </div>
        {!canViewRevenue && (
          <div className="flex items-center gap-2 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">
            <Lock size={13} className="text-amber-400 shrink-0" />
            <p className="text-xs text-amber-400">Dati economici nascosti — contatta il proprietario</p>
          </div>
        )}
      </div>

      {/* KPI base — visibili a tutti */}
      <div className={`grid gap-5 mb-8 ${canViewRevenue ? 'grid-cols-4' : 'grid-cols-2'}`}>
        <KpiCard
          label="Biglietti venduti"
          value={data.totalTickets.toLocaleString('it-IT')}
          sub={`${data.currentTickets} questo mese`}
          trend={data.ticketsPct}
        />
        <KpiCard
          label="Tasso di riempimento"
          value={`${data.fillRate}%`}
          sub="Media su tutti gli eventi"
          trend={null}
        />
        {canViewRevenue && (
          <>
            <KpiCard
              label="Ricavi totali"
              value={`€${data.totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              sub={`Biglietti e tavoli · €${data.currentRevenue.toFixed(2)} questo mese`}
              trend={data.revenuePct}
            />
            <KpiCard
              label="Prezzo medio biglietto"
              value={`€${data.avgTicketPrice.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
              sub="Su tutti gli eventi"
              trend={null}
            />
          </>
        )}
      </div>

      {/* KPI Tavoli */}
      {data.tablesByEvent.length > 0 && (
        <div className="mb-8">
          <p className="text-xs text-slate-500 uppercase tracking-widest font-medium mb-4">Tavoli</p>
          <div className={`grid gap-5 ${canViewRevenue ? 'grid-cols-3' : 'grid-cols-1 max-w-xs'}`}>
            <KpiCard
              label="Media tavoli per serata"
              value={Math.round(data.avgTablesPerEvent).toLocaleString('it-IT')}
              sub={null}
              trend={null}
            />
            {canViewRevenue && (
              <>
                <KpiCard
                  label="Ricavi totali tavoli"
                  value={`€${data.totalTableRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  sub={null}
                  trend={null}
                />
                <KpiCard
                  label="Media ricavi tavoli per serata"
                  value={`€${data.avgTableRevenuePerEvent.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                  sub={null}
                  trend={null}
                />
              </>
            )}
          </div>
        </div>
      )}

      <AnalyticsCharts
        salesByEvent={data.salesByEvent}
        revenueData={canViewRevenue ? data.revenueData : null}
        tablesByEvent={data.tablesByEvent}
      />
    </div>
  );
}

function KpiCard({ label, value, sub, trend }: { label: string; value: string; sub: string | null; trend: number | null }) {
  return (
    <div className="bg-[#111118] border border-white/8 rounded-xl p-5">
      <p className="text-xs text-slate-400 font-medium mb-1 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold text-white mb-2">{value}</p>
      {(trend !== null || sub) && (
        <div className="flex items-center gap-2">
          {trend !== null && <TrendBadge pct={trend} />}
          {sub && <p className="text-xs text-slate-500">{sub}</p>}
        </div>
      )}
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
