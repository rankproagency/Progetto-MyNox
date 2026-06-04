'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { CheckCircle, Loader2 } from 'lucide-react';
import { useLanguage } from '@/components/providers/I18nProvider';

export default function ResetPasswordPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const supabase = createClient();

    async function initSession() {
      // Prova prima dalla sessione esistente
      const { data: { session } } = await supabase.auth.getSession();
      if (session) { setReady(true); return; }

      // Parsa manualmente i token dal fragment hash (flusso implicit di Supabase)
      const hash = window.location.hash.substring(1);
      if (hash) {
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        if (accessToken && refreshToken) {
          const { data, error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (data.session && !error) { setReady(true); return; }
        }
      }

      // Fallback: ascolta eventi auth
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, sess) => {
        if ((event === 'PASSWORD_RECOVERY' || event === 'SIGNED_IN') && sess) {
          setReady(true);
          subscription.unsubscribe();
        }
      });
    }

    initSession();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError(t.auth.passwordMismatch);
      return;
    }
    setLoading(true);
    setError('');
    const supabase = createClient();
    const { error: err } = await supabase.auth.updateUser({ password });
    if (err) { setError(err.message); setLoading(false); return; }

    setLoading(false);
    setSuccess(true);
    setTimeout(() => router.push('/login'), 2500);
  }

  return (
    <div className="min-h-screen bg-[#07080f] flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-[#111118] border border-purple-500/20 rounded-2xl p-8">
        <div className="flex flex-col items-center gap-2 mb-8">
          <Image src="/logo.png" alt="MyNox" width={120} height={44} className="object-contain" />
          <p className="text-xs text-purple-400 tracking-widest uppercase">{t.auth.tagline}</p>
        </div>

        <h1 className="text-lg font-semibold text-white mb-1">{t.auth.newPasswordTitle}</h1>
        <p className="text-sm text-slate-400 mb-6">{t.auth.newPasswordDesc}</p>

        {success ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle size={36} className="text-green-400" />
            <p className="text-white font-medium">{t.auth.passwordSet}</p>
            <p className="text-sm text-slate-400">{t.auth.redirecting}</p>
          </div>
        ) : !ready ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Loader2 size={28} className="text-purple-400 animate-spin" />
            <p className="text-sm text-slate-400">{t.auth.verifying}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">{t.auth.newPasswordTitle}</label>
              <input
                required
                type="password"
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t.auth.passwordMin}
                className="w-full bg-[#1a1a24] border border-white/8 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">{t.auth.confirmPassword}</label>
              <input
                required
                type="password"
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder={t.auth.repeatPassword}
                className="w-full bg-[#1a1a24] border border-white/8 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500 transition-colors"
              />
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
            >
              {loading && <Loader2 size={14} className="animate-spin" />}
              {loading ? t.common.saving : t.auth.setPassword}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
