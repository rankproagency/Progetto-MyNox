import { createClient } from '@/lib/supabase/server';
import type { Event } from '@/types';

export default async function AdminEventsPage() {
  const supabase = await createClient();
  const { data: events } = await supabase
    .from('events')
    .select('*, clubs(name)')
    .order('date', { ascending: false });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Eventi</h1>
        <p className="text-slate-400 mt-1">Tutti gli eventi presenti sulla piattaforma.</p>
      </div>

      <div className="bg-[#111118] border border-white/8 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8">
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Nome</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Discoteca</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Data</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Biglietti venduti</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Stato</th>
            </tr>
          </thead>
          <tbody>
            {events && events.length > 0 ? (
              events.map((event: Event & { clubs?: { name: string } }) => (
                <tr key={event.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="px-5 py-4 text-white font-medium">{event.name}</td>
                  <td className="px-5 py-4 text-slate-300">{event.clubs?.name ?? '—'}</td>
                  <td className="px-5 py-4 text-slate-300">
                    {new Date(event.date).toLocaleDateString('it-IT')} · {event.start_time}
                  </td>
                  <td className="px-5 py-4 text-slate-300">
                    {event.tickets_sold}
                    {event.capacity ? ` / ${event.capacity}` : ''}
                  </td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      event.is_published
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20'
                        : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                    }`}>
                      {event.is_published ? 'Pubblicato' : 'Bozza'}
                    </span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-5 py-12 text-center text-slate-500">
                  Nessun evento trovato.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
