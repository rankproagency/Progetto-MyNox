import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export interface MockTicket {
  id: string;
  eventId: string;
  eventName: string;
  clubName: string;
  rawDate: string;
  date: string;
  startTime: string;
  ticketLabel: string;
  qrCode: string;
  drinkQrCode: string;
  drinkUsed: boolean;
  status: 'valid' | 'used' | 'denied' | 'pending';
}

interface TicketsCtx {
  tickets: MockTicket[];
  isLoading: boolean;
  addTickets: (tickets: MockTicket[]) => Promise<void>;
  markDrinkUsed: (id: string) => Promise<void>;
  markTicketUsed: (id: string) => Promise<void>;
  reload: () => Promise<void>;
}

const TicketsContext = createContext<TicketsCtx>({
  tickets: [],
  isLoading: false,
  addTickets: async () => {},
  markDrinkUsed: async () => {},
  markTicketUsed: async () => {},
  reload: async () => {},
});

function rowToTicket(row: any): MockTicket {
  return {
    id: row.id,
    eventId: row.event_id ?? row.event_name ?? '',
    eventName: row.event_name ?? '',
    clubName: row.club_name ?? '',
    rawDate: row.raw_date ?? '',
    date: row.formatted_date ?? '',
    startTime: row.start_time ?? '',
    ticketLabel: row.ticket_label ?? '',
    qrCode: row.qr_code,
    drinkQrCode: row.drink_qr_code,
    drinkUsed: row.drink_used,
    status: row.status,
  };
}

export function TicketsProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<MockTicket[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const reload = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setTickets([]); return; }

    setIsLoading(true);
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false });

    if (!error && data) setTickets(data.map(rowToTicket));
    setIsLoading(false);
  }, []);

  // Ricarica quando cambia la sessione
  useEffect(() => {
    reload();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => reload());
    return () => subscription.unsubscribe();
  }, [reload]);

  const addTickets = useCallback(async (newTickets: MockTicket[]) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const rows = newTickets.map((t) => ({
      user_id: session.user.id,
      event_id: null,
      ticket_type_id: null,
      event_name: t.eventName,
      club_name: t.clubName,
      raw_date: t.rawDate,
      formatted_date: t.date,
      start_time: t.startTime,
      ticket_label: t.ticketLabel,
      qr_code: t.qrCode,
      drink_qr_code: t.drinkQrCode,
      drink_used: false,
      status: t.status,
    }));

    const { data, error } = await supabase.from('tickets').insert(rows).select();
    if (!error && data) {
      setTickets((prev) => [...data.map(rowToTicket), ...prev]);
    }
  }, []);

  const markDrinkUsed = useCallback(async (id: string) => {
    await supabase.from('tickets').update({ drink_used: true }).eq('id', id);
    setTickets((prev) => prev.map((t) => t.id === id ? { ...t, drinkUsed: true } : t));
  }, []);

  const markTicketUsed = useCallback(async (id: string) => {
    await supabase.from('tickets').update({ status: 'used' }).eq('id', id);
    setTickets((prev) => prev.map((t) => t.id === id ? { ...t, status: 'used' as const } : t));
  }, []);

  return (
    <TicketsContext.Provider value={{ tickets, isLoading, addTickets, markDrinkUsed, markTicketUsed, reload }}>
      {children}
    </TicketsContext.Provider>
  );
}

export const useTickets = () => useContext(TicketsContext);
