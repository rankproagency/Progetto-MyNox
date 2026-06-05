'use client';

import { Download } from 'lucide-react';
import { useLanguage } from '@/components/providers/I18nProvider';

interface Participant {
  id: string;
  name: string;
  email: string;
  ticketLabel: string;
  price: number;
  status: string;
  drinkUsed: boolean;
  createdAt: string;
}

export default function ParticipantsTable({ participants, eventName }: { participants: Participant[]; eventName: string }) {
  const { t } = useLanguage();
  const pt = t.participantsTable;

  function exportCSV() {
    const header = [pt.colName, pt.colEmail, pt.colTicketType, pt.colPrice, pt.colStatus, pt.colDrink, pt.colPurchased];
    const rows = participants.map((p) => [
      p.name,
      p.email,
      p.ticketLabel,
      `€${p.price.toFixed(2)}`,
      p.status === 'valid' ? pt.valid : p.status === 'used' ? pt.used : p.status === 'denied' ? pt.denied : p.status,
      p.drinkUsed ? pt.yes : pt.no,
      new Date(p.createdAt).toLocaleDateString(),
    ]);
    const csv = [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `partecipanti-${eventName.replace(/\s+/g, '-').toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const statusStyle: Record<string, string> = {
    valid:  'bg-green-500/10 text-green-400 border-green-500/20',
    used:   'bg-blue-500/10 text-blue-400 border-blue-500/20',
    denied: 'bg-red-500/10 text-red-400 border-red-500/20',
    pending:'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };
  const statusLabel: Record<string, string> = {
    valid: pt.valid, used: pt.used, denied: pt.denied, pending: 'pending',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white">
          {pt.title} <span className="text-slate-500 font-normal text-base">({participants.length})</span>
        </h2>
        {participants.length > 0 && (
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 text-sm text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-lg transition-colors"
          >
            <Download size={14} />
            {pt.exportCSV}
          </button>
        )}
      </div>

      {participants.length === 0 ? (
        <div className="bg-[#111118] border border-white/8 rounded-xl p-10 text-center text-slate-500 text-sm">
          {pt.noTickets}
        </div>
      ) : (
        <div className="bg-[#111118] border border-white/8 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8">
                <th className="text-left px-5 py-3 text-slate-400 font-medium">{pt.colName}</th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">{pt.colEmail}</th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">{pt.colTicketType}</th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">{pt.colPrice}</th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">{pt.colStatus}</th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">{pt.colDrink}</th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">{pt.colPurchased}</th>
              </tr>
            </thead>
            <tbody>
              {participants.map((p, i) => (
                <tr key={p.id} className={`hover:bg-white/3 transition-colors ${i < participants.length - 1 ? 'border-b border-white/5' : ''}`}>
                  <td className="px-5 py-3.5 text-white font-medium">{p.name}</td>
                  <td className="px-5 py-3.5 text-slate-400 text-xs">{p.email}</td>
                  <td className="px-5 py-3.5 text-slate-300">{p.ticketLabel}</td>
                  <td className="px-5 py-3.5 text-purple-400 font-medium">€{p.price.toFixed(2)}</td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusStyle[p.status] ?? statusStyle.pending}`}>
                      {statusLabel[p.status] ?? p.status}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-400 text-xs">{p.drinkUsed ? pt.drinkUsed : '—'}</td>
                  <td className="px-5 py-3.5 text-slate-500 text-xs">
                    {new Date(p.createdAt).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
