'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Check, X } from 'lucide-react';

interface Club { id: string; name: string }

interface Props {
  userId: string;
  currentRole: string;
  currentClubId: string | null;
  clubs: Club[];
}

export default function UserRoleEditor({ userId, currentRole, currentClubId, clubs }: Props) {
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState(currentRole);
  const [clubId, setClubId] = useState(currentClubId ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    const supabase = createClient();
    await supabase
      .from('profiles')
      .update({ role, club_id: clubId || null })
      .eq('id', userId);
    setSaving(false);
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2000);
  }

  const ROLE_STYLES: Record<string, string> = {
    admin:      'bg-purple-500/10 text-purple-400 border-purple-500/20',
    club_admin: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    customer:   'bg-slate-500/10 text-slate-400 border-slate-500/20',
  };
  const ROLE_LABELS: Record<string, string> = { admin: 'Admin', club_admin: 'Discoteca', customer: 'Cliente' };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-opacity hover:opacity-70 cursor-pointer ${ROLE_STYLES[role] ?? ROLE_STYLES.customer}`}
        title="Clicca per modificare ruolo"
      >
        {saved ? '✓ Salvato' : (ROLE_LABELS[role] ?? role)}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <select
        value={role}
        onChange={(e) => setRole(e.target.value)}
        className="text-xs bg-[#0d0d14] border border-white/20 rounded-md px-2 py-1 text-white focus:outline-none focus:border-purple-500/60"
      >
        <option value="customer">Cliente</option>
        <option value="club_admin">Discoteca</option>
        <option value="admin">Admin</option>
      </select>
      {role === 'club_admin' && (
        <select
          value={clubId}
          onChange={(e) => setClubId(e.target.value)}
          className="text-xs bg-[#0d0d14] border border-white/20 rounded-md px-2 py-1 text-white focus:outline-none focus:border-purple-500/60"
        >
          <option value="">— nessun club —</option>
          {clubs.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      )}
      <button onClick={save} disabled={saving} className="p-1 text-green-400 hover:text-green-300 transition-colors">
        <Check size={14} />
      </button>
      <button onClick={() => { setEditing(false); setRole(currentRole); setClubId(currentClubId ?? ''); }} className="p-1 text-slate-500 hover:text-slate-300 transition-colors">
        <X size={14} />
      </button>
    </div>
  );
}
