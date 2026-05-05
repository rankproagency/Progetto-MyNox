import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getProfile, getStaffPermissions } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { Plus, Pencil, Lock } from 'lucide-react';
import DuplicateEventButton from '@/components/club/DuplicateEventButton';
import PublishToggle from '@/components/club/PublishToggle';

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

  if (eventIds.length > 0) {
    const { data: ticketRevenue } = await supabase
      .from('tickets')
      .select('event_id, price_paid, ticket_types(price)')
      .in('event_id', eventIds)
      .in('status', ['valid', 'used']);

    for (const t of ticketRevenue ?? []) {
      const id = (t as any).event_id;
      const price = (t as any).ticket_types?.price ?? ((t as any).price_paid ?? 0) / 1.08;
      revenueByEvent[id] = (revenueByEvent[id] ?? 0) + price;
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const futureEvents = (events ?? []).filter((e) => new Date(e.date) >= today);
  const pastEvents = (events ?? []).filter((e) => new Date(e.date) < today);

  return (
    <div>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">I miei eventi</h1>
          <p className="text-slate-400 mt-1">Gestisci gli eventi della tua discoteca.</p>
        </div>
        <Link
          href="/club/events/new"
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Nuovo evento
        </Link>
      </div>

      <div className="bg-[#111118] border border-white/8 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8">
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Nome</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Data</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium hidden md:table-cell">Orario</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium hidden md:table-cell">Biglietti</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium hidden md:table-cell">Ricavi</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Stato</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {/* ── Eventi futuri ── */}
            {futureEvents.length > 0 ? (
              futureEvents.map((event) => (
                <tr key={event.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="px-5 py-4 font-medium">
                    <Link href={`/club/events/${event.id}`} className="text-white hover:text-purple-400 transition-colors">
                      {event.name}
                    </Link>
                  </td>
                  <td className="px-5 py-4 text-slate-300">
                    {new Date(event.date).toLocaleDateString('it-IT')}
                  </td>
                  <td className="px-5 py-4 text-slate-300 hidden md:table-cell">{event.start_time}</td>
                  <td className="px-5 py-4 text-slate-300 hidden md:table-cell">
                    {event.tickets_sold}{event.capacity ? ` / ${event.capacity}` : ''}
                  </td>
                  <td className="px-5 py-4 font-semibold text-purple-400 hidden md:table-cell">
                    €{(revenueByEvent[event.id] ?? 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-4">
                    <PublishToggle eventId={event.id} isPublished={event.is_published} />
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <DuplicateEventButton eventId={event.id} />
                      <Link
                        href={`/club/events/${event.id}/edit`}
                        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg transition-colors"
                      >
                        <Pencil size={12} />
                        Modifica
                      </Link>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-5 py-16 text-center">
                  <p className="text-slate-400 font-medium mb-1">Nessun evento in programma</p>
                  <p className="text-slate-500 text-xs mb-4">Crea il tuo primo evento per iniziare a vendere biglietti.</p>
                  <Link
                    href="/club/events/new"
                    className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                  >
                    <Plus size={14} />
                    Crea evento
                  </Link>
                </td>
              </tr>
            )}

            {/* ── Separatore eventi passati ── */}
            {pastEvents.length > 0 && (
              <>
                <tr>
                  <td colSpan={7} className="px-5 py-2.5 bg-white/3 border-y border-white/8">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Eventi passati
                    </span>
                  </td>
                </tr>

                {pastEvents.map((event, i) => (
                  <tr
                    key={event.id}
                    className={`border-b border-white/5 opacity-60 ${i === pastEvents.length - 1 ? 'border-b-0' : ''}`}
                  >
                    <td className="px-5 py-4 font-medium">
                      <Link href={`/club/events/${event.id}`} className="text-slate-300 hover:text-white transition-colors">
                        {event.name}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-slate-400">
                      {new Date(event.date).toLocaleDateString('it-IT')}
                    </td>
                    <td className="px-5 py-4 text-slate-400 hidden md:table-cell">{event.start_time}</td>
                    <td className="px-5 py-4 text-slate-400 hidden md:table-cell">
                      {event.tickets_sold}{event.capacity ? ` / ${event.capacity}` : ''}
                    </td>
                    <td className="px-5 py-4 font-semibold text-purple-400/70 hidden md:table-cell">
                      €{(revenueByEvent[event.id] ?? 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-slate-500/10 text-slate-500 border-slate-500/20">
                        Concluso
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-600 select-none">
                        <Lock size={11} />
                        Non modificabile
                      </span>
                    </td>
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
