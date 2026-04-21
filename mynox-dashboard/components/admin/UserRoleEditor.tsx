'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Check } from 'lucide-react';

interface Club {
  id: string;
  name: string;
}

interface Props {
  userId: string;
  initialRole: string;
  initialClubId: string | null;
  clubs: Club[];
}

export default function UserRoleEditor({ userId, initialRole, initialClubId, clubs }: Props) {
  const [role, setRole] = useState(initialRole);
  const [clubId, setClubId] = useState(initialClubId ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    const supabase = createClient();
    await supabase
      .from('profiles')
      .update({
        role,
        club_id: role === 'club_admin' && clubId ? clubId : null,
      })
      .eq('id', userId);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="bg-[#0d0e1a] border border-white/10 text-slate-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-purple-500"
      >
        <option value="customer">Cliente</option>
        <option value="club_admin">Discoteca</option>
        <option value="admin">Admin</option>
      </select>

      {role === 'club_admin' && (
        <select
          value={clubId}
          onChange={(e) => setClubId(e.target.value)}
          className="bg-[#0d0e1a] border border-white/10 text-slate-300 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-purple-500"
        >
          <option value="">— Seleziona club —</option>
          {clubs.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}

      <button
        onClick={save}
        disabled={saving}
        className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border transition-colors disabled:opacity-40 bg-purple-600/20 text-purple-400 border-purple-500/30 hover:bg-purple-600/30"
      >
        {saved ? <><Check size={11} /> Salvato</> : saving ? '...' : 'Salva'}
      </button>
    </div>
  );
}
