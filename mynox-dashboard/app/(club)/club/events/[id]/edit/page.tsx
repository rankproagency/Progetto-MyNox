import { redirect, notFound } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import EventForm from '@/components/club/EventForm';

export default async function EditEventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const profile = await getProfile();
  if (!profile?.club_id) return <p className="text-slate-400">Club non configurato. Contatta l&apos;amministratore.</p>;

  const supabase = await createClient();
  const [{ data: event }, { data: ticketTypes }] = await Promise.all([
    supabase.from('events').select('*').eq('id', id).eq('club_id', profile.club_id).single(),
    supabase.from('ticket_types').select('*').eq('event_id', id).order('created_at', { ascending: true }),
  ]);

  if (!event) notFound();

  const initialTicketTypes = (ticketTypes ?? []).map((t: any) => ({
    id: t.id,
    label: t.label,
    price: String(t.price),
    total_quantity: String(t.total_quantity ?? ''),
    includes_drink: t.includes_drink,
  }));

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
      <EventForm clubId={profile.club_id} event={event} initialTicketTypes={initialTicketTypes.length > 0 ? initialTicketTypes : undefined} />
    </div>
  );
}
