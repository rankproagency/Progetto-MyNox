import { Club, Event, Genre } from '../types';

export const ALL_GENRES: Genre[] = [
  'Techno', 'House', 'Hip-Hop', 'Trap', 'Pop', 'R&B', 'Reggaeton', 'Commercial',
];

export const MOCK_CLUBS: Club[] = [
  { id: 'club1', name: 'Altromondo Studios', city: 'Padova', imageUrl: 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800&q=80', address: 'Via Interporto, Padova', instagram: 'altromondostudios', tiktok: 'altromondostudios', email: 'info@altromondostudios.it', phone: '+39 049 123 4567', latitude: 45.3952, longitude: 11.9105 },
  { id: 'club2', name: 'Byblos Club', city: 'Padova', imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80', address: 'Via Roma 12, Padova', instagram: 'byblosclub.pd', tiktok: 'byblosclub', email: 'info@byblosclub.it', phone: '+39 049 765 4321', latitude: 45.4072, longitude: 11.8762 },
  { id: 'club3', name: 'New Age Club', city: 'Padova', imageUrl: 'https://images.unsplash.com/photo-1598387993441-a364f854cfdf?w=800&q=80', address: 'Via Venezia 5, Padova', instagram: 'newageclub.pd', tiktok: 'newageclub', email: 'info@newageclub.it', phone: '+39 049 987 6543', latitude: 45.4148, longitude: 11.8834 },
];

export const MOCK_EVENTS: Event[] = [
  {
    id: '1',
    clubId: 'club1',
    club: { id: 'club1', name: 'Altromondo Studios', city: 'Padova', imageUrl: '', address: 'Via Interporto, Padova' },
    name: 'NEXUS — Techno Night',
    date: '2026-04-11',
    startTime: '23:00',
    imageUrl: 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800&q=80',
    dressCode: 'Elegante / No sportivo',
    capacity: 800,
    ticketsSold: 134,
    genres: ['Techno'],
    description: 'Una notte di techno dura e cruda negli spazi industriali di Altromondo Studios. Quattro ore di set continui, luci stroboscopiche e sound system Funktion-One da 40.000 watt. Preparati a ballare fino all\'alba.',
    lineup: [
      { name: 'KOSMIK', time: '23:00' },
      { name: 'PHASE ERROR', time: '01:00' },
      { name: 'DRVG CVLTVRE', time: '03:00' },
    ],
    ticketTypes: [
      { id: 't1', eventId: '1', label: 'Donna', gender: 'female', price: 10, includesDrink: true, available: 120 },
      { id: 't2', eventId: '1', label: 'Uomo', gender: 'male', price: 15, includesDrink: true, available: 80 },
      { id: 't3', eventId: '1', label: 'Early Bird', gender: 'any', price: 8, includesDrink: true, available: 20 },
    ],
    performers: [],
    tables: [
      { id: 'tb1', eventId: '1', label: 'Tavolo Standard 4 pax', capacity: 4, deposit: 60, available: true },
      { id: 'tb2', eventId: '1', label: 'Tavolo VIP 6 pax', capacity: 6, deposit: 120, available: true },
    ],
  },
  {
    id: '2',
    clubId: 'club2',
    club: { id: 'club2', name: 'Byblos Club', city: 'Padova', imageUrl: '', address: 'Via Roma 12, Padova' },
    name: 'TROPICANA — Latin Vibes',
    date: '2026-04-11',
    startTime: '22:30',
    imageUrl: 'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=800&q=80',
    dressCode: 'Smart casual',
    capacity: 600,
    ticketsSold: 87,
    genres: ['Reggaeton'],
    description: 'La serata latina più calda di Padova torna al Byblos. Salsa, bachata, reggaeton e i migliori hit latini del momento. Dance floor aperto dalle 22:30, lezione di ballo alle 23:00.',
    lineup: [
      { name: 'DJ MAMBO', time: '22:30' },
      { name: 'LATINO HEAT', time: '00:30' },
    ],
    ticketTypes: [
      { id: 't4', eventId: '2', label: 'Donna', gender: 'female', price: 8, includesDrink: true, available: 150 },
      { id: 't5', eventId: '2', label: 'Uomo', gender: 'male', price: 12, includesDrink: true, available: 100 },
    ],
    performers: [],
    tables: [
      { id: 'tb3', eventId: '2', label: 'Tavolo 4 pax', capacity: 4, deposit: 50, available: true },
    ],
  },
  {
    id: '3',
    clubId: 'club3',
    club: { id: 'club3', name: 'New Age Club', city: 'Padova', imageUrl: '', address: 'Via Venezia 5, Padova' },
    name: 'ECLIPSE — House & Deep',
    date: '2026-04-12',
    startTime: '23:30',
    imageUrl: 'https://images.unsplash.com/photo-1598387993441-a364f854cfdf?w=800&q=80',
    dressCode: 'No dress code',
    capacity: 400,
    ticketsSold: 56,
    genres: ['House'],
    description: 'Una serata dedicata alle sonorità più profonde della house music. Atmosfera intima, luci calde e un sound che ti porta in un viaggio dalle radici Chicago fino ai club di Ibiza.',
    lineup: [
      { name: 'SUNKEN', time: '23:30' },
      { name: 'REVE', time: '01:30' },
      { name: 'FLORA B2B MARZ', time: '03:30' },
    ],
    ticketTypes: [
      { id: 't6', eventId: '3', label: 'Donna', gender: 'female', price: 12, includesDrink: true, available: 60 },
      { id: 't7', eventId: '3', label: 'Uomo', gender: 'male', price: 18, includesDrink: true, available: 40 },
      { id: 't8', eventId: '3', label: 'Early Bird', gender: 'any', price: 10, includesDrink: true, available: 10 },
    ],
    performers: [],
    tables: [],
  },
  {
    id: '4',
    clubId: 'club1',
    club: { id: 'club1', name: 'Altromondo Studios', city: 'Padova', imageUrl: '', address: 'Via Interporto, Padova' },
    name: 'VOID — Industrial Techno',
    date: '2026-04-12',
    startTime: '00:00',
    imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&q=80',
    dressCode: 'All black preferred',
    capacity: 500,
    ticketsSold: 203,
    genres: ['Techno'],
    description: 'VOID è il capitolo più oscuro della stagione di Altromondo. Techno industriale, EBM e noise. Dress code rigoroso: all black. Non è una serata per tutti — è per chi conosce la differenza.',
    lineup: [
      { name: 'SURGEON', time: '00:00' },
      { name: 'OBJECT BLUE', time: '02:00' },
    ],
    ticketTypes: [
      { id: 't9', eventId: '4', label: 'Donna', gender: 'female', price: 15, includesDrink: true, available: 80 },
      { id: 't10', eventId: '4', label: 'Uomo', gender: 'male', price: 20, includesDrink: true, available: 50 },
    ],
    performers: [],
    tables: [
      { id: 'tb4', eventId: '4', label: 'Tavolo VIP 4 pax', capacity: 4, deposit: 80, available: false },
    ],
  },
  {
    id: '5',
    clubId: 'club2',
    club: { id: 'club2', name: 'Byblos Club', city: 'Padova', imageUrl: '', address: 'Via Roma 12, Padova' },
    name: 'NEON — Pop & RnB',
    date: '2026-04-18',
    startTime: '22:00',
    imageUrl: 'https://images.unsplash.com/photo-1504680177321-2e6a879aac86?w=800&q=80',
    dressCode: 'Smart casual',
    capacity: 600,
    ticketsSold: 41,
    genres: ['Pop', 'R&B', 'Hip-Hop'],
    description: 'NEON è la serata mainstream del Byblos — i più grandi hit internazionali di Pop, RnB e Hip-Hop. Ideale per chi vuole ballare senza pensieri. Open bar dalle 22:00 alle 23:00.',
    lineup: [
      { name: 'DJ FRESHH', time: '22:00' },
      { name: 'PRINCE OF THE BOOTH', time: '00:00' },
    ],
    ticketTypes: [
      { id: 't11', eventId: '5', label: 'Donna', gender: 'female', price: 10, includesDrink: true, available: 200 },
      { id: 't12', eventId: '5', label: 'Uomo', gender: 'male', price: 15, includesDrink: true, available: 150 },
    ],
    performers: [],
    tables: [],
  },
  {
    id: '6',
    clubId: 'club3',
    club: { id: 'club3', name: 'New Age Club', city: 'Padova', imageUrl: '', address: 'Via Venezia 5, Padova' },
    name: 'REQUIEM — Special Edition',
    date: '2026-04-19',
    startTime: '23:00',
    imageUrl: 'https://images.unsplash.com/photo-1571266028243-e4733b0f0bb0?w=800&q=80',
    dressCode: 'All black',
    capacity: 300,
    ticketsSold: 300,
    genres: ['Techno', 'House'],
    description: 'L\'evento più atteso dell\'anno al New Age. REQUIEM Special Edition — una notte senza compromessi con la lineup più forte mai portata a Padova. 300 posti, 300 venduti. Lista d\'attesa aperta.',
    lineup: [
      { name: 'BLAWAN', time: '23:00' },
      { name: 'SHACKLETON', time: '01:00' },
      { name: 'MANNI DEH', time: '03:30' },
    ],
    ticketTypes: [
      { id: 't13', eventId: '6', label: 'Donna', gender: 'female', price: 20, includesDrink: true, available: 0 },
      { id: 't14', eventId: '6', label: 'Uomo', gender: 'male', price: 25, includesDrink: true, available: 0 },
    ],
    performers: [],
    tables: [],
  },
];

export const FEATURED_EVENTS = MOCK_EVENTS.slice(0, 3);

export function getClubById(id: string): Club | null {
  return MOCK_CLUBS.find((c) => c.id === id) ?? null;
}

export function getEventsByClub(clubId: string): Event[] {
  return MOCK_EVENTS.filter((e) => e.clubId === clubId);
}

export function getEventsByDay(): { day: string; label: string; events: Event[] }[] {
  const groups: Record<string, Event[]> = {};
  for (const event of MOCK_EVENTS) {
    if (!groups[event.date]) groups[event.date] = [];
    groups[event.date].push(event);
  }

  const DAY_NAMES = ['Dom', 'Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab'];
  const MONTH_NAMES = ['Gen', 'Feb', 'Mar', 'Apr', 'Mag', 'Giu', 'Lug', 'Ago', 'Set', 'Ott', 'Nov', 'Dic'];

  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, events]) => {
      const d = new Date(date);
      const label = `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
      return { day: date, label, events };
    });
}
