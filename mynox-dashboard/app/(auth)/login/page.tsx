'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Image from 'next/image';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import { useLanguage } from '@/components/providers/I18nProvider';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isUnauthorized = searchParams.get('error') === 'unauthorized';
  const { t } = useLanguage();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Reset password
  const [showReset, setShowReset] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState('');

  // Se Supabase redirige qui con token hash (#access_token=...) invece di /auth/reset-password,
  // rileva il tipo "recovery" e reindirizza automaticamente alla pagina corretta.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const hash = window.location.hash;
    if (hash.includes('type=recovery') || hash.includes('type=invite')) {
      router.replace('/auth/reset-password' + hash);
    }
  }, [router]);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(t.auth.wrongCredentials);
      setLoading(false);
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user?.id ?? '')
      .maybeSingle();

    if (!profile || !['admin', 'club_admin', 'club_staff'].includes(profile.role)) {
      await supabase.auth.signOut();
      setError(t.auth.notAuthorized);
      setLoading(false);
      return;
    }

    router.push('/');
  }

  async function handleGoogleLogin() {
    setError('');
    setGoogleLoading(true);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (authError) {
      setError(t.auth.googleFailed);
      setGoogleLoading(false);
    }
  }

  async function handleResetPassword(e: React.FormEvent) {
    e.preventDefault();
    setResetLoading(true);
    setResetError('');

    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: resetEmail,
        redirectTo: `${window.location.origin}/auth/reset-password`,
      }),
    });

    const json = await res.json();
    setResetLoading(false);

    if (!res.ok) {
      setResetError(json.error ?? t.auth.sendError);
      return;
    }
    setResetSent(true);
  }

  return (
    <Card className="w-full max-w-sm bg-[#111118] border-purple-500/20">
      <CardHeader className="text-center pb-6">
        <div className="flex flex-col items-center gap-2 mb-4">
          <Image src="/logo.png" alt="MyNox" width={120} height={44} className="object-contain" />
          <p className="text-xs text-purple-400 tracking-widest uppercase">{t.auth.tagline}</p>
        </div>
        <CardTitle className="text-lg font-semibold text-white">
          {showReset ? t.auth.recoverTitle : t.auth.dashboard}
        </CardTitle>
        <CardDescription className="text-slate-400">
          {showReset ? t.auth.recoverDesc : t.auth.signInDesc}
        </CardDescription>
      </CardHeader>

      {isUnauthorized && !showReset && (
        <div className="mx-6 mb-0 -mt-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3">
          <p className="text-sm font-medium text-red-400">{t.auth.unauthorized}</p>
          <p className="text-xs text-red-400/70 mt-0.5">
            {t.auth.unauthorizedDesc}
          </p>
        </div>
      )}

      <CardContent>
        {showReset ? (
          /* ── Form reset password ── */
          <div className="space-y-4">
            {resetSent ? (
              <div className="flex flex-col items-center gap-3 py-4 text-center">
                <CheckCircle size={32} className="text-green-400" />
                <p className="text-white text-sm font-medium">{t.auth.emailSent}</p>
                <p className="text-xs text-slate-400">
                  {t.auth.checkEmail.replace('{email}', resetEmail)}
                </p>
              </div>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email" className="text-slate-300 text-sm">{t.auth.email}</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="email@esempio.com"
                    className="bg-[#1a1a24] border-white/8 text-white placeholder:text-slate-500 focus:border-purple-500"
                  />
                </div>
                {resetError && <p className="text-sm text-red-400">{resetError}</p>}
                <Button
                  type="submit"
                  disabled={resetLoading}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                >
                  {resetLoading ? t.auth.sending : t.auth.sendReset}
                </Button>
              </form>
            )}

            <button
              onClick={() => { setShowReset(false); setResetSent(false); setResetEmail(''); setResetError(''); }}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mx-auto"
            >
              <ArrowLeft size={12} /> {t.auth.backToLogin}
            </button>
          </div>
        ) : (
          /* ── Form login ── */
          <>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-300 text-sm">{t.auth.email}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@esempio.com"
                  required
                  className="bg-[#1a1a24] border-white/8 text-white placeholder:text-slate-500 focus:border-purple-500"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-slate-300 text-sm">{t.auth.password}</Label>
                  <button
                    type="button"
                    onClick={() => setShowReset(true)}
                    className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                  >
                    {t.auth.forgotPassword}
                  </button>
                </div>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-[#1a1a24] border-white/8 text-white placeholder:text-slate-500 focus:border-purple-500"
                />
              </div>
              {error && <p className="text-sm text-red-400">{error}</p>}
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold"
              >
                {loading ? t.auth.signingIn : t.auth.signIn}
              </Button>
            </form>

            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-white/8" />
              <span className="text-xs text-slate-500">{t.auth.or}</span>
              <div className="flex-1 h-px bg-white/8" />
            </div>

            <Button
              type="button"
              variant="outline"
              disabled={googleLoading}
              onClick={handleGoogleLogin}
              className="w-full bg-[#1a1a24] border-white/8 text-white hover:bg-white/5 flex items-center gap-2"
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
                <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
              </svg>
              {googleLoading ? t.auth.signingIn : t.auth.continueGoogle}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
