'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Props {
  eventId: string;
  initialPublished: boolean;
}

export default function PublishToggle({ eventId, initialPublished }: Props) {
  const [published, setPublished] = useState(initialPublished);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase
      .from('events')
      .update({ is_published: !published })
      .eq('id', eventId);
    if (!error) setPublished((p) => !p);
    setLoading(false);
  }

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors disabled:opacity-50 ${
        published
          ? 'bg-green-500/10 text-green-400 border-green-500/20 hover:bg-green-500/20'
          : 'bg-slate-500/10 text-slate-400 border-slate-500/20 hover:bg-slate-500/20'
      }`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${published ? 'bg-green-400' : 'bg-slate-400'}`} />
      {loading ? '...' : published ? 'Pubblicato' : 'Bozza'}
    </button>
  );
}
