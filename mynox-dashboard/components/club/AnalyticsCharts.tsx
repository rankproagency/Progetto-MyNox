'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line,
} from 'recharts';
import { useLanguage } from '@/components/providers/I18nProvider';

const GENDER_LABELS: Record<string, string> = {
  donna: 'Donna',
  uomo: 'Uomo',
  'non-binary': 'Non-binary',
  'non-specificato': 'Non specificato',
};

const GENDER_COLORS: Record<string, string> = {
  donna: '#a855f7',
  uomo: '#7c3aed',
  'non-binary': '#6366f1',
  'non-specificato': '#475569',
};

interface Props {
  salesByEvent: { name: string; venduti: number; capacita: number }[];
  revenueData: { mese: string; ricavi: number }[] | null;
  tablesByEvent: { name: string; prenotati: number; disponibili: number }[];
  genderData: { gender: string; count: number; percentage: number }[];
}

const tooltipStyle = {
  backgroundColor: '#111118',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  color: '#f8fafc',
  fontSize: 12,
};

export default function AnalyticsCharts({ salesByEvent, revenueData, tablesByEvent, genderData }: Props) {
  const { t } = useLanguage();
  return (
    <div className="space-y-6">
      {/* Ricavi per mese — solo con permesso */}
      {revenueData !== null && (
        <div className="bg-[#111118] border border-white/8 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white mb-6">{t.analyticsCharts.monthlyRevenue}</h2>
          {revenueData.every((d) => d.ricavi === 0) ? (
            <EmptyChart label={t.analyticsCharts.noData} />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={revenueData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="mese" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `€${v}`} />
                <Tooltip contentStyle={tooltipStyle} formatter={(value) => [`€${Number(value).toFixed(2)}`, t.analyticsCharts.monthlyRevenue]} />
                <Line type="monotone" dataKey="ricavi" stroke="#a855f7" strokeWidth={2} dot={{ fill: '#a855f7', r: 4 }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      )}

      {/* Biglietti per evento */}
      <div className="bg-[#111118] border border-white/8 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-white mb-6">{t.analyticsCharts.ticketsByEvent}</h2>
        {salesByEvent.length === 0 ? (
          <EmptyChart label={t.analyticsCharts.noData} />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={salesByEvent} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="venduti" name={t.analyticsCharts.sold} fill="#a855f7" radius={[4, 4, 0, 0]} />
              <Bar dataKey="capacita" name={t.analyticsCharts.capacity} fill="rgba(168,85,247,0.2)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
      {/* Tavoli per evento */}
      <div className="bg-[#111118] border border-white/8 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-white mb-6">{t.analyticsCharts.tablesByEvent}</h2>
        {tablesByEvent.length === 0 ? (
          <EmptyChart label={t.analyticsCharts.noData} />
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={tablesByEvent} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="prenotati" name={t.analyticsCharts.booked} fill="#a855f7" radius={[4, 4, 0, 0]} />
              <Bar dataKey="disponibili" name={t.analyticsCharts.available} fill="rgba(168,85,247,0.2)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Distribuzione per genere */}
      <div className="bg-[#111118] border border-white/8 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-white mb-1">{t.analyticsCharts.genderDistribution}</h2>
        <p className="text-xs text-slate-500 mb-6">{t.analyticsCharts.genderBuyers}</p>
        {genderData.length === 0 ? (
          <EmptyChart label={t.analyticsCharts.noData} />
        ) : (
          <div className="space-y-4">
            {genderData.map(({ gender, count, percentage }) => {
              const label = GENDER_LABELS[gender] ?? gender;
              const color = GENDER_COLORS[gender] ?? '#a855f7';
              return (
                <div key={gender}>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm text-slate-300">{label}</span>
                    <span className="text-sm font-semibold text-white">{percentage}% <span className="text-xs text-slate-500 font-normal">({count})</span></span>
                  </div>
                  <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${percentage}%`, backgroundColor: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-[220px] flex items-center justify-center text-slate-500 text-sm">
      {label}
    </div>
  );
}
