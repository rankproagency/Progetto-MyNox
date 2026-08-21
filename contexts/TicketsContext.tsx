import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';
import type { OrderedExtra } from '../types';

const ticketCacheKey = (uid: string) => `@mynox_tickets_${uid}`;

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
  tableSection?: string;
  pricePaid?: number;
  qrCode: string;
  drinkQrCode?: string;
  drinkUsed?: boolean;
  status: 'valid' | 'used' | 'denied' | 'pending' | 'gifted';
  giftCode?: string;
  giftCodeExpiresAt?: string;
  entryCode?: string;
  imageUrl?: string;
  eventImageUrl?: string;
  extras?: OrderedExtra[];
  ticketTypeId?: string;
}

interface TicketsCtx {
  tickets: MockTicket[];
  addTickets: (tickets: MockTicket[]) => void;
  markDrinkUsed: (id: string) => Promise<void>;
  markTicketUsed: (id: string) => Promise<void>;
  markTicketGifted: (id: string, code: string, expiresAt?: string) => Promise<void>;
  markTicketReclaimed: (id: string) => Promise<void>;
  removeTicket: (id: string) => void;
  refreshTickets: () => Promise<void>;
}

const TicketsContext = createContext<TicketsCtx>({
  tickets: [],
  addTickets: () => {},
  markDrinkUsed: async () => {},
  markTicketUsed: async () => {},
  markTicketGifted: async (_id, _code, _expiresAt) => {},
  markTicketReclaimed: async () => {},
  removeTicket: () => {},
  refreshTickets: async () => {},
});

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  const lang = require('../lib/i18n').default.language ?? 'it';
  const locale = lang === 'en' ? 'en-GB' : 'it-IT';
  return d.toLocaleDateString(locale, { weekday: 'short', day: 'numeric', month: 'short' });
}

function dbRowToMockTicket(row: any): MockTicket {
  const ev = row.events as any;
  const tt = row.ticket_types as any;
  const tbl = row.tables as any;
  const isTable = !tt;
  const pendingGift = (row.gift_codes as any[])?.find((g) => g.status === 'pending');
  // Se il biglietto risulta 'gifted' ma non ha gift code pending, significa che è già
  // stato riscattato da qualcun altro ma il proxy non ha resettato lo status → trattalo come valid.
  const effectiveStatus: MockTicket['status'] =
    row.status === 'gifted' && !pendingGift ? 'valid' : row.status;
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
    ticketLabel: isTable ? (tbl?.label ?? row.table_name ?? 'Tavolo') : (tt?.label ?? ''),
    tableName: row.table_name ?? undefined,
    tableCapacity: tbl?.capacity ?? undefined,
    tableSection: tbl?.section ?? undefined,
    pricePaid: row.price_paid ?? 0,
    ticketTypeId: row.ticket_type_id ?? undefined,
    qrCode: row.qr_code,
    drinkQrCode: row.drink_qr_code ?? undefined,
    drinkUsed: row.drink_used ?? false,
    status: effectiveStatus,
    giftCode: pendingGift?.code ?? undefined,
    giftCodeExpiresAt: pendingGift?.expires_at ?? undefined,
    entryCode: row.entry_code ?? undefined,
    imageUrl: ev?.clubs?.image_url ?? undefined,
    eventImageUrl: ev?.image_url ?? undefined,
    extras: Array.isArray(row.extras) && row.extras.length > 0 ? row.extras as OrderedExtra[] : undefined,
  };
}

export function TicketsProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<MockTicket[]>([]);
  const [loaded, setLoaded] = useState(false);
  const currentUserIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  async function loadTickets(userId: string) {
    // Show cached tickets immediately so QR codes are available offline
    try {
      const cached = await AsyncStorage.getItem(ticketCacheKey(userId));
      if (cached && mountedRef.current) setTickets(JSON.parse(cached));
    } catch (_) {}

    if (!mountedRef.current) return;
    setLoaded(false);
    const { data } = await supabase
      .from('tickets')
      .select(`
        id, qr_code, drink_qr_code, entry_code, status, drink_used, price_paid, table_name, table_id, ticket_type_id, extras,
        ticket_types(label, includes_drink),
        events(id, name, date, start_time, end_time, image_url, clubs(name, image_url)),
        tables(label, capacity, section),
        gift_codes(code, status, expires_at)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!mountedRef.current) return;
    if (data) {
      const mapped = data.map(dbRowToMockTicket);
      setTickets(mapped);
      try {
        await AsyncStorage.setItem(ticketCacheKey(userId), JSON.stringify(mapped));
      } catch (_) {}
    }
    // If data is null (offline), keep showing cached data from above
    setLoaded(true);
  }

  // Ascolta i cambi di sessione — carica i biglietti e gestisce il canale Realtime
  useEffect(() => {
    // Il canale Realtime viene ricreato al cambio utente con filtro user_id
    // per ricevere solo le notifiche dei propri biglietti (non di tutti gli utenti).
    let channel: ReturnType<typeof supabase.channel> | null = null;

    function subscribeRealtime(userId: string) {
      if (channel) supabase.removeChannel(channel);
      channel = supabase
        .channel(`tickets_${userId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'tickets', filter: `user_id=eq.${userId}` },
          () => { loadTickets(userId); }
        )
        .subscribe();
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        currentUserIdRef.current = user.id;
        loadTickets(user.id);
        subscribeRealtime(user.id);
      } else {
        setLoaded(true);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const userId = session?.user?.id ?? null;
      if (userId && userId !== currentUserIdRef.current) {
        currentUserIdRef.current = userId;
        loadTickets(userId);
        subscribeRealtime(userId);
      } else if (!userId) {
        const prevUserId = currentUserIdRef.current;
        currentUserIdRef.current = null;
        setTickets([]);
        setLoaded(true);
        if (prevUserId) {
          AsyncStorage.removeItem(ticketCacheKey(prevUserId)).catch(() => {});
        }
        if (channel) { supabase.removeChannel(channel); channel = null; }
      }
    });

    return () => {
      mountedRef.current = false;
      subscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, []);

  // Ricarica i biglietti ogni volta che l'app torna in foreground
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && currentUserIdRef.current) {
        loadTickets(currentUserIdRef.current);
      }
    });
    return () => sub.remove();
  }, []);

  const addTickets = useCallback((newTickets: MockTicket[]) => {
    setTickets((prev) => {
      const updated = [...prev, ...newTickets];
      const userId = currentUserIdRef.current;
      if (userId) {
        AsyncStorage.setItem(ticketCacheKey(userId), JSON.stringify(updated)).catch(() => {});
      }
      return updated;
    });
  }, []);

  const markDrinkUsed = useCallback(async (id: string) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, drinkUsed: true } : t))
    );
    const { data: success, error } = await supabase.rpc('mark_drink_used', { p_ticket_id: id });
    if (error || success === false) {
      setTickets((prev) =>
        prev.map((t) => (t.id === id ? { ...t, drinkUsed: false } : t))
      );
      throw error ?? new Error('Drink già usato o non valido');
    }
    // Aggiorna la cache offline dopo un mark riuscito
    const userId = currentUserIdRef.current;
    if (userId) {
      try {
        const cached = await AsyncStorage.getItem(ticketCacheKey(userId));
        if (cached) {
          const parsed: MockTicket[] = JSON.parse(cached);
          const updated = parsed.map((t) => (t.id === id ? { ...t, drinkUsed: true } : t));
          await AsyncStorage.setItem(ticketCacheKey(userId), JSON.stringify(updated));
        }
      } catch (_) {}
    }
  }, []);

  const markTicketUsed = useCallback(async (id: string) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'used' as const } : t))
    );
    const { error } = await supabase.from('tickets').update({ status: 'used' }).eq('id', id);
    if (error) {
      setTickets((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: 'valid' as const } : t))
      );
      throw error;
    }
    const userId = currentUserIdRef.current;
    if (userId) {
      try {
        const cached = await AsyncStorage.getItem(ticketCacheKey(userId));
        if (cached) {
          const parsed: MockTicket[] = JSON.parse(cached);
          const updated = parsed.map((t) => (t.id === id ? { ...t, status: 'used' as const } : t));
          await AsyncStorage.setItem(ticketCacheKey(userId), JSON.stringify(updated));
        }
      } catch (_) {}
    }
  }, []);

  const markTicketGifted = useCallback(async (id: string, code: string, expiresAt?: string) => {
    // Azzera il QR in locale — il gifter non può mostrare il vecchio QR neanche offline
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: 'gifted' as const, giftCode: code, giftCodeExpiresAt: expiresAt, qrCode: '', drinkQrCode: undefined } : t))
    );
    const { error } = await supabase.from('tickets').update({ status: 'gifted' }).eq('id', id);
    if (error) {
      setTickets((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: 'valid' as const, giftCode: undefined, giftCodeExpiresAt: undefined } : t))
      );
      throw error;
    }
    // Aggiorna la cache offline con QR vuoto
    const userId = currentUserIdRef.current;
    if (userId) {
      try {
        const cached = await AsyncStorage.getItem(ticketCacheKey(userId));
        if (cached) {
          const parsed: MockTicket[] = JSON.parse(cached);
          const updated = parsed.map((t) => t.id === id ? { ...t, status: 'gifted' as const, giftCode: code, giftCodeExpiresAt: expiresAt, qrCode: '', drinkQrCode: undefined } : t);
          await AsyncStorage.setItem(ticketCacheKey(userId), JSON.stringify(updated));
        }
      } catch (_) {}
    }
  }, []);

  const markTicketReclaimed = useCallback(async (id: string) => {
    // Cattura il giftCode corrente prima dell'update ottimistico per poterlo restaurare in caso di errore
    let previousGiftCode: string | undefined;
    setTickets((prev) => {
      previousGiftCode = prev.find((t) => t.id === id)?.giftCode;
      return prev.map((t) => (t.id === id ? { ...t, status: 'valid' as const, giftCode: undefined } : t));
    });
    const { error } = await supabase.from('tickets').update({ status: 'valid' }).eq('id', id);
    if (error) {
      setTickets((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: 'gifted' as const, giftCode: previousGiftCode } : t))
      );
      throw error;
    }
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
