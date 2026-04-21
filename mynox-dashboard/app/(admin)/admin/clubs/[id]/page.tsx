'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft } from 'lucide-react';

export default function AdminEditClubPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', city: '', address: '', image_url: '',
    instagram: '', tiktok: '', email: '', phone: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.from('clubs').select('*').eq('id', id).single();
      if (data) setForm({
        name: data.name ?? '',
        city: data.city ?? '',
        address: data.address ?? '',
        image_url: data.image_url ?? '',
        instagram: data.instagram ?? '',
        tiktok: data.tiktok ?? '',
        email: data.email ?? '',
        phone: data.phone ?? '',
      });
      setLoading(false);
    }
    load();
  }, [id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const supabase = createClient();
    const { error: err } = await supabase.from('clubs').update({
      name: form.name,
      city: form.city,
      address: form.address || null,
      image_url: form.image_url || null,
      instagram: form.instagram || null,
      tiktok: form.tiktok || null,
      email: form.email || null,
      phone: form.phone || null,
    }).eq('id', id);
    setSaving(false);
    if (err) { setError(err.message); return; }
    setSuccess(true);
    setTimeout(() => { setSuccess(false); router.push('/admin/clubs'); }, 1500);
  }

  if (loading) return <div className="text-slate-400">Caricamento...</div>;

  return (
    <div>
      <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft size={16} /> Torna alle discoteche
      </button>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Modifica discoteca</h1>
        <p className="text-slate-400 mt-1">{form.name}</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div className="grid grid-cols-2 gap-4">
          <Field label="Nome *">
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Città">
            <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputClass} />
          </Field>
        </div>
        <Field label="Indirizzo">
          <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputClass} />
        </Field>
        <Field label="URL immagine">
          <input type="url" value={form.image_url} onChange={(e) => setForm({ ...form, image_url: e.target.value })} className={inputClass} />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Instagram (@)">
            <input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} className={inputClass} />
          </Field>
          <Field label="TikTok (@)">
            <input value={form.tiktok} onChange={(e) => setForm({ ...form, tiktok: e.target.value })} className={inputClass} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Email">
            <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} />
          </Field>
          <Field label="Telefono">
            <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} />
          </Field>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}
        {success && <p className="text-green-400 text-sm">Salvato.</p>}

        <button type="submit" disabled={saving}
          className="bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors">
          {saving ? 'Salvataggio...' : 'Salva modifiche'}
        </button>
      </form>
    </div>
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

const inputClass = 'w-full bg-[#0d0d14] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 transition-colors';
