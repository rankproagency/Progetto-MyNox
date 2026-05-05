export type Role = 'admin' | 'club_admin' | 'club_staff' | 'customer';

export interface StaffPermissions {
  can_manage_events: boolean;
  can_manage_tables: boolean;
  can_view_analytics: boolean;
  can_view_participants: boolean;
  can_scan_tickets: boolean;
}

export interface ClubStaff {
  id: string;
  user_id: string;
  club_id: string;
  invited_by: string | null;
  can_manage_events: boolean;
  can_manage_tables: boolean;
  can_view_analytics: boolean;
  can_view_participants: boolean;
  can_scan_tickets: boolean;
  created_at: string;
  profiles?: { name: string; email: string };
}

export interface Profile {
  id: string;
  name: string;
  email: string;
  role: Role;
  club_id: string | null;
  member_since: string;
}

export interface Club {
  id: string;
  name: string;
  city: string;
  address: string | null;
  image_url: string | null;
  instagram: string | null;
  tiktok: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
}

export interface TicketType {
  id: string;
  event_id: string;
  label: string;
  price: number;
  includes_drink: boolean;
  total_quantity: number | null;
  sold_quantity: number;
}

export interface Table {
  id: string;
  event_id: string;
  label: string;
  capacity: number;
  deposit: number;
  is_available: boolean;
}

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
  club_id: string;
  club?: Club;
  name: string;
  description: string | null;
  date: string;
  start_time: string;
  end_time: string | null;
  image_url: string | null;
  genres: string[];
  dress_code: string | null;
  capacity: number;
  tickets_sold: number;
  lineup: LineupArtist[];
  performers: Performer[];
  is_published: boolean;
  ticket_types?: TicketType[];
  tables?: Table[];
  created_at: string;
}

export interface Ticket {
  id: string;
  user_id: string;
  event_id: string | null;
  ticket_type_id: string | null;
  event_name: string | null;
  club_name: string | null;
  ticket_label: string | null;
  qr_code: string;
  drink_qr_code: string;
  status: 'valid' | 'used' | 'denied' | 'pending';
  drink_used: boolean;
  created_at: string;
}
