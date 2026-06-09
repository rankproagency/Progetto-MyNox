'use client';

import { useState, useMemo, useTransition, useCallback } from 'react';
import { Search, Download, Copy, Check, ChevronLeft, ChevronRight } from 'lucide-react';
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

const PAGE_SIZE = 50;

export default function CrmTable({ contacts, events }: CrmTableProps) {
  const { t, lang } = useLanguage();
  const crm = t.clubCrm;
  const locale = lang === 'en' ? 'en-US' : 'it-IT';

  const [query, setQuery] = useState('');
  const [eventFilter, setEventFilter] = useState('');
  const [page, setPage] = useState(1);
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();

  // Filtra
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return contacts.filter((c) => {
      if (eventFilter && c.events.id !== eventFilter) return false;
      if (q && !c.profiles.name.toLowerCase().includes(q) && !c.profiles.email.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [contacts, query, eventFilter]);

  // Deduplica per profilo
  const unique = useMemo(() => {
    const seen = new Set<string>();
    return filtered.filter((c) => {
      if (seen.has(c.profiles.id)) return false;
      seen.add(c.profiles.id);
      return true;
    });
  }, [filtered]);

  const totalPages = Math.max(1, Math.ceil(unique.length / PAGE_SIZE));
  const paginated = unique.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleFilterChange(fn: () => void) {
    startTransition(() => { fn(); setPage(1); });
  }

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

  const copyEmails = useCallback(() => {
    const emails = unique.map((c) => c.profiles.email).join(', ');
    navigator.clipboard.writeText(emails).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [unique]);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            <input
              type="text"
              placeholder={crm.search}
              value={query}
              onChange={(e) => handleFilterChange(() => setQuery(e.target.value))}
              className="w-full bg-[#111118] border border-white/8 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-colors"
            />
          </div>
          <select
            value={eventFilter}
            onChange={(e) => handleFilterChange(() => setEventFilter(e.target.value))}
            className="bg-[#111118] border border-white/8 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-colors"
          >
            <option value="">{crm.allEvents}</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 mr-1">
            {crm.total.replace('{n}', String(unique.length))}
          </span>
          <button
            onClick={copyEmails}
            disabled={unique.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 hover:border-purple-500/50 bg-white/3 hover:bg-white/6 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-all"
          >
            {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
            {copied ? (crm.emailsCopied ?? 'Copiate!') : (crm.copyEmails ?? 'Copia email')}
          </button>
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
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-16 text-center">
                  <p className="text-slate-400 font-medium mb-1">{crm.noData}</p>
                  <p className="text-slate-600 text-xs">{crm.noDataHint}</p>
                </td>
              </tr>
            ) : paginated.map((c, i) => (
              <tr
                key={c.id}
                className={`border-b border-white/5 hover:bg-white/3 transition-colors ${i === paginated.length - 1 ? 'border-b-0' : ''}`}
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

      {/* Paginazione */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-slate-400">
          <span>
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, unique.length)} di {unique.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-white/6 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 py-1 rounded-lg bg-white/5 text-white font-medium">
              {page} / {totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg hover:bg-white/6 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
