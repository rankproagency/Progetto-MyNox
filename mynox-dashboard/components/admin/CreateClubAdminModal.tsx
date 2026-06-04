'use client';

import { useState } from 'react';
import { X, Loader2, UserPlus } from 'lucide-react';
import { createClubAdminAccount } from '@/app/(admin)/admin/users/actions';
import { useRouter } from 'next/navigation';
import { useLanguage } from '@/components/providers/I18nProvider';

interface Club { id: string; name: string }

export default function CreateClubAdminModal({ clubs }: { clubs: Club[] }) {
  const router = useRouter();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [clubId, setClubId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function reset() {
    setEmail('');
    setPassword('');
    setClubId('');
    setError('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clubId) { setError(t.createClubModal.selectClub); return; }
    setSaving(true);
    setError('');
    const result = await createClubAdminAccount(email, password, clubId);
    setSaving(false);
    if (result.error) { setError(result.error); return; }
    setOpen(false);
    reset();
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
      >
        <UserPlus size={15} />
        {t.createClubModal.title}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/60" onClick={() => { setOpen(false); reset(); }} />
          <div className="relative bg-[#111118] border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-white">{t.createClubModal.title}</h2>
                <p className="text-xs text-slate-400 mt-0.5">{t.createClubModal.subtitle}</p>
              </div>
              <button onClick={() => { setOpen(false); reset(); }} className="text-slate-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">{t.createClubModal.club}</label>
                <select
                  required
                  value={clubId}
                  onChange={(e) => setClubId(e.target.value)}
                  className="w-full bg-[#0d0d14] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500/60 transition-colors"
                >
                  <option value="">{t.createClubModal.select}</option>
                  {clubs.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">{t.createClubModal.email}</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@discoteca.it"
                  className="w-full bg-[#0d0d14] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">{t.createClubModal.password}</label>
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t.createClubModal.passwordMin}
                  minLength={6}
                  className="w-full bg-[#0d0d14] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 transition-colors"
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors mt-2"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saving ? t.createClubModal.creating : t.createClubModal.create}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
