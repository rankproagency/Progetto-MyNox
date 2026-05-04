'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

export interface HourlyBucket {
  label: string;
  isoKey: string;
  count: number;
  revenue: number;
}

type TimeFilter = '12h' | '3d' | '7d';
type MetricKey = 'count' | 'revenue';

interface Props {
  eventIds: string[];
  initialBuckets: HourlyBucket[];
  showRevenue?: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');

function sinceDate(filter: TimeFilter): string {
  const hours = filter === '12h' ? 12 : filter === '3d' ? 72 : 168;
  return new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
}

function generateBuckets(filter: TimeFilter): HourlyBucket[] {
  const now = new Date();
  if (filter === '12h') {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now);
      d.setHours(d.getHours() - (11 - i), 0, 0, 0);
      const isoKey =
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
        `T${pad(d.getHours())}:00`;
      return { label: `${pad(d.getHours())}:00`, isoKey, count: 0, revenue: 0 };
    });
  }
  const days = filter === '3d' ? 3 : 7;
  return Array.from({ length: days }, (_, i) => {
    const d = new Date(now);
    d.setDate(d.getDate() - (days - 1 - i));
    const isoKey = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
    return { label, isoKey, count: 0, revenue: 0 };
  });
}

function ticketToKey(createdAt: string, filter: TimeFilter): string {
  const d = new Date(createdAt);
  if (filter === '12h') {
    return (
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
      `T${pad(d.getHours())}:00`
    );
  }
  return d.toISOString().slice(0, 10);
}

const tooltipStyle = {
  backgroundColor: '#111118',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 8,
  color: '#f8fafc',
  fontSize: 12,
};

const TIME_LABELS: Record<TimeFilter, string> = {
  '12h': '12h',
  '3d': '3 giorni',
  '7d': '7 giorni',
};

export default function RealtimeSalesChart({ eventIds, initialBuckets, showRevenue = true }: Props) {
  const [buckets, setBuckets] = useState<HourlyBucket[]>(initialBuckets);
  const [loading, setLoading] = useState(false);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('12h');
  const [metric, setMetric] = useState<MetricKey>('count');
  const timeFilterRef = useRef<TimeFilter>('12h');
  const isFirstMount = useRef(true);

  useEffect(() => {
    if (!showRevenue && metric === 'revenue') setMetric('count');
  }, [showRevenue, metric]);

  const fetchBuckets = useCallback(async (filter: TimeFilter) => {
    if (eventIds.length === 0) {
      setBuckets(generateBuckets(filter));
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { data } = await supabase
        .from('tickets')
        .select('created_at, price_paid, ticket_types(price)')
        .in('event_id', eventIds)
        .in('status', ['valid', 'used'])
        .gte('created_at', sinceDate(filter))
        .order('created_at', { ascending: true });

      const empty = generateBuckets(filter);
      (data ?? []).forEach((t: any) => {
        const key = ticketToKey(t.created_at, filter);
        const bucket = empty.find((b) => b.isoKey === key);
        if (bucket) {
          bucket.count++;
          bucket.revenue += t.ticket_types?.price ?? (t.price_paid ?? 0) / 1.08;
        }
      });
      setBuckets(empty);
    } finally {
      setLoading(false);
    }
  }, [eventIds]);

  // Skip fetch on first mount — use server-provided initial data
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    fetchBuckets(timeFilter);
  }, [timeFilter, fetchBuckets]);

  useEffect(() => {
    timeFilterRef.current = timeFilter;
  }, [timeFilter]);

  // Realtime subscription
  useEffect(() => {
    if (eventIds.length === 0) return;
    const supabase = createClient();

    const channel = supabase
      .channel('dashboard-realtime-tickets')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tickets' },
        (payload) => {
          const ticket = payload.new as {
            event_id: string;
            created_at: string;
            price_paid: number;
            status: string;
          };
          if (!eventIds.includes(ticket.event_id)) return;
          if (!['valid', 'used'].includes(ticket.status)) return;

          const filter = timeFilterRef.current;
          const key = ticketToKey(ticket.created_at, filter);

          setBuckets((prev) => {
            const idx = prev.findIndex((b) => b.isoKey === key);
            if (idx < 0) return prev;
            const next = [...prev];
            next[idx] = {
              ...next[idx],
              count: next[idx].count + 1,
              revenue: next[idx].revenue + (ticket.price_paid ?? 0) / 1.08,
            };
            return next;
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [eventIds]);

  const totalCount = buckets.reduce((s, b) => s + b.count, 0);
  const totalRevenue = buckets.reduce((s, b) => s + b.revenue, 0);
  const isEmpty = buckets.every((b) => b.count === 0);

  return (
    <div className="bg-[#111118] border border-white/8 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-white/8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <h2 className="text-sm font-semibold text-white">Vendite in tempo reale</h2>
            <span className="flex items-center gap-1.5 text-xs text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse inline-block" />
              Live
            </span>
          </div>
          <div className="flex items-center gap-5">
            <div className="text-right">
              <p className="text-xs text-slate-500">Biglietti</p>
              <p className="text-sm font-bold text-white">{totalCount}</p>
            </div>
            {showRevenue && (
              <div className="text-right">
                <p className="text-xs text-slate-500">Ricavi</p>
                <p className="text-sm font-bold text-purple-400">€{totalRevenue.toFixed(2)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mt-3">
          {/* Time filter */}
          <div className="flex items-center gap-0.5 bg-white/5 rounded-lg p-1">
            {(Object.keys(TIME_LABELS) as TimeFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setTimeFilter(f)}
                className={`text-xs px-3 py-1 rounded-md transition-colors ${
                  timeFilter === f
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {TIME_LABELS[f]}
              </button>
            ))}
          </div>

          {/* Metric toggle */}
          {showRevenue && (
            <div className="flex items-center gap-0.5 bg-white/5 rounded-lg p-1">
              <button
                onClick={() => setMetric('count')}
                className={`text-xs px-3 py-1 rounded-md transition-colors ${
                  metric === 'count'
                    ? 'bg-purple-600 text-white font-medium'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Biglietti
              </button>
              <button
                onClick={() => setMetric('revenue')}
                className={`text-xs px-3 py-1 rounded-md transition-colors ${
                  metric === 'revenue'
                    ? 'bg-purple-600 text-white font-medium'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                Ricavi
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Chart */}
      <div
        className={`px-5 pt-5 pb-6 transition-opacity duration-200 ${
          loading ? 'opacity-40 pointer-events-none' : 'opacity-100'
        }`}
      >
        {isEmpty && !loading ? (
          <div className="h-[200px] flex flex-col items-center justify-center gap-1.5">
            <span className="text-slate-500 text-sm">Nessuna vendita nel periodo selezionato</span>
            <span className="text-xs text-slate-600">Il grafico si aggiornerà automaticamente</span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={buckets} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
                vertical={false}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                interval="preserveStartEnd"
              />
              <YAxis
                tick={{ fill: '#94a3b8', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                allowDecimals={metric === 'revenue'}
                width={metric === 'revenue' ? 48 : 28}
                tickFormatter={(v) => (metric === 'revenue' ? `€${v}` : `${v}`)}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                formatter={(value: number) =>
                  metric === 'revenue'
                    ? [`€${value.toFixed(2)}`, 'Ricavi']
                    : [value, 'Biglietti']
                }
                labelFormatter={(label) =>
                  timeFilter === '12h' ? `Ora: ${label}` : `Data: ${label}`
                }
              />
              <Area
                type="monotone"
                dataKey={metric}
                stroke="#a855f7"
                strokeWidth={2}
                fill="url(#salesGradient)"
                dot={false}
                activeDot={{ r: 4, fill: '#a855f7', strokeWidth: 0 }}
                isAnimationActive={!loading}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
