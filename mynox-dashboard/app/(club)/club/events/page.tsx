import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProfile, getStaffPermissions } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { Plus } from 'lucide-react';
import ClubEventsTable from './ClubEventsTable';

export default async function ClubEventsPage() {
  const profile = await getProfile();
  if (!profile?.club_id) return <p className="text-slate-400">Club non configurato. Contatta l&apos;amministratore.</p>;

  if (profile.role === 'club_staff') {
    const perms = await getStaffPermissions(profile.id, profile.club_id);
    if (!perms?.can_manage_events) redirect('/club/dashboard');
  }

  const supabase = createAdminClient();
  const { data: events } = await supabase
    .from('events')
    .select('*')
    .eq('club_id', profile.club_id)
    .order('date', { ascending: false });

  const eventIds = (events ?? []).map((e) => e.id);
  const revenueByEvent: Record<string, number> = {};
  const capacityByEvent: Record<string, number | null> = {};

  if (eventIds.length > 0) {
    const [{ data: ticketRevenue }, { data: ticketTypes }] = await Promise.all([
      supabase
        .from('tickets')
        .select('event_id, price_paid')
        .in('event_id', eventIds)
        .in('status', ['valid', 'used']),
      supabase
        .from('ticket_types')
        .select('event_id, total_quantity')
        .in('event_id', eventIds),
    ]);

    for (const t of ticketRevenue ?? []) {
      const id = (t as any).event_id;
      const price = ((t as any).price_paid ?? 0) / 1.08;
      revenueByEvent[id] = (revenueByEvent[id] ?? 0) + price;
    }

    for (const tt of ticketTypes ?? []) {
      const id = (tt as any).event_id;
      const qty = (tt as any).total_quantity;
      if (qty != null) {
        capacityByEvent[id] = (capacityByEvent[id] ?? 0) + qty;
      } else {
        capacityByEvent[id] = capacityByEvent[id] ?? null;
      }
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const toRow = (e: any) => ({
    id: e.id,
    name: e.name,
    date: e.date,
    start_time: e.start_time,
    tickets_sold: e.tickets_sold ?? 0,
    capacity: capacityByEvent[e.id] ?? null,
    is_published: e.is_published,
    revenue: revenueByEvent[e.id] ?? 0,
  });

  const futureEvents = (events ?? []).filter((e) => new Date(e.date) >= today).map(toRow);
  const pastEvents   = (events ?? []).filter((e) => new Date(e.date) < today).map(toRow);

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">I miei eventi</h1>
          <p className="text-slate-400 mt-1">Gestisci gli eventi della tua discoteca.</p>
        </div>
        <Link
          href="/club/events/new"
          className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors w-full md:w-auto"
        >
          <Plus size={16} />
          Nuovo evento
        </Link>
      </div>

      <ClubEventsTable futureEvents={futureEvents} pastEvents={pastEvents} />
    </div>
  );
}
