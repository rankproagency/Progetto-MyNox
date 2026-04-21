'use client';

import { Download } from 'lucide-react';

interface Participant {
  name: string;
  email: string;
  ticketType: string;
  quantity: number;
  total: number;
  purchasedAt: string;
  status: string;
}

interface Props {
  participants: Participant[];
  eventName: string;
}

export default function ParticipantsTable({ participants, eventName }: Props) {
  function exportCSV() {
    const header = ['Nome', 'Email', 'Tipo biglietto', 'Quantità', 'Totale (€)', 'Data acquisto', 'Stato'];
    const rows = participants.map((p) => [
      p.name,
      p.email,
      p.ticketType,
      p.quantity,
      p.total.toFixed(2),
      new Date(p.purchasedAt).toLocaleDateString('it-IT'),
      p.status,
    ]);
    const csv = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `partecipanti-${eventName.replace(/\s+/g, '-').toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (participants.length === 0) {
    return (
      <p className="text-slate-500 text-sm py-6 text-center">Nessun biglietto venduto ancora.</p>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-400">{participants.length} acquisti</p>
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Download size={12} />
          Esporta CSV
        </button>
      </div>
      <div className="bg-[#111118] border border-white/8 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8">
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Nome</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Email</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Tipo</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Qtà</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Totale</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Data</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Stato</th>
            </tr>
          </thead>
          <tbody>
            {participants.map((p, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/3 transition-colors last:border-b-0">
                <td className="px-5 py-3 text-white font-medium">{p.name}</td>
                <td className="px-5 py-3 text-slate-400">{p.email}</td>
                <td className="px-5 py-3 text-slate-300">{p.ticketType}</td>
                <td className="px-5 py-3 text-slate-300">{p.quantity}</td>
                <td className="px-5 py-3 text-purple-400 font-semibold">€{p.total.toFixed(2)}</td>
                <td className="px-5 py-3 text-slate-400">
                  {new Date(p.purchasedAt).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                </td>
                <td className="px-5 py-3">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                    p.status === 'used'
                      ? 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                      : 'bg-green-500/10 text-green-400 border-green-500/20'
                  }`}>
                    {p.status === 'used' ? 'Usato' : 'Valido'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
