import { notFound, redirect } from 'next/navigation';
import { getProfile, getStaffPermissions } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import EventForm from '@/components/club/EventForm';

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfile();
  if (!profile?.club_id) {
    return <p className="text-slate-400">Club non configurato. Contatta l&apos;amministratore.</p>;
  }

  if (profile.role === 'club_staff') {
    const perms = await getStaffPermissions(profile.id, profile.club_id);
    if (!perms?.can_manage_events) redirect('/club/dashboard');
  }

  const supabase = await createClient();
  const [{ data: event }, { data: ticketTypes }, { data: club }, { data: clubTables }, { data: eventTables }] = await Promise.all([
    supabase.from('events').select('*').eq('id', id).eq('club_id', profile.club_id).single(),
    supabase.from('ticket_types').select('*').eq('event_id', id).order('created_at', { ascending: true }),
    supabase.from('clubs').select('floor_plan_url').eq('id', profile.club_id).single(),
    supabase.from('club_tables').select('*').eq('club_id', profile.club_id).order('created_at'),
    supabase.from('tables').select('*').eq('event_id', id),
  ]);

  if (!event) notFound();

  const initialTicketTypes = (ticketTypes ?? []).map((t: any) => ({
    id: t.id,
    label: t.label,
    price: String(t.price),
    total_quantity: String(t.total_quantity ?? ''),
    includes_drink: t.includes_drink,
    sold_quantity: t.sold_quantity ?? 0,
  }));

  // Costruisci la lista tavoli per questo evento: usa quelli esistenti se ci sono,
  // altrimenti usa i tavoli del locale come default
  const mappedClubTables = (clubTables ?? []).map((t: any) => ({
    id: t.id,
    label: t.label,
    capacity: t.capacity,
    posX: t.pos_x,
    posY: t.pos_y,
    defaultDeposit: t.default_deposit ?? 0,
  }));

  const initialEventTables = mappedClubTables.map((ct: any) => {
    const existing = (eventTables ?? []).find((et: any) =>
      et.club_table_id ? et.club_table_id === ct.id : et.label === ct.label
    );
    return {
      id: existing?.id as string | undefined,
      clubTableId: ct.id,
      label: ct.label,
      capacity: ct.capacity,
      deposit: existing ? String(existing.deposit) : String(ct.defaultDeposit || ''),
      defaultDeposit: ct.defaultDeposit,
      isAvailable: existing ? existing.is_available : true,
    };
  });

  return (
    <div>
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-white">Modifica evento</h1>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
            event.is_published
              ? 'bg-green-500/10 text-green-400 border-green-500/20'
              : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
          }`}>
            {event.is_published ? 'Pubblicato' : 'Bozza'}
          </span>
        </div>
        <p className="text-slate-400">{event.name}</p>
      </div>
      <EventForm
        clubId={profile.club_id}
        clubFloorPlanUrl={club?.floor_plan_url}
        clubTables={mappedClubTables}
        event={{ ...event, performers: event.performers ?? [] }}
        initialTicketTypes={initialTicketTypes.length > 0 ? initialTicketTypes : undefined}
        initialEventTables={initialEventTables.length > 0 ? initialEventTables : undefined}
      />
    </div>
  );
}
