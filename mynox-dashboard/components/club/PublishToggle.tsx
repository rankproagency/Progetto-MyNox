'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Props {
  eventId: string;
  isPublished: boolean;
}

export default function PublishToggle({ eventId, isPublished: initial }: Props) {
  const [published, setPublished] = useState(initial);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const supabase = createClient();
    const next = !published;
    const { error } = await supabase.from('events').update({ is_published: next }).eq('id', eventId);
    if (!error) setPublished(next);
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
        published
          ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20'
          : 'bg-slate-500/10 text-slate-400 border-slate-500/20 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/20'
      } ${loading ? 'opacity-50' : ''}`}
      title={published ? 'Clicca per mettere in bozza' : 'Clicca per pubblicare'}
    >
      {loading ? '...' : published ? 'Pubblicato' : 'Bozza'}
    </button>
  );
}
