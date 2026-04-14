'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

    if (authError) {
      setError('Email o password non corretti.');
      setLoading(false);
      return;
    }

    // Il middleware gestisce il redirect in base al ruolo
    router.refresh();
  }

  return (
    <Card className="w-full max-w-sm bg-[#111118] border-white/8">
      <CardHeader className="text-center pb-6">
        <div className="text-2xl font-black tracking-widest text-white mb-1">MYNOX</div>
        <CardTitle className="text-lg font-semibold text-white">Dashboard</CardTitle>
        <CardDescription className="text-slate-400">
          Accedi con il tuo account
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-slate-300 text-sm">Email</Label>
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
            <Label htmlFor="password" className="text-slate-300 text-sm">Password</Label>
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
          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}
          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold"
          >
            {loading ? 'Accesso...' : 'Accedi'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
