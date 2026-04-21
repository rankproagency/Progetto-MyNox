'use client';

import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

interface Props {
  revenueByMonth: { mese: string; ricavi: number; commissioni: number }[];
  ticketsByClub: { club: string; biglietti: number; ricavi: number }[];
  topEvents: { name: string; club: string; biglietti: number; ricavi: number }[];
}

const tooltipStyle = {
  backgroundColor: '#111118',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  color: '#f8fafc',
  fontSize: 12,
};

const COLORS = ['#a855f7', '#818cf8', '#38bdf8', '#34d399', '#fb923c', '#f472b6'];

export default function AdminAnalyticsCharts({ revenueByMonth, ticketsByClub, topEvents }: Props) {
  return (
    <div className="space-y-6">
      {/* Ricavi e commissioni mensili */}
      <div className="bg-[#111118] border border-white/8 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-white mb-1">Ricavi piattaforma — ultimi 6 mesi</h2>
        <p className="text-xs text-slate-500 mb-6">Ricavi lordi e commissioni MyNox (8%)</p>
        {revenueByMonth.every((d) => d.ricavi === 0) ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={revenueByMonth} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="mese" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `€${v}`}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value, name) => [
                  `€${Number(value).toFixed(2)}`,
                  name === 'ricavi' ? 'Ricavi lordi' : 'Commissioni MyNox',
                ]}
              />
              <Line
                type="monotone"
                dataKey="ricavi"
                stroke="#a855f7"
                strokeWidth={2}
                dot={{ fill: '#a855f7', r: 4 }}
                activeDot={{ r: 5 }}
              />
              <Line
                type="monotone"
                dataKey="commissioni"
                stroke="#34d399"
                strokeWidth={2}
                strokeDasharray="4 2"
                dot={{ fill: '#34d399', r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Biglietti per discoteca */}
      <div className="bg-[#111118] border border-white/8 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-white mb-6">Biglietti venduti per discoteca</h2>
        {ticketsByClub.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ticketsByClub} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="club" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value, name) => [
                  name === 'biglietti' ? value : `€${Number(value).toFixed(2)}`,
                  name === 'biglietti' ? 'Biglietti' : 'Ricavi',
                ]}
              />
              <Bar dataKey="biglietti" radius={[4, 4, 0, 0]}>
                {ticketsByClub.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top 5 eventi */}
      <div className="bg-[#111118] border border-white/8 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-white/8">
          <h2 className="text-sm font-semibold text-white">Top eventi per ricavi</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8">
              <th className="text-left px-5 py-3 text-slate-400 font-medium">#</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Evento</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Discoteca</th>
              <th className="text-right px-5 py-3 text-slate-400 font-medium">Biglietti</th>
              <th className="text-right px-5 py-3 text-slate-400 font-medium">Ricavi</th>
              <th className="text-right px-5 py-3 text-slate-400 font-medium">Commissione</th>
            </tr>
          </thead>
          <tbody>
            {topEvents.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-slate-500">Nessun dato disponibile.</td>
              </tr>
            ) : topEvents.map((ev, i) => (
              <tr key={i} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                <td className="px-5 py-4 text-slate-500 font-mono text-xs">{i + 1}</td>
                <td className="px-5 py-4 text-white font-medium">{ev.name}</td>
                <td className="px-5 py-4 text-slate-300">{ev.club}</td>
                <td className="px-5 py-4 text-slate-300 text-right">{ev.biglietti}</td>
                <td className="px-5 py-4 text-purple-400 font-semibold text-right">
                  €{ev.ricavi.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-5 py-4 text-green-400 font-semibold text-right">
                  €{(ev.ricavi * 0.08).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="h-[240px] flex items-center justify-center text-slate-500 text-sm">
      Nessun dato disponibile ancora.
    </div>
  );
}
