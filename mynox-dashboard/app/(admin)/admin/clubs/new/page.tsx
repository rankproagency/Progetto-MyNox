'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { ArrowLeft, ImagePlus, Loader2 } from 'lucide-react';
import { createClubWithManager, updateClubImageUrl } from './actions';

export default function NewClubPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '', city: '', address: '',
    instagram: '', tiktok: '', email: '', phone: '',
    managerEmail: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

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

    const result = await createClubWithManager({
      club: {
        name: form.name,
        city: form.city || null,
        address: form.address || null,
        instagram: form.instagram || null,
        tiktok: form.tiktok || null,
        email: form.email || null,
        phone: form.phone || null,
      },
      manager: {
        email: form.managerEmail,
      },
      dashboardUrl: window.location.origin,
    });

    if ('error' in result) {
      setError(result.error);
      setSaving(false);
      return;
    }

    if (result.existingUser) {
      setNotice('Utente già registrato — gli è stata inviata un\'email per impostare la password della dashboard.');
    }

    // Carica immagine se presente
    if (imageFile) {
      const supabase = createClient();
      const ext = imageFile.name.split('.').pop();
      const path = `clubs/${result.id}/cover.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('club-images')
        .upload(path, imageFile, { upsert: true });

      if (uploadErr) {
        setError(`Discoteca creata, ma errore nel caricamento immagine: ${uploadErr.message}`);
        setSaving(false);
        return;
      }

      const { data: urlData } = supabase.storage.from('club-images').getPublicUrl(path);
      await updateClubImageUrl(result.id, urlData.publicUrl);
    }

    router.push('/admin/clubs');
  }

  return (
    <div>
      <button onClick={() => router.back()} className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition-colors">
        <ArrowLeft size={16} /> Torna alle discoteche
      </button>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Nuova discoteca</h1>
        <p className="text-slate-400 mt-1">Crea il profilo della discoteca e l&apos;account del gestore in un solo passaggio.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 max-w-2xl">

        {/* Sezione club */}
        <div className="space-y-5">
          <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Informazioni club</h2>

          <Field label="Immagine copertina">
            <label className={`flex items-center gap-3 cursor-pointer px-3 py-2.5 rounded-lg border border-dashed border-white/20 hover:border-purple-500/50 transition-colors ${saving ? 'opacity-50 pointer-events-none' : ''}`}>
              <ImagePlus size={15} className="text-slate-500 shrink-0" />
              <span className="text-sm text-slate-400">
                {imageFile ? imageFile.name : 'Scegli file dal computer'}
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} disabled={saving} />
            </label>
            {imagePreview && (
              <div className="mt-3 w-full aspect-video max-h-56 rounded-lg overflow-hidden border border-white/10">
                <img src={imagePreview} alt="Anteprima" className="w-full h-full object-cover" />
              </div>
            )}
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Nome *">
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClass} placeholder="Es. Alter Ego" />
            </Field>
            <Field label="Città">
              <input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className={inputClass} placeholder="Es. Padova" />
            </Field>
          </div>

          <Field label="Indirizzo">
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inputClass} placeholder="Es. Via Roma 1, Padova" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Instagram (@)">
              <input value={form.instagram} onChange={(e) => setForm({ ...form, instagram: e.target.value })} className={inputClass} placeholder="alterego_pd" />
            </Field>
            <Field label="TikTok (@)">
              <input value={form.tiktok} onChange={(e) => setForm({ ...form, tiktok: e.target.value })} className={inputClass} placeholder="alterego_pd" />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Email club">
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={inputClass} placeholder="info@alterego.it" />
            </Field>
            <Field label="Telefono">
              <input type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={inputClass} placeholder="+39 049 000 0000" />
            </Field>
          </div>
        </div>

        {/* Separatore */}
        <div className="border-t border-white/8" />

        {/* Sezione account gestore */}
        <div className="space-y-5">
          <div>
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account gestore</h2>
            <p className="text-xs text-slate-500 mt-1">Credenziali con cui il gestore accederà alla dashboard.</p>
          </div>

          <Field label="Email gestore *">
            <input required type="email" value={form.managerEmail} onChange={(e) => setForm({ ...form, managerEmail: e.target.value })} className={inputClass} placeholder="manager@alterego.it" />
          </Field>
          <p className="text-xs text-slate-500">Il gestore riceverà un'email con un link per impostare la propria password. Il link è monouso e scade dopo 24 ore.</p>
        </div>

        {error && <p className="text-red-400 text-sm">{error}</p>}
        {notice && <p className="text-amber-400 text-sm bg-amber-400/10 border border-amber-400/20 rounded-lg px-4 py-3">{notice}</p>}

        <div className="flex items-center gap-3">
          <button type="submit" disabled={saving}
            className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors">
            {saving && <Loader2 size={14} className="animate-spin" />}
            {saving ? 'Creazione in corso...' : 'Crea discoteca'}
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
