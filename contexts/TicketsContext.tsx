import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  ticketLabel: string;
  tableName?: string;
  tableCapacity?: number;
  pricePaid?: number;
  qrCode: string;
  drinkQrCode?: string;
  drinkUsed?: boolean;
  status: 'valid' | 'used' | 'denied' | 'pending';
  imageUrl?: string;
}

interface TicketsCtx {
  tickets: MockTicket[];
  addTickets: (tickets: MockTicket[]) => void;
  markDrinkUsed: (id: string) => void;
  markTicketUsed: (id: string) => void;
}

const TicketsContext = createContext<TicketsCtx>({
  tickets: [],
  addTickets: () => {},
  markDrinkUsed: () => {},
  markTicketUsed: () => {},
});

function storageKey(userId: string) {
  return `@mynox_tickets_${userId}`;
}

export function TicketsProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<MockTicket[]>([]);
  const [loaded, setLoaded] = useState(false);
  const currentUserIdRef = useRef<string | null>(null);

  async function loadTickets(userId: string) {
    setLoaded(false);
    const raw = await AsyncStorage.getItem(storageKey(userId));
    if (raw) {
      try {
        const saved: MockTicket[] = JSON.parse(raw);
        setTickets(saved.filter((t) => !t.id.startsWith('mock-')));
      } catch (_) {
        setTickets([]);
      }
    } else {
      setTickets([]);
    }
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

  // Persiste su AsyncStorage ad ogni cambio, solo per l'utente corrente
  useEffect(() => {
    if (!loaded || !currentUserIdRef.current) return;
    AsyncStorage.setItem(storageKey(currentUserIdRef.current), JSON.stringify(tickets));
  }, [tickets, loaded]);

  const addTickets = useCallback((newTickets: MockTicket[]) => {
    setTickets((prev) => [...prev, ...newTickets]);
  }, []);

  const markDrinkUsed = useCallback((id: string) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, drinkUsed: true } : t))
    );
  }, []);

  const markTicketUsed = useCallback((id: string) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'used' as const } : t))
    );
  }, []);

  return (
    <TicketsContext.Provider value={{ tickets, addTickets, markDrinkUsed, markTicketUsed }}>
      {children}
    </TicketsContext.Provider>
  );
}

export const useTickets = () => useContext(TicketsContext);
