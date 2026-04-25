import { createAdminClient } from '@/lib/supabase/admin';
import { CalendarDays, FileEdit, Clock } from 'lucide-react';
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
      .select('event_id, price_paid, ticket_types(price)')
      .in('status', ['valid', 'used']),
  ]);

  const revenueByEvent: Record<string, number> = {};
  for (const t of ticketRevenue ?? []) {
    const id = (t as any).event_id;
    const price = (t as any).ticket_types?.price ?? (t as any).price_paid ?? 0;
    if (id) revenueByEvent[id] = (revenueByEvent[id] ?? 0) + price;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const allEvents = events ?? [];
  const futureEvents = allEvents.filter((e) => new Date(e.date) >= today);
  const pastEvents   = allEvents.filter((e) => new Date(e.date) < today);
  const publishedCount = futureEvents.filter((e) => e.is_published).length;
  const draftCount     = futureEvents.filter((e) => !e.is_published).length;

  const clubNames = Array.from(
    new Set(allEvents.map((e) => (e as any).clubs?.name).filter(Boolean))
  ).sort() as string[];

  const toRow = (e: any) => ({
    id: e.id,
    name: e.name,
    date: e.date,
    start_time: e.start_time,
    tickets_sold: e.tickets_sold,
    capacity: e.capacity,
    is_published: e.is_published,
    clubName: e.clubs?.name ?? '—',
    revenue: revenueByEvent[e.id] ?? 0,
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Eventi</h1>
        <p className="text-slate-400 mt-1">Supervisione di tutti gli eventi sulla piattaforma.</p>
      </div>

      {/* KPI operativi */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <StatCard
          icon={<CalendarDays size={16} className="text-green-400" />}
          label="Pubblicati"
          value={publishedCount}
          sub="eventi futuri visibili nell'app"
          color="text-green-400"
        />
        <StatCard
          icon={<FileEdit size={16} className="text-amber-400" />}
          label="In bozza"
          value={draftCount}
          sub="futuri, non ancora pubblicati"
          color="text-amber-400"
        />
        <StatCard
          icon={<Clock size={16} className="text-slate-400" />}
          label="Passati"
          value={pastEvents.length}
          sub="eventi conclusi"
          color="text-slate-400"
        />
      </div>

      <EventsTable
        futureEvents={futureEvents.map(toRow)}
        pastEvents={pastEvents.map(toRow)}
        clubNames={clubNames}
      />
    </div>
  );
}

function StatCard({
  icon, label, value, sub, color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  sub: string;
  color: string;
}) {
  return (
    <div className="bg-[#111118] border border-white/8 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        {icon}
        <span className="text-xs text-slate-400 uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-slate-500 mt-1">{sub}</p>
    </div>
  );
}
