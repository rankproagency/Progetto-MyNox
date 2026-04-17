import Link from 'next/link';
import { getProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { Plus, Pencil } from 'lucide-react';

export default async function ClubEventsPage() {
  const profile = await getProfile();
  if (!profile?.club_id) return <p className="text-slate-400">Club non configurato. Contatta l&apos;amministratore.</p>;

  const supabase = await createClient();
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
      .select('event_id, ticket_types(price)')
      .in('event_id', eventIds)
      .in('status', ['valid', 'used']);

    for (const t of ticketRevenue ?? []) {
      const id = (t as any).event_id;
      const price = (t as any).ticket_types?.price ?? 0;
      revenueByEvent[id] = (revenueByEvent[id] ?? 0) + price;
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
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
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Orario</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Biglietti</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Ricavi</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Stato</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {events && events.length > 0 ? (
              events.map((event) => (
                <tr key={event.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="px-5 py-4 text-white font-medium">{event.name}</td>
                  <td className="px-5 py-4 text-slate-300">
                    {new Date(event.date).toLocaleDateString('it-IT')}
                  </td>
                  <td className="px-5 py-4 text-slate-300">{event.start_time}</td>
                  <td className="px-5 py-4 text-slate-300">
                    {event.tickets_sold}{event.capacity ? ` / ${event.capacity}` : ''}
                  </td>
                  <td className="px-5 py-4 font-semibold text-purple-400">
                    €{(revenueByEvent[event.id] ?? 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      event.is_published
                        ? 'bg-green-500/10 text-green-400 border-green-500/20'
                        : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                    }`}>
                      {event.is_published ? 'Pubblicato' : 'Bozza'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <Link
                      href={`/club/events/${event.id}/edit`}
                      className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg transition-colors"
                    >
                      <Pencil size={12} />
                      Modifica
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-5 py-16 text-center">
                  <p className="text-slate-400 font-medium mb-1">Nessun evento ancora</p>
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
          </tbody>
        </table>
      </div>
    </div>
  );
}
