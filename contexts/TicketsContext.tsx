import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { supabase } from '../lib/supabase';

export interface MockTicket {
  id: string;
  type: 'ticket' | 'table';
  eventId: string;
  eventName: string;
  clubName: string;
  rawDate: string;
  date: string;
  startTime: string;
  endTime?: string;
  ticketLabel: string;
  tableName?: string;
  tableCapacity?: number;
  pricePaid?: number;
  qrCode: string;
  drinkQrCode?: string;
  drinkUsed?: boolean;
  status: 'valid' | 'used' | 'denied' | 'pending' | 'gifted';
  giftCode?: string;
  imageUrl?: string;
  eventImageUrl?: string;
}

interface TicketsCtx {
  tickets: MockTicket[];
  addTickets: (tickets: MockTicket[]) => void;
  markDrinkUsed: (id: string) => Promise<void>;
  markTicketUsed: (id: string) => Promise<void>;
  markTicketGifted: (id: string, code: string) => Promise<void>;
  markTicketReclaimed: (id: string) => Promise<void>;
  removeTicket: (id: string) => void;
  refreshTickets: () => Promise<void>;
}

const TicketsContext = createContext<TicketsCtx>({
  tickets: [],
  addTickets: () => {},
  markDrinkUsed: () => {},
  markTicketUsed: () => {},
  markTicketGifted: () => {},
  markTicketReclaimed: () => {},
  removeTicket: () => {},
  refreshTickets: async () => {},
});

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
  const months = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];
  return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
}

function dbRowToMockTicket(row: any): MockTicket {
  const ev = row.events as any;
  const tt = row.ticket_types as any;
  const isTable = !tt;
  return {
    id: row.id,
    type: isTable ? 'table' : 'ticket',
    eventId: ev?.id ?? '',
    eventName: ev?.name ?? '',
    clubName: ev?.clubs?.name ?? '',
    rawDate: ev?.date ?? '',
    date: formatDate(ev?.date ?? ''),
    startTime: ev?.start_time ?? '',
    endTime: ev?.end_time ?? undefined,
    ticketLabel: isTable ? (row.table_name ?? 'Tavolo') : (tt?.label ?? ''),
    tableName: row.table_name ?? undefined,
    pricePaid: row.price_paid ?? 0,
    qrCode: row.qr_code,
    drinkQrCode: row.drink_qr_code ?? undefined,
    drinkUsed: row.drink_used ?? false,
    status: row.status,
    imageUrl: ev?.clubs?.image_url ?? undefined,
    eventImageUrl: ev?.image_url ?? undefined,
  };
}

export function TicketsProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<MockTicket[]>([]);
  const [loaded, setLoaded] = useState(false);
  const currentUserIdRef = useRef<string | null>(null);

  async function loadTickets(userId: string) {
    setLoaded(false);
    const { data } = await supabase
      .from('tickets')
      .select(`
        id, qr_code, drink_qr_code, status, drink_used, price_paid, table_name,
        ticket_types(label, includes_drink),
        events(id, name, date, start_time, end_time, image_url, clubs(name, image_url))
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    setTickets((data ?? []).map(dbRowToMockTicket));
    setLoaded(true);
  }

  // Ascolta i cambi di sessione — carica i biglietti dell'utente giusto
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        currentUserIdRef.current = user.id;
        loadTickets(user.id);
      } else {
        setLoaded(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user?.id ?? null;
      if (userId && userId !== currentUserIdRef.current) {
        currentUserIdRef.current = userId;
        loadTickets(userId);
      } else if (!userId) {
        currentUserIdRef.current = null;
        setTickets([]);
        setLoaded(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const addTickets = useCallback((newTickets: MockTicket[]) => {
    setTickets((prev) => [...prev, ...newTickets]);
  }, []);

  const markDrinkUsed = useCallback(async (id: string) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, drinkUsed: true } : t))
    );
    await supabase.from('tickets').update({ drink_used: true }).eq('id', id);
  }, []);

  const markTicketUsed = useCallback(async (id: string) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'used' as const } : t))
    );
    await supabase.from('tickets').update({ status: 'used' }).eq('id', id);
  }, []);

  const markTicketGifted = useCallback(async (id: string, code: string) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'gifted' as const, giftCode: code } : t))
    );
    await supabase.from('tickets').update({ status: 'gifted' }).eq('id', id);
  }, []);

  const markTicketReclaimed = useCallback(async (id: string) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'valid' as const, giftCode: undefined } : t))
    );
    await supabase.from('tickets').update({ status: 'valid' }).eq('id', id);
  }, []);

  const removeTicket = useCallback((id: string) => {
    setTickets((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const refreshTickets = useCallback(async () => {
    const userId = currentUserIdRef.current;
    if (userId) await loadTickets(userId);
  }, []);

  return (
    <TicketsContext.Provider value={{ tickets, addTickets, markDrinkUsed, markTicketUsed, markTicketGifted, markTicketReclaimed, removeTicket, refreshTickets }}>
      {children}
    </TicketsContext.Provider>
  );
}

export const useTickets = () => useContext(TicketsContext);
