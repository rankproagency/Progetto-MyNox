'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

interface Props {
  eventId: string;
}

export default function DuplicateEventButton({ eventId }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleDuplicate() {
    if (!confirm('Duplicare questo evento? Verrà creata una bozza con gli stessi dati.')) return;
    setLoading(true);
    const supabase = createClient();

    // Fetch event
    const { data: event } = await supabase.from('events').select('*').eq('id', eventId).single();
    if (!event) { setLoading(false); return; }

    // Fetch ticket types and tables
    const [{ data: ticketTypes }, { data: tables }] = await Promise.all([
      supabase.from('ticket_types').select('*').eq('event_id', eventId),
      supabase.from('tables').select('*').eq('event_id', eventId),
    ]);

    // Create new event as draft
    const { data: newEvent, error } = await supabase
      .from('events')
      .insert({
        club_id: event.club_id,
        name: `${event.name} (copia)`,
        description: event.description,
        date: event.date,
        start_time: event.start_time,
        end_time: event.end_time,
        dress_code: event.dress_code,
        capacity: event.capacity,
        image_url: event.image_url,
        floor_plan_url: event.floor_plan_url,
        genres: event.genres,
        lineup: event.lineup,
        is_published: false,
      })
      .select('id')
      .single();

    if (error || !newEvent) { setLoading(false); return; }

    // Copy ticket types
    if ((ticketTypes ?? []).length > 0) {
      await supabase.from('ticket_types').insert(
        (ticketTypes ?? []).map((t: any) => ({
          event_id: newEvent.id,
          label: t.label,
          price: t.price,
          total_quantity: t.total_quantity,
          includes_drink: t.includes_drink,
          sold_quantity: 0,
        }))
      );
    }

    // Copy tables
    if ((tables ?? []).length > 0) {
      await supabase.from('tables').insert(
        (tables ?? []).map((t: any) => ({
          event_id: newEvent.id,
          label: t.label,
          capacity: t.capacity,
          deposit: t.deposit,
          is_available: true,
          pos_x: t.pos_x,
          pos_y: t.pos_y,
          section: t.section,
          table_number: t.table_number,
        }))
      );
    }

    setLoading(false);
    router.push(`/club/events/${newEvent.id}/edit`);
    router.refresh();
  }

  return (
    <button
      onClick={handleDuplicate}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
      title="Duplica evento"
    >
      <Copy size={12} />
      {loading ? '...' : 'Duplica'}
    </button>
  );
}
