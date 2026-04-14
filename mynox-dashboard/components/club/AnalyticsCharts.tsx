'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';

interface Props {
  salesByEvent: { name: string; venduti: number; capacita: number }[];
  revenueData: { mese: string; ricavi: number }[];
}

const tooltipStyle = {
  backgroundColor: '#111118',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  color: '#f8fafc',
  fontSize: 12,
};

export default function AnalyticsCharts({ salesByEvent, revenueData }: Props) {
  return (
    <div className="space-y-6">
      {/* Ricavi per mese */}
      <div className="bg-[#111118] border border-white/8 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-white mb-6">Ricavi mensili (ultimi 6 mesi)</h2>
        {revenueData.every((d) => d.ricavi === 0) ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={revenueData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
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
                formatter={(value) => [`€${Number(value).toFixed(2)}`, 'Ricavi']}
              />
              <Line
                type="monotone"
                dataKey="ricavi"
                stroke="#a855f7"
                strokeWidth={2}
                dot={{ fill: '#a855f7', r: 4 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Biglietti per evento */}
      <div className="bg-[#111118] border border-white/8 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-white mb-6">Biglietti venduti per evento</h2>
        {salesByEvent.length === 0 ? (
          <EmptyChart />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={salesByEvent} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="venduti" name="Venduti" fill="#a855f7" radius={[4, 4, 0, 0]} />
              <Bar dataKey="capacita" name="Capacità" fill="rgba(168,85,247,0.2)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="h-[220px] flex items-center justify-center text-slate-500 text-sm">
      Nessun dato disponibile ancora.
    </div>
  );
}
