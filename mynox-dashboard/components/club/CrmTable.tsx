'use client';

import { useState, useMemo } from 'react';
import { Search, Download } from 'lucide-react';
import { useLanguage } from '@/components/providers/I18nProvider';

type Contact = {
  id: string;
  created_at: string;
  profiles: { id: string; name: string; email: string; marketing_consent: boolean };
  events: { id: string; name: string; date: string };
};

type Event = { id: string; name: string };

interface CrmTableProps {
  contacts: Contact[];
  events: Event[];
}

export default function CrmTable({ contacts, events }: CrmTableProps) {
  const { t, lang } = useLanguage();
  const crm = t.clubCrm;
  const locale = lang === 'en' ? 'en-US' : 'it-IT';

  const [query, setQuery] = useState('');
  const [eventFilter, setEventFilter] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contacts.filter((c) => {
      if (eventFilter && c.events.id !== eventFilter) return false;
      if (q && !c.profiles.name.toLowerCase().includes(q) && !c.profiles.email.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [contacts, query, eventFilter]);

  // Deduplica: un contatto per profilo (prende il più recente)
  const unique = useMemo(() => {
    const seen = new Set<string>();
    return filtered.filter((c) => {
      if (seen.has(c.profiles.id)) return false;
      seen.add(c.profiles.id);
      return true;
    });
  }, [filtered]);

  function exportCsv() {
    const rows = [
      [crm.colName, crm.colEmail, crm.colEvent, crm.colDate],
      ...unique.map((c) => [
        c.profiles.name,
        c.profiles.email,
        c.events.name,
        new Date(c.created_at).toLocaleDateString(locale),
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'crm-clienti.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder={crm.search}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-[#111118] border border-white/8 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-colors"
            />
          </div>

          {/* Event filter */}
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className="bg-[#111118] border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors"
          >
            <option value="">{crm.allEvents}</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500">
            {crm.total.replace('{n}', String(unique.length))}
          </span>
          <button
            onClick={exportCsv}
            disabled={unique.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            <Download size={14} />
            {crm.exportCsv}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#111118] border border-white/8 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8">
              <th className="text-left px-5 py-3 text-slate-400 font-medium">{crm.colName}</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">{crm.colEmail}</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium hidden md:table-cell">{crm.colEvent}</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium hidden md:table-cell">{crm.colDate}</th>
            </tr>
          </thead>
          <tbody>
            {unique.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-16 text-center">
                  <p className="text-slate-400 font-medium mb-1">{crm.noData}</p>
                  <p className="text-slate-600 text-xs">{crm.noDataHint}</p>
                </td>
              </tr>
            ) : unique.map((c, i) => (
              <tr
                key={c.id}
                className={`border-b border-white/5 hover:bg-white/3 transition-colors ${i === unique.length - 1 ? 'border-b-0' : ''}`}
              >
                <td className="px-5 py-4 text-white font-medium">{c.profiles.name}</td>
                <td className="px-5 py-4 text-slate-300">{c.profiles.email}</td>
                <td className="px-5 py-4 text-slate-400 hidden md:table-cell">{c.events.name}</td>
                <td className="px-5 py-4 text-slate-400 hidden md:table-cell">
                  {new Date(c.created_at).toLocaleDateString(locale)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
