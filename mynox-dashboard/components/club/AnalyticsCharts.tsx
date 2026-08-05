'use client';

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area,
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
  'non-specificato': '#6366f1',
};

interface Props {
  salesByEvent: { name: string; venduti: number; capacita: number }[];
  revenueData: { mese: string; ricavi: number }[] | null;
  tablesByEvent: { name: string; prenotati: number; disponibili: number }[];
  genderData: { gender: string; count: number; percentage: number }[];
}

const tooltipStyle = {
  backgroundColor: '#18181f',
  border: '1px solid rgba(168,85,247,0.25)',
  borderRadius: 10,
  color: '#f8fafc',
  fontSize: 12,
  boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
};

const gridStyle = { strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.06)' };
const xAxisProps = { tick: { fill: '#64748b', fontSize: 11 }, axisLine: false as const, tickLine: false as const };
const yAxisProps = { tick: { fill: '#64748b', fontSize: 11 }, axisLine: false as const, tickLine: false as const };

export default function AnalyticsCharts({ salesByEvent, revenueData, tablesByEvent, genderData }: Props) {
  const { t } = useLanguage();
  return (
    <div className="space-y-6">

      {/* Ricavi per mese */}
      {revenueData !== null && (
        <div className="bg-[#111118] border border-white/8 rounded-xl p-6">
          <h2 className="text-sm font-semibold text-white mb-6">{t.analyticsCharts.monthlyRevenue}</h2>
          {revenueData.every((d) => d.ricavi === 0) ? (
            <EmptyChart label={t.analyticsCharts.noData} />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={revenueData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#a855f7" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid {...gridStyle} vertical={false} />
                <XAxis dataKey="mese" {...xAxisProps} />
                <YAxis {...yAxisProps} tickFormatter={(v) => `€${v}`} />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value) => [`€${Number(value).toFixed(2)}`, 'Ricavi']}
                />
                <Area
                  type="monotone"
                  dataKey="ricavi"
                  stroke="#a855f7"
                  strokeWidth={2.5}
                  fill="url(#revenueGrad)"
                  dot={{ fill: '#a855f7', strokeWidth: 0, r: 4 }}
                  activeDot={{ r: 6, fill: '#c084fc', strokeWidth: 0 }}
                />
              </AreaChart>
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
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={salesByEvent} barGap={4} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="barSold" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c084fc" stopOpacity={1} />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.85} />
                </linearGradient>
                <linearGradient id="barCap" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.12} />
                </linearGradient>
              </defs>
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis dataKey="name" {...xAxisProps} />
              <YAxis {...yAxisProps} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="venduti" name={t.analyticsCharts.sold} fill="url(#barSold)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="capacita" name={t.analyticsCharts.capacity} fill="url(#barCap)" radius={[6, 6, 0, 0]} />
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
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={tablesByEvent} barGap={4} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="barBooked" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#c084fc" stopOpacity={1} />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.85} />
                </linearGradient>
                <linearGradient id="barAvail" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#a855f7" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.12} />
                </linearGradient>
              </defs>
              <CartesianGrid {...gridStyle} vertical={false} />
              <XAxis dataKey="name" {...xAxisProps} />
              <YAxis {...yAxisProps} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="prenotati" name={t.analyticsCharts.booked} fill="url(#barBooked)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="disponibili" name={t.analyticsCharts.available} fill="url(#barAvail)" radius={[6, 6, 0, 0]} />
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
                    <span className="text-sm font-semibold text-white">
                      {percentage}%{' '}
                      <span className="text-xs text-slate-500 font-normal">({count})</span>
                    </span>
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
