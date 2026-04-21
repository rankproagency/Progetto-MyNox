'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Copy } from 'lucide-react';

interface Props {
  eventId: string;
}

export default function DuplicateEventButton({ eventId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function duplicate() {
    setLoading(true);
    const supabase = createClient();

    const { data: event, error } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (error || !event) { setLoading(false); return; }

    const { id: _id, created_at: _ca, tickets_sold: _ts, ...rest } = event as any;

    const { data: newEvent, error: insertError } = await supabase
      .from('events')
      .insert({ ...rest, name: `${rest.name} (copia)`, is_published: false, tickets_sold: 0 })
      .select()
      .single();

    if (insertError || !newEvent) { setLoading(false); return; }

    // Duplica i ticket types
    const { data: ticketTypes } = await supabase
      .from('ticket_types')
      .select('*')
      .eq('event_id', eventId);

    if (ticketTypes && ticketTypes.length > 0) {
      await supabase.from('ticket_types').insert(
        ticketTypes.map(({ id: _id, created_at: _ca, sold_quantity: _sq, ...tt }: any) => ({
          ...tt,
          event_id: newEvent.id,
          sold_quantity: 0,
        }))
      );
    }

    // Duplica i tavoli
    const { data: tables } = await supabase
      .from('tables')
      .select('*')
      .eq('event_id', eventId);

    if (tables && tables.length > 0) {
      await supabase.from('tables').insert(
        tables.map(({ id: _id, created_at: _ca, ...t }: any) => ({
          ...t,
          event_id: newEvent.id,
          is_available: true,
          reserved_by: null,
        }))
      );
    }

    setLoading(false);
    router.push(`/club/events/${newEvent.id}/edit`);
  }

  return (
    <button
      onClick={duplicate}
      disabled={loading}
      className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
    >
      <Copy size={12} />
      {loading ? 'Duplicando...' : 'Duplica'}
    </button>
  );
}
