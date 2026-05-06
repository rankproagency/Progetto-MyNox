'use client';

import { useState } from 'react';
import { Search, Building2 } from 'lucide-react';

type Event = {
  id: string;
  name: string;
  date: string;
  start_time: string;
  tickets_sold: number;
  capacity: number | null;
  is_published: boolean;
  clubName: string;
  revenue: number;
};

export default function EventsTable({
  futureEvents,
  pastEvents,
  clubNames,
}: {
  futureEvents: Event[];
  pastEvents: Event[];
  clubNames: string[];
}) {
  const [query, setQuery] = useState('');
  const [selectedClub, setSelectedClub] = useState('');

  const q = query.trim().toLowerCase();

  function filter(events: Event[]) {
    return events.filter((e) => {
      const matchesQuery = !q || e.name.toLowerCase().includes(q) || e.clubName.toLowerCase().includes(q);
      const matchesClub = !selectedClub || e.clubName === selectedClub;
      return matchesQuery && matchesClub;
    });
  }

  const filteredFuture = filter(futureEvents);
  const filteredPast = filter(pastEvents);
  const empty = filteredFuture.length === 0 && filteredPast.length === 0;

  return (
    <div>
      {/* Barra filtri */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Cerca per nome evento…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-[#111118] border border-white/8 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-colors"
          />
        </div>
        <div className="relative">
          <Building2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <select
            value={selectedClub}
            onChange={(e) => setSelectedClub(e.target.value)}
            className="bg-[#111118] border border-white/8 rounded-xl pl-9 pr-8 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors appearance-none cursor-pointer min-w-44"
          >
            <option value="">Tutte le discoteche</option>
            {clubNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabella */}
      <div className="bg-[#111118] border border-white/8 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8">
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Nome</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium hidden md:table-cell">Discoteca</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Data</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium hidden md:table-cell">Biglietti</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium hidden md:table-cell">Ricavi</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Stato</th>
            </tr>
          </thead>
          <tbody>
            {empty ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                  {q || selectedClub ? 'Nessun evento corrisponde ai filtri.' : 'Nessun evento trovato.'}
                </td>
              </tr>
            ) : null}

            {/* Futuri */}
            {filteredFuture.map((event) => (
              <tr key={event.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                <td className="px-5 py-4 text-white font-medium">{event.name}</td>
                <td className="px-5 py-4 text-slate-300 hidden md:table-cell">{event.clubName}</td>
                <td className="px-5 py-4 text-slate-300 whitespace-nowrap">
                  {new Date(event.date).toLocaleDateString('it-IT')} · {event.start_time}
                </td>
                <td className="px-5 py-4 text-slate-300 hidden md:table-cell">
                  {event.tickets_sold}{event.capacity ? ` / ${event.capacity}` : ''}
                </td>
                <td className="px-5 py-4 font-semibold text-purple-400 hidden md:table-cell">
                  €{event.revenue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-5 py-4">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                    event.is_published
                      ? 'bg-green-500/10 text-green-400 border-green-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}>
                    {event.is_published ? 'Pubblicato' : 'Bozza'}
                  </span>
                </td>
              </tr>
            ))}

            {/* Separatore passati */}
            {filteredPast.length > 0 && (
              <>
                <tr>
                  <td colSpan={6} className="px-5 py-2.5 bg-white/3 border-y border-white/8">
                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Eventi passati
                    </span>
                  </td>
                </tr>
                {filteredPast.map((event, i) => (
                  <tr key={event.id} className={`border-b border-white/5 opacity-55 ${i === filteredPast.length - 1 ? 'border-b-0' : ''}`}>
                    <td className="px-5 py-4 text-slate-300 font-medium">{event.name}</td>
                    <td className="px-5 py-4 text-slate-400 hidden md:table-cell">{event.clubName}</td>
                    <td className="px-5 py-4 text-slate-400 whitespace-nowrap">
                      {new Date(event.date).toLocaleDateString('it-IT')} · {event.start_time}
                    </td>
                    <td className="px-5 py-4 text-slate-400 hidden md:table-cell">
                      {event.tickets_sold}{event.capacity ? ` / ${event.capacity}` : ''}
                    </td>
                    <td className="px-5 py-4 font-semibold text-purple-400/70 hidden md:table-cell">
                      €{event.revenue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-slate-500/10 text-slate-500 border-slate-500/20">
                        Concluso
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
