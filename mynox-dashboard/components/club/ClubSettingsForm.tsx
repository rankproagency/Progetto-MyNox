'use client';

import { useState, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Camera, Globe, Mail, Phone, MapPin, Building2, Loader2, CheckCircle, AlertCircle, Lock } from 'lucide-react';

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
  latitude?: number | null;
  longitude?: number | null;
}

async function geocodeAddress(address: string, city: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const query = encodeURIComponent(`${address}, ${city}, Italia`);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${query}&format=json&limit=1`,
      { headers: { 'User-Agent': 'MyNox/1.0 (mynox.app)' } },
    );
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
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
  const [uploadingImage, setUploadingImage] = useState(false);
  const [success, setSuccess] = useState(false);
  const [geocoded, setGeocoded] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Carica un file immagine (JPG, PNG, WebP).');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("L'immagine non può superare 5MB.");
      return;
    }

    setUploadingImage(true);
    setError('');
    const supabase = createClient();
    const ext = file.name.split('.').pop();
    const path = `clubs/${club.id}/cover.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('club-images')
      .upload(path, file, { upsert: true });

    if (uploadError) {
      setError('Errore nel caricamento immagine: ' + uploadError.message);
      setUploadingImage(false);
      return;
    }

    const { data } = supabase.storage.from('club-images').getPublicUrl(path);
    setForm((prev) => ({ ...prev, image_url: data.publicUrl + '?t=' + Date.now() }));
    setUploadingImage(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    setGeocoded(false);

    // Geocoding automatico quando l'indirizzo è valorizzato
    let coords: { lat: number; lng: number } | null = null;
    const addressChanged =
      form.address.trim() !== '' &&
      form.address.trim() !== (club.address ?? '').trim();

    if (form.address.trim()) {
      coords = await geocodeAddress(form.address, form.city);
    }

    const supabase = createClient();
    const updatePayload: Record<string, unknown> = {
      name: form.name,
      city: form.city,
      address: form.address || null,
      image_url: form.image_url || null,
      instagram: form.instagram || null,
      tiktok: form.tiktok || null,
      email: form.email || null,
      phone: form.phone || null,
    };

    // Salva le coordinate solo se il geocoding ha avuto successo
    if (coords) {
      updatePayload.latitude = coords.lat;
      updatePayload.longitude = coords.lng;
      setGeocoded(true);
    }

    const { error: updateError } = await supabase
      .from('clubs')
      .update(updatePayload)
      .eq('id', club.id);

    setLoading(false);
    if (updateError) { setError(updateError.message); return; }
    setSuccess(true);
    setTimeout(() => { setSuccess(false); setGeocoded(false); }, 5000);
  }

  return (
    <>
    <form onSubmit={handleSubmit} className="max-w-2xl space-y-8">

      {/* Cover + avatar preview */}
      <div className="relative rounded-2xl overflow-hidden bg-[#0d0d14] border border-white/8">
        {/* Cover */}
        <div className="h-40 relative">
          {form.image_url ? (
            <img src={form.image_url} alt="Cover club" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-900/30 to-[#0d0d14]">
              <Building2 size={40} className="text-slate-600" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d14]/80 to-transparent" />
        </div>

        {/* Info sotto la cover */}
        <div className="px-6 pb-5 pt-3 flex items-end justify-between">
          <div>
            <p className="text-white font-bold text-xl">{form.name || 'Nome club'}</p>
            <p className="text-slate-400 text-sm flex items-center gap-1.5 mt-0.5">
              <MapPin size={12} />
              {form.city || 'Città'}{form.address ? ` · ${form.address}` : ''}
            </p>
          </div>

          {/* Bottone upload */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingImage}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/15 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {uploadingImage
              ? <><Loader2 size={13} className="animate-spin" /> Caricamento...</>
              : <><Camera size={13} /> Cambia foto</>
            }
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
      </div>

      {/* Informazioni base */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider pb-2 border-b border-white/8">
          Informazioni
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Nome club *" icon={<Building2 size={14} />}>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nome della discoteca"
              className={inputClass}
            />
          </Field>
          <Field label="Città" icon={<MapPin size={14} />}>
            <input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="es. Padova"
              className={inputClass}
            />
          </Field>
        </div>

        <Field label="Indirizzo" icon={<MapPin size={14} />}>
          <input
            value={form.address}
            onChange={(e) => setForm({ ...form, address: e.target.value })}
            placeholder="es. Via Roma 1, 35122 Padova"
            className={inputClass}
          />
        </Field>
      </section>

      {/* Social & Contatti */}
      <section className="space-y-4">
        <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider pb-2 border-b border-white/8">
          Social & Contatti
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Instagram" icon={<Globe size={14} />}>
            <div className="flex">
              <span className="bg-[#0d0d14] border border-r-0 border-white/10 rounded-l-lg px-3 flex items-center text-sm text-slate-500">@</span>
              <input
                value={form.instagram}
                onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                placeholder="username"
                className={inputClass + ' rounded-l-none border-l-0'}
              />
            </div>
          </Field>

          <Field label="TikTok" icon={<Globe size={14} />}>
            <div className="flex">
              <span className="bg-[#0d0d14] border border-r-0 border-white/10 rounded-l-lg px-3 flex items-center text-sm text-slate-500">@</span>
              <input
                value={form.tiktok}
                onChange={(e) => setForm({ ...form, tiktok: e.target.value })}
                placeholder="username"
                className={inputClass + ' rounded-l-none border-l-0'}
              />
            </div>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Email" icon={<Mail size={14} />}>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="info@tuoclub.it"
              className={inputClass}
            />
          </Field>
          <Field label="Telefono" icon={<Phone size={14} />}>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+39 049 000 0000"
              className={inputClass}
            />
          </Field>
        </div>
      </section>

      {/* Feedback */}
      {error && (
        <div className="flex items-start gap-3 text-red-400 text-sm bg-red-400/5 border border-red-400/20 rounded-xl px-4 py-3">
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-400/5 border border-green-400/20 rounded-xl px-4 py-3 space-y-1">
          <div className="flex items-center gap-3 text-green-400 text-sm">
            <CheckCircle size={16} className="shrink-0" />
            Modifiche salvate con successo.
          </div>
          {geocoded && (
            <div className="flex items-center gap-2 text-xs text-green-400/70 pl-7">
              <MapPin size={11} />
              Posizione aggiornata — la discoteca apparirà nella mappa dell&apos;app.
            </div>
          )}
          {!geocoded && form.address && (
            <div className="flex items-center gap-2 text-xs text-amber-400/70 pl-7">
              <MapPin size={11} />
              Indirizzo non trovato sulla mappa. Verifica che sia nel formato &quot;Via Roma 1, Padova&quot;.
            </div>
          )}
        </div>
      )}

      <div className="pt-2 border-t border-white/8 flex items-center gap-4">
        <button
          type="submit"
          disabled={loading || uploadingImage}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          {loading ? 'Salvataggio...' : 'Salva modifiche'}
        </button>
        <p className="text-xs text-slate-500">Le modifiche sono visibili nell&apos;app MyNox in tempo reale.</p>
      </div>
    </form>

    {/* Sezione sicurezza — separata dal form principale */}
    <div className="max-w-2xl mt-10 space-y-6">
      <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider pb-2 border-b border-white/8 flex items-center gap-2">
        <Lock size={13} /> Sicurezza account
      </h2>
      <EmailChangeForm />
      <PasswordChangeForm />
    </div>
    </>
  );
}

function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="flex items-center gap-1.5 text-xs font-medium text-slate-400 uppercase tracking-wide">
        {icon && <span className="text-slate-500">{icon}</span>}
        {label}
      </label>
      {children}
    </div>
  );
}

const inputClass =
  'w-full bg-[#0d0d14] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 transition-colors';

function EmailChangeForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user?.email ?? '',
      password: currentPassword,
    });
    if (signInErr) {
      setError('Password non corretta.');
      setLoading(false);
      return;
    }

    const { error: err } = await supabase.auth.updateUser({ email: newEmail });
    setLoading(false);
    if (err) { setError(err.message); return; }
    setSuccess(true);
    setCurrentPassword('');
    setNewEmail('');
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[#0d0d14] border border-white/8 rounded-xl p-5 space-y-4">
      <div>
        <p className="text-sm font-medium text-white">Cambia email</p>
        <p className="text-xs text-slate-500 mt-0.5">Riceverai un link di conferma al nuovo indirizzo prima che il cambio diventi effettivo.</p>
      </div>
      <Field label="Password attuale">
        <input
          required
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="••••••••"
          className={inputClass}
        />
      </Field>
      <Field label="Nuova email">
        <input
          required
          type="email"
          value={newEmail}
          onChange={(e) => setNewEmail(e.target.value)}
          placeholder="nuova@email.it"
          className={inputClass}
        />
      </Field>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {success && (
        <div className="flex items-center gap-2 text-green-400 text-sm">
          <CheckCircle size={14} /> Controlla la tua nuova email per confermare il cambio.
        </div>
      )}
      <button type="submit" disabled={loading}
        className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
        {loading && <Loader2 size={13} className="animate-spin" />}
        {loading ? 'Invio...' : 'Aggiorna email'}
      </button>
    </form>
  );
}

function PasswordChangeForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setError('Le password non coincidono.');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess(false);
    const supabase = createClient();

    const { data: { user } } = await supabase.auth.getUser();
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: user?.email ?? '',
      password: currentPassword,
    });
    if (signInErr) {
      setError('Password attuale non corretta.');
      setLoading(false);
      return;
    }

    const { error: updateErr } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);
    if (updateErr) { setError(updateErr.message); return; }
    setSuccess(true);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[#0d0d14] border border-white/8 rounded-xl p-5 space-y-4">
      <div>
        <p className="text-sm font-medium text-white">Cambia password</p>
        <p className="text-xs text-slate-500 mt-0.5">Inserisci la password attuale per confermare la tua identità.</p>
      </div>
      <Field label="Password attuale">
        <input
          required
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          placeholder="••••••••"
          className={inputClass}
        />
      </Field>
      <Field label="Nuova password">
        <input
          required
          type="password"
          minLength={6}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Minimo 6 caratteri"
          className={inputClass}
        />
      </Field>
      <Field label="Conferma nuova password">
        <input
          required
          type="password"
          minLength={6}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Ripeti la nuova password"
          className={inputClass}
        />
      </Field>
      {error && <p className="text-sm text-red-400">{error}</p>}
      {success && (
        <div className="flex items-center gap-2 text-green-400 text-sm">
          <CheckCircle size={14} /> Password aggiornata con successo.
        </div>
      )}
      <button type="submit" disabled={loading}
        className="flex items-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
        {loading && <Loader2 size={13} className="animate-spin" />}
        {loading ? 'Aggiornamento...' : 'Aggiorna password'}
      </button>
    </form>
  );
}
