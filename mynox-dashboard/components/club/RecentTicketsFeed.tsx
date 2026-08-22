'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/components/providers/I18nProvider';

interface TicketRow {
  id: string;
  created_at: string;
  table_name?: string | null;
  price_paid?: number | null;
  ticket_types?: { label?: string | null; price?: number | null } | null;
  events?: { name?: string | null; clubs?: { name?: string | null } | null } | null;
}

interface Props {
  initialTickets: TicketRow[];
  eventIds?: string[];
  showRevenue?: boolean;
  showClub?: boolean;
}

export default function RecentTicketsFeed({ initialTickets, eventIds, showRevenue = true, showClub = false }: Props) {
  const { t } = useLanguage();
  const [tickets, setTickets] = useState<(TicketRow & { _isNew?: boolean })[]>(initialTickets);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel('recent-tickets-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'tickets' },
        async (payload) => {
          const row = payload.new as { id: string; event_id: string; status: string };
          if (!['valid', 'used'].includes(row.status)) return;
          if (eventIds !== undefined && eventIds.length > 0 && !eventIds.includes(row.event_id)) return;

          const { data } = await supabase
            .from('tickets')
            .select('id, created_at, table_name, price_paid, ticket_types(label, price), events(name, clubs(name))')
            .eq('id', row.id)
            .single();

          if (!data) return;
          setTickets((prev) => [{ ...(data as TicketRow), _isNew: true }, ...prev].slice(0, 6));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <style>{`
        @keyframes ticket-slide-in {
          0%   { opacity: 0; transform: translateY(-6px); background-color: rgba(168,85,247,0.10); }
          60%  { background-color: rgba(168,85,247,0.05); }
          100% { opacity: 1; transform: translateY(0);    background-color: transparent; }
        }
        .ticket-new { animation: ticket-slide-in 0.55s ease forwards; }
      `}</style>
      <div className="divide-y divide-white/5">
        {tickets.map((ticket) => {
          const paidNet = (ticket.price_paid ?? 0) / 1.05;
          const listPrice = ticket.ticket_types?.price ?? null;
          const hasPromo = listPrice !== null && paidNet < listPrice - 0.01;
          const tableLabel = t.clubDashboard?.table ?? 'Tavolo';
          const subtitle = showClub
            ? `${ticket.events?.clubs?.name ?? '—'} · ${ticket.ticket_types?.label ?? (ticket.table_name ? `Tavolo – ${ticket.table_name}` : '—')}`
            : ticket.ticket_types?.label ?? (ticket.table_name ? `${tableLabel} – ${ticket.table_name}` : '—');

          return (
            <div
              key={ticket.id}
              className={`flex items-center justify-between px-5 py-3.5${ticket._isNew ? ' ticket-new' : ''}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm text-white font-medium truncate">{ticket.events?.name ?? '—'}</p>
                  {hasPromo && (
                    <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400">
                      PROMO
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
              </div>
              <div className="text-right shrink-0 ml-4">
                {showRevenue && (
                  <div className="flex items-center gap-1.5 justify-end">
                    {hasPromo && listPrice !== null && (
                      <span className="text-xs text-slate-600 line-through">€{listPrice.toFixed(2)}</span>
                    )}
                    <p className="text-sm font-semibold text-purple-400">€{paidNet.toFixed(2)}</p>
                  </div>
                )}
                <p className="text-xs text-slate-500">
                  {new Date(ticket.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
