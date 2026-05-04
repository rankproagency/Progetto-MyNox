'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface Props {
  tables: string[];
  clubId: string;
}

export default function RealtimeRefresher({ tables, clubId }: Props) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channels = tables.map((table) =>
      supabase
        .channel(`realtime:${table}:${clubId}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table },
          () => router.refresh(),
        )
        .subscribe(),
    );

    return () => {
      channels.forEach((ch) => supabase.removeChannel(ch));
    };
  }, [clubId, router, tables]);

  return null;
}
