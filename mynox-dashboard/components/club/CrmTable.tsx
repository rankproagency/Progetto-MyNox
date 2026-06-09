'use client';

import { useCallback, useTransition, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { Search, Download, Copy, Check, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { useLanguage } from '@/components/providers/I18nProvider';
import { getAllCrmEmails } from '@/app/(club)/club/crm/actions';

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
  totalCount: number;
  totalPages: number;
  currentPage: number;
  currentQuery: string;
  currentEvent: string;
}

export default function CrmTable({
  contacts, events, totalCount, totalPages, currentPage, currentQuery, currentEvent,
}: CrmTableProps) {
  const { t, lang } = useLanguage();
  const crm = t.clubCrm;
  const locale = lang === 'en' ? 'en-US' : 'it-IT';
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [copyLoading, setCopyLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function navigate(overrides: Record<string, string>) {
    const params = new URLSearchParams();
    const merged = { query: currentQuery, event: currentEvent, page: String(currentPage), ...overrides };
    if (merged.query) params.set('query', merged.query);
    if (merged.event) params.set('event', merged.event);
    if (merged.page && merged.page !== '1') params.set('page', merged.page);
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  function onSearchChange(value: string) {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => navigate({ query: value, page: '1' }), 400);
  }

  function exportCsv() {
    const rows = [
      [crm.colName, crm.colEmail, crm.colEvent, crm.colDate],
      ...contacts.map((c) => [
        c.profiles.name, c.profiles.email, c.events.name,
        new Date(c.created_at).toLocaleDateString(locale),
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'crm-clienti.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  const copyEmails = useCallback(async () => {
    setCopyLoading(true);
    try {
      const emails = await getAllCrmEmails(currentQuery, currentEvent);
      await navigator.clipboard.writeText(emails.join(', '));
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } finally {
      setCopyLoading(false);
    }
  }, [currentQuery, currentEvent]);

  const from = (currentPage - 1) * 50 + 1;
  const to = Math.min(currentPage * 50, totalCount);

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
            {isPending && (
              <Loader2 size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-purple-400 animate-spin" />
            )}
            <input
              type="text"
              placeholder={crm.search}
              defaultValue={currentQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-full bg-[#111118] border border-white/8 rounded-xl pl-9 pr-9 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/50 transition-colors"
            />
          </div>
          <select
            value={currentEvent}
            onChange={(e) => navigate({ event: e.target.value, page: '1' })}
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
            {crm.total.replace('{n}', String(totalCount))}
          </span>
          <button
            onClick={copyEmails}
            disabled={totalCount === 0 || copyLoading}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10 hover:border-purple-500/50 bg-white/3 hover:bg-white/6 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-all"
          >
            {copyLoading
              ? <Loader2 size={14} className="animate-spin" />
              : copied
              ? <Check size={14} className="text-green-400" />
              : <Copy size={14} />}
            {copied ? (crm.emailsCopied ?? '✓ Copiate!') : (crm.copyEmails ?? 'Copia email')}
          </button>
          <button
            onClick={exportCsv}
            disabled={contacts.length === 0}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors"
          >
            <Download size={14} />
            {crm.exportCsv}
          </button>
        </div>
      </div>

      {/* Table */}
      <div className={`bg-[#111118] border border-white/8 rounded-xl overflow-hidden transition-opacity ${isPending ? 'opacity-60' : ''}`}>
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
            {contacts.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-16 text-center">
                  <p className="text-slate-400 font-medium mb-1">{crm.noData}</p>
                  <p className="text-slate-600 text-xs">{crm.noDataHint}</p>
                </td>
              </tr>
            ) : contacts.map((c, i) => (
              <tr
                key={c.id}
                className={`border-b border-white/5 hover:bg-white/3 transition-colors ${i === contacts.length - 1 ? 'border-b-0' : ''}`}
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
          <span>{from}–{to} di {totalCount}</span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => navigate({ page: String(currentPage - 1) })}
              disabled={currentPage === 1 || isPending}
              className="p-1.5 rounded-lg hover:bg-white/6 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <span className="px-3 py-1 rounded-lg bg-white/5 text-white font-medium">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => navigate({ page: String(currentPage + 1) })}
              disabled={currentPage === totalPages || isPending}
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
