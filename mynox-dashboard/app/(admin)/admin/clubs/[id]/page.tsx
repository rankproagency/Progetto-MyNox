'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, ImagePlus, Loader2 } from 'lucide-react';

export default function AdminEditClubPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', city: '', address: '',
    instagram: '', tiktok: '', email: '', phone: '',
  });
  const [currentImageUrl, setCurrentImageUrl] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data } = await supabase.from('clubs').select('*').eq('id', id).single();
      if (data) {
        setForm({
          name: data.name ?? '',
          city: data.city ?? '',
          address: data.address ?? '',
          instagram: data.instagram ?? '',
          tiktok: data.tiktok ?? '',
          email: data.email ?? '',
          phone: data.phone ?? '',
        });
        setCurrentImageUrl(data.image_url ?? '');
      }
      setLoading(false);
    }
    load();
  }, [id]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');

    let imageUrl = currentImageUrl;

    if (imageFile) {
      const supabase = createClient();
      const ext = imageFile.name.split('.').pop();
      const path = `clubs/${id}/cover.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('club-images')
        .upload(path, imageFile, { upsert: true });

      if (uploadErr) {
        setError(`Errore caricamento immagine: ${uploadErr.message}`);
        setSaving(false);
        return;
      }

      const { data } = supabase.storage.from('club-images').getPublicUrl(path);
      imageUrl = data.publicUrl;
    }

    const supabase = createClient();
    const { error: err } = await supabase.from('clubs').update({
      name: form.name,
      city: form.city || null,
      address: form.address || null,
      image_url: imageUrl || null,
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

  const previewSrc = imagePreview ?? (currentImageUrl || null);

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

        <Field label="Immagine copertina">
          <label className={`flex items-center gap-3 cursor-pointer px-3 py-2.5 rounded-lg border border-dashed border-white/20 hover:border-purple-500/50 transition-colors ${saving ? 'opacity-50 pointer-events-none' : ''}`}>
            <ImagePlus size={15} className="text-slate-500 shrink-0" />
            <span className="text-sm text-slate-400">
              {imageFile ? imageFile.name : 'Sostituisci immagine'}
            </span>
            <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={saving} />
          </label>
          {previewSrc && (
            <div className="mt-3 w-full aspect-video max-h-56 rounded-lg overflow-hidden border border-white/10">
              <img src={previewSrc} alt="Anteprima" className="w-full h-full object-cover" />
            </div>
          )}
        </Field>

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

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors">
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? 'Salvataggio...' : 'Salva modifiche'}
          </button>
          <button type="button" onClick={() => router.back()}
            className="text-slate-400 hover:text-white text-sm px-4 py-2.5 rounded-lg hover:bg-white/5 transition-colors">
            Annulla
          </button>
        </div>
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
