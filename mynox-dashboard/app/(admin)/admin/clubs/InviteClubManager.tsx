'use client';

import { useState } from 'react';
import { Mail, X, Send } from 'lucide-react';

interface Props {
  clubId: string;
  clubName: string;
}

export function InviteClubManager({ clubId, clubName }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setErrorMsg('');

    const res = await fetch('/api/admin/invite-club', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, clubId, clubName }),
    });

    const json = await res.json();
    setLoading(false);

    if (!res.ok) {
      setResult('error');
      setErrorMsg(json.error ?? 'Errore sconosciuto');
    } else {
      setResult('success');
      setEmail('');
      setTimeout(() => { setOpen(false); setResult(null); }, 2000);
    }
  }

  return (
    <>
      <button
        onClick={() => { setOpen(true); setResult(null); setErrorMsg(''); }}
        className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
        title="Invita gestore"
      >
        <Mail size={14} />
        Invita
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#111118] border border-white/10 rounded-xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-white font-semibold text-lg">Invita gestore</h2>
                <p className="text-slate-400 text-sm mt-0.5">{clubName}</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white transition-colors">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">
                  Email del gestore
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="gestore@discoteca.it"
                  className="w-full bg-[#0d0d14] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 transition-colors"
                />
              </div>

              <p className="text-xs text-slate-500">
                Il gestore riceverà una mail con un link per impostare la propria password e accedere alla dashboard di <span className="text-slate-300">{clubName}</span>.
              </p>

              {result === 'error' && (
                <p className="text-red-400 text-sm">{errorMsg}</p>
              )}
              {result === 'success' && (
                <p className="text-green-400 text-sm">Invito inviato con successo!</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white text-sm font-semibold py-2.5 rounded-lg transition-colors"
              >
                {loading ? (
                  'Invio in corso...'
                ) : (
                  <>
                    <Send size={14} />
                    Invia invito
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
