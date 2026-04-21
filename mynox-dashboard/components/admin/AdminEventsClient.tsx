'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Event } from '@/types';

interface EventWithClub extends Event {
  clubs?: { name: string };
}

export default function AdminEventsClient({ events: initial }: { events: EventWithClub[] }) {
  const [events, setEvents] = useState(initial);
  const [toggling, setToggling] = useState<string | null>(null);

  async function togglePublish(event: EventWithClub) {
    setToggling(event.id);
    const supabase = createClient();
    const newVal = !event.is_published;
    const { error } = await supabase.from('events').update({ is_published: newVal }).eq('id', event.id);
    if (!error) {
      setEvents((prev) => prev.map((e) => e.id === event.id ? { ...e, is_published: newVal } : e));
    }
    setToggling(null);
  }

  return (
    <div className="bg-[#111118] border border-white/8 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-white/8">
            <th className="text-left px-5 py-3 text-slate-400 font-medium">Nome</th>
            <th className="text-left px-5 py-3 text-slate-400 font-medium">Discoteca</th>
            <th className="text-left px-5 py-3 text-slate-400 font-medium">Data</th>
            <th className="text-left px-5 py-3 text-slate-400 font-medium">Biglietti venduti</th>
            <th className="text-left px-5 py-3 text-slate-400 font-medium">Stato</th>
            <th className="px-5 py-3" />
          </tr>
        </thead>
        <tbody>
          {events.length > 0 ? (
            events.map((event) => (
              <tr key={event.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                <td className="px-5 py-4 text-white font-medium">{event.name}</td>
                <td className="px-5 py-4 text-slate-300">{event.clubs?.name ?? '—'}</td>
                <td className="px-5 py-4 text-slate-300">
                  {new Date(event.date).toLocaleDateString('it-IT')} · {event.start_time}
                </td>
                <td className="px-5 py-4 text-slate-300">
                  {event.tickets_sold}{event.capacity ? ` / ${event.capacity}` : ''}
                </td>
                <td className="px-5 py-4">
                  <button
                    onClick={() => togglePublish(event)}
                    disabled={toggling === event.id}
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                      event.is_published
                        ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
                        : 'bg-slate-500/10 text-slate-400 border-slate-500/20 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/20'
                    } ${toggling === event.id ? 'opacity-50' : ''}`}
                    title={event.is_published ? 'Clicca per mettere in bozza' : 'Clicca per pubblicare'}
                  >
                    {toggling === event.id ? '...' : event.is_published ? 'Pubblicato' : 'Bozza'}
                  </button>
                </td>
                <td className="px-5 py-4 text-right text-xs text-slate-500 font-mono select-all">
                  {event.id.slice(0, 8)}…
                </td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                Nessun evento trovato.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
