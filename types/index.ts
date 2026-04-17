export interface Club {
  id: string;
  name: string;
  city: string;
  imageUrl: string;
  address: string;
  instagram?: string;
  tiktok?: string;
  email?: string;
  phone?: string;
}

export type Genre =
  | 'Techno'
  | 'House'
  | 'Deep House'
  | 'Latin'
  | 'Hip-Hop'
  | 'Pop'
  | 'R&B'
  | 'Reggaeton'
  | 'Commercial';

export interface LineupArtist {
  name: string;
  time: string;
}

export interface Performer {
  name: string;
  role: 'dj' | 'vocalist';
}

export interface Event {
  id: string;
  clubId: string;
  club?: Club;
  name: string;
  date: string;
  startTime: string;
  imageUrl: string;
  dressCode: string;
  capacity: number;
  ticketsSold: number;
  ticketTypes: TicketType[];
  tables: Table[];
  genres: Genre[];
  description: string;
  lineup: LineupArtist[];
  performers: Performer[];
}

export interface TicketType {
  id: string;
  eventId: string;
  label: string;
  gender: 'male' | 'female' | 'any';
  price: number;
  includesDrink: boolean;
  available: number;
}

export interface Table {
  id: string;
  eventId: string;
  label: string;
  capacity: number;
  deposit: number;
  available: boolean;
  posX?: number;
  posY?: number;
  section?: string;
  tableNumber?: number;
}

export interface Ticket {
  id: string;
  eventId: string;
  event?: Event;
  userId: string;
  ticketTypeId: string;
  ticketType?: TicketType;
  tableId?: string;
  qrCode: string;
  drinkQrCode: string;
  drinkUsed: boolean;
  status: 'valid' | 'used' | 'denied';
  purchasedAt: string;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  dateOfBirth?: string;
  avatarUrl?: string;
}
