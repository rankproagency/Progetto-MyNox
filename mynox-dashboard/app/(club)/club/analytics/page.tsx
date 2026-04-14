import { getProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import AnalyticsCharts from '@/components/club/AnalyticsCharts';

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

  const salesByEvent = (events ?? []).map((e) => ({
    name: e.name.length > 20 ? e.name.slice(0, 20) + '…' : e.name,
    venduti: e.tickets_sold,
    capacita: e.capacity ?? 0,
  }));

  const revenueByMonth: Record<string, number> = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' });
    revenueByMonth[key] = 0;
  }
  tickets.forEach((t: any) => {
    const d = new Date(t.created_at);
    const key = d.toLocaleDateString('it-IT', { month: 'short', year: '2-digit' });
    if (key in revenueByMonth) {
      revenueByMonth[key] += t.ticket_types?.price ?? 0;
    }
  });
  const revenueData = Object.entries(revenueByMonth).map(([mese, ricavi]) => ({ mese, ricavi }));

  const totalRevenue = tickets.reduce((sum: number, t: any) => sum + (t.ticket_types?.price ?? 0), 0);
  const totalTickets = tickets.length;
  const avgTicketPrice = totalTickets > 0 ? totalRevenue / totalTickets : 0;

  return { salesByEvent, revenueData, totalRevenue, totalTickets, avgTicketPrice };
}

export default async function ClubAnalyticsPage() {
  const profile = await getProfile();
  if (!profile?.club_id) return <p className="text-slate-400">Club non configurato. Contatta l&apos;amministratore.</p>;

  const data = await getAnalyticsData(profile.club_id);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Analytics</h1>
        <p className="text-slate-400 mt-1">Performance dei tuoi eventi.</p>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-8">
        <div className="bg-[#111118] border border-white/8 rounded-xl p-5">
          <p className="text-xs text-slate-400 font-medium mb-1 uppercase tracking-wide">Ricavi totali</p>
          <p className="text-2xl font-bold text-white">
            €{data.totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
        <div className="bg-[#111118] border border-white/8 rounded-xl p-5">
          <p className="text-xs text-slate-400 font-medium mb-1 uppercase tracking-wide">Biglietti venduti</p>
          <p className="text-2xl font-bold text-white">{data.totalTickets}</p>
        </div>
        <div className="bg-[#111118] border border-white/8 rounded-xl p-5">
          <p className="text-xs text-slate-400 font-medium mb-1 uppercase tracking-wide">Prezzo medio biglietto</p>
          <p className="text-2xl font-bold text-white">
            €{data.avgTicketPrice.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <AnalyticsCharts salesByEvent={data.salesByEvent} revenueData={data.revenueData} />
    </div>
  );
}
