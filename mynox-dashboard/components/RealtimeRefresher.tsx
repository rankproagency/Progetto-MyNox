'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

// Tabelle che hanno club_id diretto — filtrate server-side per evitare
// che il payload WebSocket contenga dati di altri club.
const TABLES_WITH_CLUB_ID = new Set(['events', 'club_staff', 'tables', 'promo_codes', 'club_tables']);

interface Props {
  tables: string[];
  clubId: string;
}

export default function RealtimeRefresher({ tables, clubId }: Props) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channels = tables.map((table) => {
      const hasClubId = TABLES_WITH_CLUB_ID.has(table);
      const channelOpts = hasClubId
        ? { event: '*' as const, schema: 'public', table, filter: `club_id=eq.${clubId}` }
        : { event: '*' as const, schema: 'public', table };

      return supabase
        .channel(`realtime:${table}:${clubId}`)
        .on('postgres_changes', channelOpts, () => router.refresh())
        .subscribe();
    });

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [clubId, router, tables]);

  return null;
}
