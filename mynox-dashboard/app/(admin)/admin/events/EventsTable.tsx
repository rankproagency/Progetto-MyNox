'use client';

import { useState } from 'react';
import { Search, Building2, ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '@/components/providers/I18nProvider';

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

const PAGE_SIZE = 10;

export default function EventsTable({
  futureEvents,
  pastEvents,
  clubNames,
}: {
  futureEvents: Event[];
  pastEvents: Event[];
  clubNames: string[];
}) {
  const [tab, setTab] = useState<'future' | 'past'>('future');
  const [query, setQuery] = useState('');
  const [selectedClub, setSelectedClub] = useState('');
  const [page, setPage] = useState(1);
  const { t, lang } = useLanguage();
  const ae = t.adminEvents;
  const locale = lang === 'en' ? 'en-US' : 'it-IT';

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

  const totalPages = tab === 'past' ? Math.max(1, Math.ceil(filteredPast.length / PAGE_SIZE)) : 1;
  const pagedPast = filteredPast.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const displayList = tab === 'future' ? filteredFuture : pagedPast;

  function handleTabChange(tab: 'future' | 'past') {
    setTab(tab);
    setPage(1);
  }

  function handleFilterChange(fn: () => void) {
    fn();
    setPage(1);
  }

  return (
    <div>
      {/* Barra filtri */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <input
            type="text"
            placeholder={ae.searchPlaceholder}
            value={query}
            onChange={(e) => handleFilterChange(() => setQuery(e.target.value))}
            className="w-full bg-[#111118] border border-white/8 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-colors"
          />
        </div>
        <div className="relative">
          <Building2 size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
          <select
            value={selectedClub}
            onChange={(e) => handleFilterChange(() => setSelectedClub(e.target.value))}
            className="bg-[#111118] border border-white/8 rounded-xl pl-9 pr-8 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors appearance-none cursor-pointer min-w-44"
          >
            <option value="">{ae.allClubs}</option>
            {clubNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tab */}
      <div className="flex items-center gap-1 mb-4 bg-[#111118] border border-white/8 rounded-xl p-1 w-fit">
        {([
          { key: 'future', label: ae.tabFuture, count: filteredFuture.length },
          { key: 'past',   label: ae.tabPast,   count: filteredPast.length },
        ] as const).map(({ key, label, count }) => (
          <button
            key={key}
            onClick={() => handleTabChange(key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              tab === key
                ? 'bg-white/8 text-white'
                : 'text-slate-400 hover:text-slate-200'
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

      {/* Tabella */}
      <div className="bg-[#111118] border border-white/8 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8">
              <th className="text-left px-5 py-3 text-slate-400 font-medium">{ae.colName}</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium hidden md:table-cell">{ae.colClub}</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">{ae.colDate}</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium hidden md:table-cell">{ae.colTickets}</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium hidden md:table-cell">{ae.colRevenue}</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">{ae.colStatus}</th>
            </tr>
          </thead>
          <tbody>
            {displayList.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
                  {q || selectedClub ? ae.noFilter : tab === 'future' ? ae.noFuture : ae.noPast}
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
                  <td className={`px-5 py-4 font-medium ${isPast ? 'text-slate-300' : 'text-white'}`}>{event.name}</td>
                  <td className={`px-5 py-4 hidden md:table-cell ${isPast ? 'text-slate-400' : 'text-slate-300'}`}>{event.clubName}</td>
                  <td className={`px-5 py-4 whitespace-nowrap ${isPast ? 'text-slate-400' : 'text-slate-300'}`}>
                    {new Date(event.date).toLocaleDateString(locale)} · {event.start_time}
                  </td>
                  <td className={`px-5 py-4 hidden md:table-cell ${isPast ? 'text-slate-400' : 'text-slate-300'}`}>
                    {event.tickets_sold}{event.capacity ? ` / ${event.capacity}` : ''}
                  </td>
                  <td className={`px-5 py-4 font-semibold hidden md:table-cell ${isPast ? 'text-purple-400/70' : 'text-purple-400'}`}>
                    €{event.revenue.toLocaleString(locale, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-4">
                    {isPast ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-slate-500/10 text-slate-500 border-slate-500/20">
                        {ae.concluded}
                      </span>
                    ) : (
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                        event.is_published
                          ? 'bg-green-500/10 text-green-400 border-green-500/20'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                      }`}>
                        {event.is_published ? t.common.published : t.common.draft}
                      </span>
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
              {ae.pagination
                .replace('{from}', String((page - 1) * PAGE_SIZE + 1))
                .replace('{to}', String(Math.min(page * PAGE_SIZE, filteredPast.length)))
                .replace('{total}', String(filteredPast.length))}
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
