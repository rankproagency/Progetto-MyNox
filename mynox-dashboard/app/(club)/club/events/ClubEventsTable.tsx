'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Search, Pencil, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import PublishToggle from '@/components/club/PublishToggle';
import DuplicateEventButton from '@/components/club/DuplicateEventButton';

type Event = {
  id: string;
  name: string;
  date: string;
  start_time: string;
  tickets_sold: number;
  capacity: number | null;
  is_published: boolean;
  revenue: number;
};

const PAGE_SIZE = 10;

export default function ClubEventsTable({
  futureEvents,
  pastEvents,
}: {
  futureEvents: Event[];
  pastEvents: Event[];
}) {
  const [tab, setTab] = useState<'future' | 'past'>('future');
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);

  const q = query.trim().toLowerCase();

  function filter(events: Event[]) {
    return events.filter((e) => !q || e.name.toLowerCase().includes(q));
  }

  const filteredFuture = filter(futureEvents);
  const filteredPast = filter(pastEvents);

  const totalPages = tab === 'past' ? Math.max(1, Math.ceil(filteredPast.length / PAGE_SIZE)) : 1;
  const pagedPast = filteredPast.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const displayList = tab === 'future' ? filteredFuture : pagedPast;

  function handleTabChange(t: 'future' | 'past') {
    setTab(t);
    setPage(1);
  }

  function handleQueryChange(v: string) {
    setQuery(v);
    setPage(1);
  }

  return (
    <div>
      {/* Search */}
      <div className="relative mb-4">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
        <input
          type="text"
          placeholder="Cerca per nome evento…"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          className="w-full bg-[#111118] border border-white/8 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-colors"
        />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 bg-[#111118] border border-white/8 rounded-xl p-1 w-fit">
        {([
          { key: 'future', label: 'Futuri', count: filteredFuture.length },
          { key: 'past',   label: 'Passati', count: filteredPast.length },
        ] as const).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key ? 'bg-white/8 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
              tab === key ? 'bg-purple-500/20 text-purple-300' : 'bg-white/5 text-slate-500'
            }`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-[#111118] border border-white/8 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8">
              <th className="text-left px-3 md:px-5 py-3 text-slate-400 font-medium">Nome</th>
              <th className="text-left px-3 md:px-5 py-3 text-slate-400 font-medium">Data</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium hidden md:table-cell">Biglietti</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium hidden md:table-cell">Ricavi</th>
              <th className="text-left px-3 md:px-5 py-3 text-slate-400 font-medium">Stato</th>
              <th className="px-3 md:px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {displayList.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                  {q
                    ? 'Nessun evento corrisponde alla ricerca.'
                    : tab === 'future'
                      ? (
                        <div>
                          <p className="font-medium text-slate-400 mb-1">Nessun evento in programma</p>
                          <p className="text-xs mb-4">Crea il tuo primo evento per iniziare a vendere biglietti.</p>
                          <Link
                            href="/club/events/new"
                            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
                          >
                            <Plus size={14} />
                            Crea evento
                          </Link>
                        </div>
                      )
                      : 'Nessun evento passato.'}
                </td>
              </tr>
            ) : displayList.map((event, i) => {
              const isPast = tab === 'past';
              return (
                <tr
                  key={event.id}
                  className={`border-b border-white/5 transition-colors ${
                    i === displayList.length - 1 ? 'border-b-0' : ''
                  } ${isPast ? 'opacity-60 hover:opacity-80' : 'hover:bg-white/3'}`}
                >
                  <td className={`px-3 md:px-5 py-4 font-medium ${isPast ? 'text-slate-300' : ''}`}>
                    <Link
                      href={`/club/events/${event.id}`}
                      className={`transition-colors ${isPast ? 'text-slate-300 hover:text-white' : 'text-white hover:text-purple-400'}`}
                    >
                      {event.name}
                    </Link>
                  </td>
                  <td className={`px-3 md:px-5 py-4 whitespace-nowrap ${isPast ? 'text-slate-400' : 'text-slate-300'}`}>
                    {new Date(event.date).toLocaleDateString('it-IT')} · {event.start_time}
                  </td>
                  <td className={`px-5 py-4 hidden md:table-cell ${isPast ? 'text-slate-400' : 'text-slate-300'}`}>
                    {event.tickets_sold}{event.capacity != null ? ` / ${event.capacity}` : ''}
                  </td>
                  <td className={`px-5 py-4 font-semibold hidden md:table-cell ${isPast ? 'text-purple-400/70' : 'text-purple-400'}`}>
                    €{event.revenue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-3 md:px-5 py-4">
                    {isPast ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-slate-500/10 text-slate-500 border-slate-500/20">
                        Concluso
                      </span>
                    ) : (
                      <PublishToggle eventId={event.id} isPublished={event.is_published} />
                    )}
                  </td>
                  <td className="px-3 py-4 text-right">
                    {isPast ? (
                      <span className="text-xs text-slate-600 select-none">—</span>
                    ) : (
                      <div className="flex items-center justify-end gap-2">
                        <span className="hidden md:block">
                          <DuplicateEventButton eventId={event.id} />
                        </span>
                        <Link
                          href={`/club/events/${event.id}/edit`}
                          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-2 md:px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Pencil size={12} />
                          <span className="hidden md:inline">Modifica</span>
                        </Link>
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Paginazione — solo tab passati */}
        {tab === 'past' && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/8">
            <p className="text-xs text-slate-500">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredPast.length)} di {filteredPast.length} eventi
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-7 h-7 rounded-lg text-xs font-medium transition-colors ${
                    p === page ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {p}
                </button>
              ))}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
