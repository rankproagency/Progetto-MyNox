'use client';

import { useState, useTransition } from 'react';
import { UserPlus, Trash2 } from 'lucide-react';
import type { ClubStaff } from '@/types';

const PERMISSION_LABELS: { key: keyof Pick<ClubStaff, 'can_manage_events' | 'can_manage_tables' | 'can_view_analytics' | 'can_view_participants'>; label: string }[] = [
  { key: 'can_manage_events', label: 'Gestione eventi' },
  { key: 'can_manage_tables', label: 'Tavoli & piantina' },
  { key: 'can_view_analytics', label: 'Analytics' },
  { key: 'can_view_participants', label: 'Lista partecipanti' },
];

interface Props {
  initialStaff: ClubStaff[];
}

export default function StaffManager({ initialStaff }: Props) {
  const [staff, setStaff] = useState<ClubStaff[]>(initialStaff);
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [isPending, startTransition] = useTransition();

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviteError('');
    setInviteSuccess('');
    setInviting(true);
    try {
      const res = await fetch('/api/club/invite-staff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) {
        setInviteError(json.error ?? 'Errore durante l\'invito');
      } else {
        setInviteSuccess(`Invito inviato a ${email}`);
        setEmail('');
      }
    } catch {
      setInviteError('Errore di rete');
    } finally {
      setInviting(false);
    }
  }

  async function togglePermission(
    memberId: string,
    key: keyof Pick<ClubStaff, 'can_manage_events' | 'can_manage_tables' | 'can_view_analytics' | 'can_view_participants'>,
    value: boolean,
  ) {
    setStaff((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, [key]: value } : m)),
    );

    startTransition(async () => {
      await fetch('/api/club/update-staff-permissions', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffId: memberId, key, value }),
      });
    });
  }

  async function handleRemove(memberId: string) {
    if (!confirm('Rimuovere questo membro dallo staff?')) return;
    setStaff((prev) => prev.filter((m) => m.id !== memberId));
    await fetch('/api/club/update-staff-permissions', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staffId: memberId }),
    });
  }

  return (
    <div className="space-y-6">
      {/* Invite form */}
      <div className="bg-[#111118] border border-white/8 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-white mb-4">Invita nuovo membro</h2>
        <form onSubmit={handleInvite} className="flex gap-3">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@esempio.com"
            required
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/30"
          />
          <button
            type="submit"
            disabled={inviting}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
          >
            <UserPlus size={15} />
            {inviting ? 'Invio...' : 'Invita'}
          </button>
        </form>
        {inviteError && <p className="mt-2 text-xs text-red-400">{inviteError}</p>}
        {inviteSuccess && <p className="mt-2 text-xs text-green-400">{inviteSuccess}</p>}
      </div>

      {/* Staff list */}
      <div className="bg-[#111118] border border-white/8 rounded-xl overflow-hidden">
        {staff.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <p className="text-slate-400 font-medium mb-1">Nessun membro nello staff</p>
            <p className="text-slate-500 text-xs">Invita qualcuno usando il modulo qui sopra.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8">
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Membro</th>
                {PERMISSION_LABELS.map((p) => (
                  <th key={p.key} className="text-center px-3 py-3 text-slate-400 font-medium text-xs">
                    {p.label}
                  </th>
                ))}
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={member.id} className="border-b border-white/5 last:border-b-0 hover:bg-white/3 transition-colors">
                  <td className="px-5 py-4">
                    <p className="text-white font-medium">{member.profiles?.name ?? '—'}</p>
                    <p className="text-slate-500 text-xs">{member.profiles?.email ?? ''}</p>
                  </td>
                  {PERMISSION_LABELS.map((p) => (
                    <td key={p.key} className="px-3 py-4 text-center">
                      <button
                        onClick={() => togglePermission(member.id, p.key, !member[p.key])}
                        disabled={isPending}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${
                          member[p.key] ? 'bg-purple-600' : 'bg-white/10'
                        }`}
                        role="switch"
                        aria-checked={member[p.key]}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                            member[p.key] ? 'translate-x-4' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </td>
                  ))}
                  <td className="px-5 py-4 text-right">
                    <button
                      onClick={() => handleRemove(member.id)}
                      className="text-slate-500 hover:text-red-400 transition-colors"
                      title="Rimuovi"
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
