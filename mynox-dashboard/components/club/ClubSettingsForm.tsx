'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Club {
  id: string;
  name: string;
  city: string;
  address: string | null;
  image_url: string | null;
  instagram: string | null;
  tiktok: string | null;
  email: string | null;
  phone: string | null;
}

export default function ClubSettingsForm({ club }: { club: Club }) {
  const [form, setForm] = useState({
    name: club.name,
    city: club.city,
    address: club.address ?? '',
    image_url: club.image_url ?? '',
    instagram: club.instagram ?? '',
    tiktok: club.tiktok ?? '',
    email: club.email ?? '',
    phone: club.phone ?? '',
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    const supabase = createClient();
    const { error: updateError } = await supabase.from('clubs').update({
      name: form.name,
      city: form.city,
      address: form.address || null,
      image_url: form.image_url || null,
      instagram: form.instagram || null,
      tiktok: form.tiktok || null,
      email: form.email || null,
      phone: form.phone || null,
    }).eq('id', club.id);

    setLoading(false);
    if (updateError) { setError(updateError.message); return; }
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">

      {/* Info base */}
      <section className="space-y-5">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider border-b border-white/8 pb-3">Informazioni</h2>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Nome club *">
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nome della discoteca" className={inputClass} />
          </Field>
          <Field label="Città">
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="es. Padova" className={inputClass} />
          </Field>
        </div>

        <Field label="Indirizzo">
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="es. Via Roma 1, Padova" className={inputClass} />
        </Field>

        <Field label="URL immagine">
          <input type="url" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })}
            placeholder="https://..." className={inputClass} />
        </Field>
      </section>

      {/* Social */}
      <section className="space-y-5">
        <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider border-b border-white/8 pb-3">Social & Contatti</h2>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Instagram">
            <div className="flex items-center">
              <span className="bg-[#0d0d14] border border-r-0 border-white/10 rounded-l-lg px-3 py-2.5 text-sm text-slate-500">@</span>
              <input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                placeholder="username" className={inputClass + ' rounded-l-none border-l-0'} />
            </div>
          </Field>
          <Field label="TikTok">
            <div className="flex items-center">
              <span className="bg-[#0d0d14] border border-r-0 border-white/10 rounded-l-lg px-3 py-2.5 text-sm text-slate-500">@</span>
              <input value={form.tiktok} onChange={(e) => setForm({ ...form, tiktok: e.target.value })}
                placeholder="username" className={inputClass + ' rounded-l-none border-l-0'} />
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Email">
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="info@tuoclub.it" className={inputClass} />
          </Field>
          <Field label="Telefono">
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+39 049 000 0000" className={inputClass} />
          </Field>
        </div>
      </section>

      {error && <p className="text-red-400 text-sm bg-red-400/5 border border-red-400/20 rounded-lg px-4 py-3">{error}</p>}
      {success && <p className="text-green-400 text-sm bg-green-400/5 border border-green-400/20 rounded-lg px-4 py-3">Modifiche salvate.</p>}

      <div className="pt-2 border-t border-white/8">
        <button type="submit" disabled={loading}
          className="bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors">
          {loading ? 'Salvataggio...' : 'Salva modifiche'}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  'w-full bg-[#0d0d14] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 transition-colors';
