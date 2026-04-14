'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Plus, Trash2 } from 'lucide-react';

const GENRES = ['Techno', 'House', 'Deep House', 'Latin', 'Hip-Hop', 'Pop', 'R&B', 'Reggaeton', 'Commercial'];

interface TicketTypeRow {
  id?: string;
  label: string;
  price: string;
  total_quantity: string;
  includes_drink: boolean;
}

interface EventFormProps {
  clubId: string;
  event?: {
    id: string;
    name: string;
    description: string | null;
    date: string;
    start_time: string;
    end_time: string | null;
    dress_code: string | null;
    capacity: number;
    genres: string[];
    is_published: boolean;
    image_url: string | null;
  };
  initialTicketTypes?: TicketTypeRow[];
}

export default function EventForm({ clubId, event, initialTicketTypes }: EventFormProps) {
  const router = useRouter();
  const isEdit = !!event;

  const [form, setForm] = useState({
    name: event?.name ?? '',
    description: event?.description ?? '',
    date: event?.date ?? '',
    start_time: event?.start_time ?? '',
    end_time: event?.end_time ?? '',
    dress_code: event?.dress_code ?? '',
    capacity: event?.capacity?.toString() ?? '',
    image_url: event?.image_url ?? '',
    genres: event?.genres ?? [] as string[],
    is_published: event?.is_published ?? false,
  });

  const [ticketTypes, setTicketTypes] = useState<TicketTypeRow[]>(
    initialTicketTypes ?? [{ label: '', price: '', total_quantity: '', includes_drink: true }]
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    const supabase = createClient();
    const ext = file.name.split('.').pop();
    const path = `${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('event-images')
      .upload(path, file, { upsert: true });
    if (uploadError) {
      setError('Errore upload immagine: ' + uploadError.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from('event-images').getPublicUrl(path);
    setForm((prev) => ({ ...prev, image_url: data.publicUrl }));
    setUploading(false);
  }

  function toggleGenre(genre: string) {
    setForm((prev) => ({
      ...prev,
      genres: prev.genres.includes(genre)
        ? prev.genres.filter((g) => g !== genre)
        : [...prev.genres, genre],
    }));
  }

  function addTicketType() {
    setTicketTypes((prev) => [...prev, { label: '', price: '', total_quantity: '', includes_drink: true }]);
  }

  function removeTicketType(index: number) {
    setTicketTypes((prev) => prev.filter((_, i) => i !== index));
  }

  function updateTicketType(index: number, field: keyof TicketTypeRow, value: string | boolean) {
    setTicketTypes((prev) => prev.map((t, i) => i === index ? { ...t, [field]: value } : t));
  }

  async function handleSubmit(publish: boolean) {
    setLoading(true);
    setError('');

    const supabase = createClient();
    const payload = {
      club_id: clubId,
      name: form.name,
      description: form.description || null,
      date: form.date,
      start_time: form.start_time,
      end_time: form.end_time || null,
      dress_code: form.dress_code || null,
      capacity: form.capacity ? parseInt(form.capacity) : null,
      image_url: form.image_url || null,
      genres: form.genres,
      is_published: publish,
    };

    let eventId = event?.id;

    if (isEdit) {
      const { error: updateError } = await supabase.from('events').update(payload).eq('id', event!.id);
      if (updateError) { setError(updateError.message); setLoading(false); return; }
    } else {
      const { data, error: insertError } = await supabase.from('events').insert(payload).select('id').single();
      if (insertError || !data) { setError(insertError?.message ?? 'Errore creazione evento'); setLoading(false); return; }
      eventId = data.id;
    }

    // Salva tipi biglietto: elimina i vecchi e reinserisci
    const validTickets = ticketTypes.filter((t) => t.label.trim() && t.price);
    if (validTickets.length > 0 && eventId) {
      await supabase.from('ticket_types').delete().eq('event_id', eventId);
      const { error: ticketError } = await supabase.from('ticket_types').insert(
        validTickets.map((t) => ({
          event_id: eventId,
          label: t.label.trim(),
          price: parseFloat(t.price),
          total_quantity: t.total_quantity ? parseInt(t.total_quantity) : null,
          sold_quantity: 0,
          includes_drink: t.includes_drink,
        }))
      );
      if (ticketError) { setError('Evento salvato ma errore nei biglietti: ' + ticketError.message); setLoading(false); return; }
    }

    setLoading(false);
    router.push('/club/events');
    router.refresh();
  }

  async function handleDelete() {
    if (!event || !confirm('Sei sicuro di voler eliminare questo evento?')) return;
    setLoading(true);
    const supabase = createClient();
    await supabase.from('events').delete().eq('id', event.id);
    router.push('/club/events');
    router.refresh();
  }

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-6 max-w-2xl">

      {/* Nome */}
      <Field label="Nome evento *">
        <input
          required
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="es. NEXUS — Techno Night"
          className={inputClass}
        />
      </Field>

      {/* Descrizione */}
      <Field label="Descrizione">
        <textarea
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          placeholder="Descrivi l'evento..."
          rows={3}
          className={inputClass}
        />
      </Field>

      {/* Data e orari */}
      <div className="grid grid-cols-3 gap-4">
        <Field label="Data *">
          <input
            required
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Orario inizio *">
          <input
            required
            type="time"
            value={form.start_time}
            onChange={(e) => setForm({ ...form, start_time: e.target.value })}
            className={inputClass}
          />
        </Field>
        <Field label="Orario fine">
          <input
            type="time"
            value={form.end_time}
            onChange={(e) => setForm({ ...form, end_time: e.target.value })}
            className={inputClass}
          />
        </Field>
      </div>

      {/* Capienza e dress code */}
      <div className="grid grid-cols-2 gap-4">
        <Field label="Capienza massima">
          <input
            type="number"
            min="1"
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            placeholder="es. 500"
            className={inputClass}
          />
        </Field>
        <Field label="Dress code">
          <input
            value={form.dress_code}
            onChange={(e) => setForm({ ...form, dress_code: e.target.value })}
            placeholder="es. Elegante"
            className={inputClass}
          />
        </Field>
      </div>

      {/* Immagine copertina */}
      <Field label="Immagine copertina">
        <div className="space-y-3">
          <label className={`flex items-center gap-3 cursor-pointer px-3 py-2.5 rounded-lg border border-dashed border-white/20 hover:border-purple-500/50 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            <span className="text-sm text-slate-400">{uploading ? 'Caricamento...' : 'Scegli file dal computer'}</span>
            <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} disabled={uploading} />
          </label>
          {form.image_url && (
            <img src={form.image_url} alt="Anteprima" className="w-full h-40 object-cover rounded-lg border border-white/10" />
          )}
        </div>
      </Field>

      {/* Generi musicali */}
      <Field label="Generi musicali">
        <div className="flex flex-wrap gap-2 mt-1">
          {GENRES.map((genre) => (
            <button
              key={genre}
              type="button"
              onClick={() => toggleGenre(genre)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                form.genres.includes(genre)
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'
              }`}
            >
              {genre}
            </button>
          ))}
        </div>
      </Field>

      {/* Tipi di biglietto */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">Tipi di biglietto</label>
          <button
            type="button"
            onClick={addTicketType}
            className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
          >
            <Plus size={13} />
            Aggiungi
          </button>
        </div>

        {ticketTypes.map((ticket, index) => (
          <div key={index} className="bg-[#111118] border border-white/8 rounded-lg p-4 space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <label className="block text-xs text-slate-500 mb-1">Nome biglietto</label>
                <input
                  value={ticket.label}
                  onChange={(e) => updateTicketType(index, 'label', e.target.value)}
                  placeholder="es. Donna"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Prezzo (€)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={ticket.price}
                  onChange={(e) => updateTicketType(index, 'price', e.target.value)}
                  placeholder="es. 10"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Quantità disponibile</label>
                <input
                  type="number"
                  min="0"
                  value={ticket.total_quantity}
                  onChange={(e) => updateTicketType(index, 'total_quantity', e.target.value)}
                  placeholder="es. 200"
                  className={inputClass}
                />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={ticket.includes_drink}
                  onChange={(e) => updateTicketType(index, 'includes_drink', e.target.checked)}
                  className="w-4 h-4 rounded accent-purple-500"
                />
                <span className="text-sm text-slate-400">Include free drink</span>
              </label>
              {ticketTypes.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTicketType(index)}
                  className="text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <p className="text-red-400 text-sm">{error}</p>
      )}

      {/* Azioni principali */}
      <div className="flex items-center gap-3 pt-2">
        {isEdit && event?.is_published ? (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSubmit(true)}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
            >
              {loading ? 'Salvataggio...' : 'Salva modifiche'}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSubmit(false)}
              className="bg-white/8 hover:bg-white/12 disabled:opacity-60 text-slate-300 text-sm font-semibold px-6 py-2.5 rounded-lg border border-white/10 transition-colors"
            >
              {loading ? 'Salvataggio...' : 'Metti in bozza'}
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSubmit(false)}
              className="bg-white/8 hover:bg-white/12 disabled:opacity-60 text-slate-300 text-sm font-semibold px-6 py-2.5 rounded-lg border border-white/10 transition-colors"
            >
              {loading ? 'Salvataggio...' : 'Salva come bozza'}
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => handleSubmit(true)}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
            >
              {loading ? 'Salvataggio...' : 'Pubblica evento'}
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => router.back()}
          className="text-slate-400 hover:text-slate-200 text-sm font-medium px-4 py-2.5 transition-colors"
        >
          Annulla
        </button>
      </div>

      {/* Zona pericolosa */}
      {isEdit && (
        <div className="pt-6 mt-6 border-t border-white/8">
          <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-3">Zona pericolosa</p>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading}
            className="text-sm font-medium text-red-400 hover:text-white hover:bg-red-500/10 border border-red-500/20 px-4 py-2 rounded-lg transition-colors disabled:opacity-60"
          >
            Elimina evento definitivamente
          </button>
        </div>
      )}
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
  'w-full bg-[#111118] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 transition-colors';
