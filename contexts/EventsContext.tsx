import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { Event, Club, TicketType, Table, LineupArtist, Performer, Genre } from '../types';

interface EventsCtx {
  events: Event[];
  isLoading: boolean;
  hasError: boolean;
  reload: () => Promise<void>;
}

const EventsContext = createContext<EventsCtx>({
  events: [],
  isLoading: true,
  hasError: false,
  reload: async () => {},
});

function rowToEvent(row: any): Event {
  const club: Club = {
    id: row.clubs?.id ?? '',
    name: row.clubs?.name ?? '',
    city: row.clubs?.city ?? 'Padova',
    imageUrl: row.clubs?.image_url ?? '',
    address: row.clubs?.address ?? '',
    instagram: row.clubs?.instagram,
    tiktok: row.clubs?.tiktok,
    email: row.clubs?.email,
    phone: row.clubs?.phone,
  };

  const ticketTypes: TicketType[] = (row.ticket_types ?? []).map((t: any) => ({
    id: t.id,
    eventId: row.id,
    label: t.label,
    gender: t.label.toLowerCase().includes('donna') ? 'female'
          : t.label.toLowerCase().includes('uomo') ? 'male' : 'any',
    price: Number(t.price),
    includesDrink: t.includes_drink,
    available: (t.total_quantity ?? 999) - (t.sold_quantity ?? 0),
  }));

  const tables: Table[] = (row.tables ?? []).map((t: any) => ({
    id: t.id,
    eventId: row.id,
    label: t.label,
    capacity: t.capacity,
    deposit: Number(t.deposit),
    available: t.is_available,
    posX: t.club_tables?.pos_x ?? t.pos_x ?? undefined,
    posY: t.club_tables?.pos_y ?? t.pos_y ?? undefined,
    section: t.section ?? 'Standard',
    tableNumber: t.table_number ?? undefined,
  }));

  const lineup: LineupArtist[] = Array.isArray(row.lineup) ? row.lineup : [];
  const performers: Performer[] = Array.isArray(row.performers) ? row.performers : [];

  return {
    id: row.id,
    clubId: club.id,
    club,
    name: row.name,
    date: row.date,
    startTime: row.start_time,
    imageUrl: row.image_url ?? '',
    dressCode: row.dress_code ?? 'No dress code',
    capacity: row.capacity ?? 500,
    ticketsSold: row.tickets_sold ?? 0,
    genres: (row.genres ?? []) as Genre[],
    description: row.description ?? '',
    floorPlanUrl: row.clubs?.floor_plan_url ?? undefined,
    lineup,
    performers,
    ticketTypes,
    tables,
  };
}

export function EventsProvider({ children }: { children: ReactNode }) {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const reload = useCallback(async () => {
    setIsLoading(true);
    setHasError(false);
    const today = new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase
      .from('events')
      .select(`
        *,
        clubs (*),
        ticket_types (*),
        tables (*, club_tables (pos_x, pos_y))
      `)
      .eq('is_published', true)
      .gte('date', today)
      .order('date', { ascending: true });

    if (error) {
      setHasError(true);
    } else if (data) {
      setEvents(data.map(rowToEvent));
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  return (
    <EventsContext.Provider value={{ events, isLoading, hasError, reload }}>
      {children}
    </EventsContext.Provider>
  );
}

export const useEvents = () => useContext(EventsContext);
