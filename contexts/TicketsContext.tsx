import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface MockTicket {
  id: string;
  eventId: string;
  eventName: string;
  clubName: string;
  rawDate: string;    // '2026-04-11'
  date: string;       // 'Ven 11 Apr'
  startTime: string;
  ticketLabel: string;
  qrCode: string;
  drinkQrCode: string;
  drinkUsed: boolean;
  status: 'valid' | 'used' | 'denied' | 'pending';
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

const INITIAL_TICKETS: MockTicket[] = [
  {
    id: 'mock-ticket-1',
    eventId: '1',
    eventName: 'NEXUS — Techno Night',
    clubName: 'Altromondo Studios',
    rawDate: '2026-04-11',
    date: 'Ven 11 Apr',
    startTime: '23:00',
    ticketLabel: 'Uomo',
    qrCode: 'MYNOX-TICKET-mock-ticket-1-2026',
    drinkQrCode: 'MYNOX-DRINK-mock-ticket-1-2026',
    drinkUsed: true,
    status: 'used',
  },
  {
    id: 'mock-ticket-2',
    eventId: '5',
    eventName: 'NEON — Pop & RnB',
    clubName: 'Byblos Club',
    rawDate: '2026-04-18',
    date: 'Sab 18 Apr',
    startTime: '22:00',
    ticketLabel: 'Donna',
    qrCode: 'MYNOX-TICKET-mock-ticket-2-2026',
    drinkQrCode: 'MYNOX-DRINK-mock-ticket-2-2026',
    drinkUsed: false,
    status: 'valid',
  },
  {
    id: 'mock-ticket-3',
    eventId: '6',
    eventName: 'REQUIEM — Special Edition',
    clubName: 'New Age Club',
    rawDate: '2026-04-19',
    date: 'Dom 19 Apr',
    startTime: '23:00',
    ticketLabel: 'Uomo',
    qrCode: 'MYNOX-TICKET-mock-ticket-3-2026',
    drinkQrCode: 'MYNOX-DRINK-mock-ticket-3-2026',
    drinkUsed: false,
    status: 'pending',
  },
];

export function TicketsProvider({ children }: { children: ReactNode }) {
  const [tickets, setTickets] = useState<MockTicket[]>(INITIAL_TICKETS);

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
