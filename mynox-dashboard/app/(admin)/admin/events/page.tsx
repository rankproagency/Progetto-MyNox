import { createAdminClient } from '@/lib/supabase/admin';
import { CalendarDays, TrendingUp, Euro, Clock } from 'lucide-react';
import EventsTable from './EventsTable';

export default async function AdminEventsPage() {
  const supabase = createAdminClient();

  const [{ data: events }, { data: ticketRevenue }] = await Promise.all([
    supabase
      .from('events')
      .select('*, clubs(name)')
      .order('date', { ascending: false }),
    supabase
      .from('tickets')
      .select('event_id, ticket_types(price)')
      .in('status', ['valid', 'used']),
  ]);

  const revenueByEvent: Record<string, number> = {};
  for (const t of ticketRevenue ?? []) {
    const id = (t as any).event_id;
    const price = (t as any).ticket_types?.price ?? 0;
    if (id) revenueByEvent[id] = (revenueByEvent[id] ?? 0) + price;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const allEvents = events ?? [];
  const futureEvents = allEvents.filter((e) => new Date(e.date) >= today);
  const pastEvents   = allEvents.filter((e) => new Date(e.date) < today);

  const totalRevenue   = Object.values(revenueByEvent).reduce((s, v) => s + v, 0);
  const totalCommission = totalRevenue * 0.08;
  const publishedCount  = futureEvents.filter((e) => e.is_published).length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Eventi</h1>
        <p className="text-slate-400 mt-1">Tutti gli eventi presenti sulla piattaforma.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<CalendarDays size={18} className="text-purple-400" />}
          label="Eventi futuri"
          value={futureEvents.length}
          sub={`${publishedCount} pubblicati`}
        />
        <StatCard
          icon={<Clock size={18} className="text-slate-400" />}
          label="Eventi passati"
          value={pastEvents.length}
          sub="storici"
        />
        <StatCard
          icon={<Euro size={18} className="text-purple-400" />}
          label="Ricavi totali"
          value={`€${totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub="da biglietti venduti"
        />
        <StatCard
          icon={<TrendingUp size={18} className="text-green-400" />}
          label="Commissione MyNox"
          value={`€${totalCommission.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
          sub="8% sui ricavi"
          accent
        />
      </div>

      <EventsTable
        futureEvents={futureEvents.map((e) => ({
          id: e.id,
          name: e.name,
          date: e.date,
          start_time: e.start_time,
          tickets_sold: e.tickets_sold,
          capacity: e.capacity,
          is_published: e.is_published,
          clubName: (e as any).clubs?.name ?? '—',
          revenue: revenueByEvent[e.id] ?? 0,
          commission: (revenueByEvent[e.id] ?? 0) * 0.08,
        }))}
        pastEvents={pastEvents.map((e) => ({
          id: e.id,
          name: e.name,
          date: e.date,
          start_time: e.start_time,
          tickets_sold: e.tickets_sold,
          capacity: e.capacity,
          is_published: e.is_published,
          clubName: (e as any).clubs?.name ?? '—',
          revenue: revenueByEvent[e.id] ?? 0,
          commission: (revenueByEvent[e.id] ?? 0) * 0.08,
        }))}
      />
    </div>
  );
}

function StatCard({
  icon, label, value, sub, accent,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div className="bg-[#111118] border border-white/8 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${accent ? 'text-green-400' : 'text-white'}`}>
        {value}
      </p>
      <p className="text-xs text-slate-500 mt-1">{sub}</p>
    </div>
  );
}
