'use client';

import { useState } from 'react';
import { updateUserRole } from '@/app/(admin)/admin/users/actions';
import { Check, X } from 'lucide-react';
import { useLanguage } from '@/components/providers/I18nProvider';

interface Club { id: string; name: string }

interface Props {
  userId: string;
  currentRole: string;
  currentClubId: string | null;
  clubs: Club[];
}

export default function UserRoleEditor({ userId, currentRole, currentClubId, clubs }: Props) {
  const { t } = useLanguage();
  const [editing, setEditing] = useState(false);
  const [role, setRole] = useState(currentRole);
  const [clubId, setClubId] = useState(currentClubId ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    const result = await updateUserRole(userId, role, clubId || null);
    setSaving(false);
    if (result.error) return;
    setSaved(true);
    setEditing(false);
    setTimeout(() => setSaved(false), 2000);
  }

  const ROLE_STYLES: Record<string, string> = {
    admin:      'bg-purple-500/10 text-purple-400 border-purple-500/20',
    club_admin: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    club_staff: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
    customer:   'bg-slate-500/10 text-slate-400 border-slate-500/20',
  };
  const ROLE_LABELS: Record<string, string> = {
    admin: t.usersTable.admin,
    club_admin: t.usersTable.club,
    club_staff: t.usersTable.staff,
    customer: t.usersTable.customer,
  };

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-opacity hover:opacity-70 cursor-pointer ${ROLE_STYLES[role] ?? ROLE_STYLES.customer}`}
        title={t.common.edit}
      >
        {saved ? `✓ ${t.common.save}` : (ROLE_LABELS[role] ?? role)}
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
        <option value="customer">{t.usersTable.customer}</option>
        <option value="club_admin">{t.usersTable.club}</option>
        <option value="admin">{t.usersTable.admin}</option>
      </select>
      {role === 'club_admin' && (
        <select
          value={clubId}
          onChange={(e) => setClubId(e.target.value)}
          className="text-xs bg-[#0d0d14] border border-white/20 rounded-md px-2 py-1 text-white focus:outline-none focus:border-purple-500/60"
        >
          <option value="">—</option>
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
