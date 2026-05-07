'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Plus, Trash2, Mic2, Music } from 'lucide-react';

interface PerformerRow {
  name: string;
  role: 'dj' | 'vocalist';
}

const GENRES = ['Techno', 'House', 'Hip-Hop', 'Trap', 'Pop', 'R&B', 'Reggaeton', 'Commercial'];

interface TicketTypeRow {
  id?: string;
  label: string;
  price: string;
  total_quantity: string;
  includes_drink: boolean;
}

interface ClubTableData {
  id: string;
  label: string;
  capacity: number;
  posX: number;
  posY: number;
  defaultDeposit: number;
}

interface EventTableRow {
  id?: string;
  clubTableId: string;
  label: string;
  capacity: number;
  deposit: string;
  defaultDeposit: number;
  isAvailable: boolean;
}

interface EventFormProps {
  clubId: string;
  clubFloorPlanUrl?: string | null;
  clubTables?: ClubTableData[];
  event?: {
    id: string;
    name: string;
    description: string | null;
    date: string;
    start_time: string;
    end_time: string | null;
    dress_code: string | null;
    min_age: number | null;
    capacity: number;
    genres: string[];
    performers: PerformerRow[];
    is_published: boolean;
    image_url: string | null;
  };
  initialTicketTypes?: TicketTypeRow[];
  initialEventTables?: EventTableRow[];
}

export default function EventForm({ clubId, clubFloorPlanUrl, clubTables, event, initialTicketTypes, initialEventTables }: EventFormProps) {
  const router = useRouter();
  const isEdit = !!event;

  const [form, setForm] = useState({
    name: event?.name ?? '',
    description: event?.description ?? '',
    date: event?.date ?? '',
    start_time: event?.start_time ?? '',
    end_time: event?.end_time ?? '',
    dress_code: event?.dress_code ?? '',
    min_age: event?.min_age?.toString() ?? '18',
    capacity: event?.capacity?.toString() ?? '',
    image_url: event?.image_url ?? '',
    genres: event?.genres ?? [] as string[],
    is_published: event?.is_published ?? false,
  });

  const [performers, setPerformers] = useState<PerformerRow[]>(
    event?.performers?.length ? event.performers : []
  );

  const [ticketTypes, setTicketTypes] = useState<TicketTypeRow[]>(
    initialTicketTypes ?? [{ label: '', price: '', total_quantity: '', includes_drink: true }]
  );

  const defaultEventTables = (clubTables ?? []).map((t) => ({
    clubTableId: t.id,
    label: t.label,
    capacity: t.capacity,
    deposit: String(t.defaultDeposit),
    defaultDeposit: t.defaultDeposit,
    isAvailable: true,
  }));

  const [eventTables, setEventTables] = useState<EventTableRow[]>(
    initialEventTables ?? defaultEventTables
  );
  const [customizeTables, setCustomizeTables] = useState(
    // Se c'è già una personalizzazione, parte in modalità modifica
    !!initialEventTables && initialEventTables.some((t) => t.deposit !== String(t.defaultDeposit))
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

  function addPerformer(role: 'dj' | 'vocalist') {
    setPerformers((prev) => [...prev, { name: '', role }]);
  }

  function removePerformer(index: number) {
    setPerformers((prev) => prev.filter((_, i) => i !== index));
  }

  function updatePerformerName(index: number, name: string) {
    setPerformers((prev) => prev.map((p, i) => i === index ? { ...p, name } : p));
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
    if (!form.name.trim()) { setError('Il nome evento è obbligatorio.'); return; }
    if (!form.date) { setError('La data è obbligatoria.'); return; }
    if (!form.start_time) { setError("L'orario di inizio è obbligatorio."); return; }

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
      min_age: parseInt(form.min_age) || 18,
      capacity: form.capacity ? parseInt(form.capacity) : null,
      image_url: form.image_url || null,
      genres: form.genres,
      performers: performers.filter((p) => p.name.trim()),
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

    // Salva tipi biglietto
    const validTickets = ticketTypes.filter((t) => t.label.trim() && t.price);
    if (eventId) {
      if (isEdit) {
        // Elimina solo i biglietti rimossi dall'utente (per id specifico)
        const originalIds = (initialTicketTypes ?? []).map((t) => t.id).filter(Boolean) as string[];
        const keptIds = validTickets.filter((t) => t.id).map((t) => t.id) as string[];
        const removedIds = originalIds.filter((id) => !keptIds.includes(id));
        if (removedIds.length > 0) {
          const { error: delErr } = await supabase.from('ticket_types').delete().in('id', removedIds);
          if (delErr) { setError('Errore eliminazione biglietti rimossi: ' + delErr.message); setLoading(false); return; }
        }
        // Aggiorna i biglietti esistenti (preserva sold_quantity)
        for (const t of validTickets.filter((t) => t.id)) {
          const { error: updErr } = await supabase.from('ticket_types').update({
            label: t.label.trim(),
            price: parseFloat(t.price),
            total_quantity: t.total_quantity ? parseInt(t.total_quantity) : null,
            includes_drink: t.includes_drink,
          }).eq('id', t.id!);
          if (updErr) { setError('Errore aggiornamento biglietto: ' + updErr.message); setLoading(false); return; }
        }
        // Inserisce i nuovi biglietti aggiunti
        const newTickets = validTickets.filter((t) => !t.id);
        if (newTickets.length > 0) {
          const { error: insErr } = await supabase.from('ticket_types').insert(
            newTickets.map((t) => ({
              event_id: eventId,
              label: t.label.trim(),
              price: parseFloat(t.price),
              total_quantity: t.total_quantity ? parseInt(t.total_quantity) : null,
              sold_quantity: 0,
              includes_drink: t.includes_drink,
            }))
          );
          if (insErr) { setError('Errore inserimento nuovi biglietti: ' + insErr.message); setLoading(false); return; }
        }
      } else if (validTickets.length > 0) {
        // Nuovo evento: inserisci tutti
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
    }

    // Salva tavoli evento
    if (eventId && eventTables.length > 0) {
      if (isEdit) {
        // Aggiorna i tavoli esistenti (hanno un id), inserisce quelli nuovi
        for (const t of eventTables) {
          const clubTable = clubTables?.find((ct) => ct.id === t.clubTableId);
          const tableData = {
            label: t.label,
            capacity: t.capacity,
            deposit: t.deposit ? parseFloat(t.deposit) : 0,
            is_available: t.isAvailable,
            pos_x: clubTable?.posX ?? null,
            pos_y: clubTable?.posY ?? null,
          };
          if (t.id) {
            const { error: updErr } = await supabase.from('tables').update(tableData).eq('id', t.id);
            if (updErr) { setError('Errore aggiornamento tavolo: ' + updErr.message); setLoading(false); return; }
          } else {
            const { error: insErr } = await supabase.from('tables').insert({
              ...tableData,
              event_id: eventId,
            });
            if (insErr) { setError('Errore inserimento tavolo: ' + insErr.message); setLoading(false); return; }
          }
        }
      } else {
        // Nuovo evento: inserisci tutti
        const { error: tablesError } = await supabase.from('tables').insert(
          eventTables.map((t) => {
            const clubTable = clubTables?.find((ct) => ct.id === t.clubTableId);
            return {
              event_id: eventId,
              label: t.label,
              capacity: t.capacity,
              deposit: t.deposit ? parseFloat(t.deposit) : 0,
              is_available: t.isAvailable,
              pos_x: clubTable?.posX ?? null,
              pos_y: clubTable?.posY ?? null,
            };
          })
        );
        if (tablesError) { setError('Evento salvato ma errore nei tavoli: ' + tablesError.message); setLoading(false); return; }
      }
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

      {/* Capienza, età minima e dress code */}
      <div className="grid grid-cols-3 gap-4">
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
        <Field label="Età minima">
          <select
            value={form.min_age}
            onChange={(e) => setForm({ ...form, min_age: e.target.value })}
            className={inputClass}
          >
            <option value="14">14+</option>
            <option value="16">16+</option>
            <option value="18">18+</option>
            <option value="21">21+</option>
          </select>
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
            <div className="relative w-full aspect-[3/4] max-h-96 rounded-lg overflow-hidden border border-white/10">
              <img src={form.image_url} alt="Anteprima" className="w-full h-full object-contain bg-black/40" />
            </div>
          )}
        </div>
      </Field>

      {/* Tavoli */}
      {eventTables.length > 0 ? (
        <div className="space-y-4">
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">
            Tavoli
          </label>

          {/* Piantina — solo estetica */}
          {clubFloorPlanUrl && clubTables && clubTables.length > 0 && (
            <div className="relative select-none">
              {/* Immagine con clip separato */}
              <div className="overflow-hidden rounded-xl border border-white/10 pointer-events-none">
                <img
                  src={clubFloorPlanUrl}
                  alt="Piantina"
                  className="w-full object-contain block"
                />
              </div>

              {/* Marker — fuori dal clip così i tooltip non vengono tagliati */}
              {clubTables.map((t) => {
                const isAvailable = eventTables.find(et => et.clubTableId === t.id)?.isAvailable !== false;
                const showBelow = t.posY < 0.28;
                const tooltipAlign =
                  t.posX < 0.22
                    ? 'left-0'
                    : t.posX > 0.78
                    ? 'right-0'
                    : 'left-1/2 -translate-x-1/2';

                return (
                  <div
                    key={t.id}
                    className="group absolute"
                    style={{
                      left: `${t.posX * 100}%`,
                      top: `${t.posY * 100}%`,
                      transform: 'translate(-50%, -50%)',
                      zIndex: 10,
                    }}
                  >
                    <div className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-white text-xs font-bold shadow-lg ${
                      isAvailable ? 'bg-purple-600' : 'bg-slate-600 opacity-50'
                    }`}>
                      {t.capacity}
                    </div>
                    <div className={`absolute ${tooltipAlign} ${showBelow ? 'top-full mt-1' : 'bottom-full mb-1'} hidden group-hover:block z-20 pointer-events-none`}>
                      <div className="whitespace-nowrap bg-[#0d0e1a] border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white shadow-xl">
                        <span className="font-semibold">{t.label}</span>
                        <span className="text-slate-400"> · {t.capacity} posti</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Header prezzi + toggle */}
          <div className="flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {customizeTables ? 'Modifica caparra e disponibilità per questo evento' : 'Prezzi di default — uguali per ogni evento'}
            </p>
            <button
              type="button"
              onClick={() => {
                if (customizeTables) {
                  // Ripristina defaults mantenendo lo stato di prenotazione
                  setEventTables(defaultEventTables.map((dt) => ({
                    ...dt,
                    isAvailable: eventTables.find((et) => et.clubTableId === dt.clubTableId)?.isAvailable ?? true,
                  })));
                }
                setCustomizeTables((v) => !v);
              }}
              className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors ${
                customizeTables
                  ? 'border-purple-500/30 text-purple-400 bg-purple-500/10 hover:bg-purple-500/20'
                  : 'border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20'
              }`}
            >
              {customizeTables ? '✕ Ripristina default' : 'Modifica per questo evento'}
            </button>
          </div>

          {/* Lista tavoli */}
          <div className="space-y-2">
            {eventTables.map((t, i) => (
              <div key={t.clubTableId} className={`flex items-center gap-3 bg-[#111118] border rounded-lg px-4 py-3 transition-colors ${
                !t.isAvailable ? 'opacity-50 border-white/5' : 'border-white/8'
              }`}>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{t.label}</p>
                  <p className="text-xs text-slate-500">{t.capacity} posti</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs text-slate-500">€</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={customizeTables ? t.deposit : t.defaultDeposit}
                    disabled={!customizeTables}
                    onChange={(e) => setEventTables((prev) =>
                      prev.map((row, idx) => idx === i ? { ...row, deposit: e.target.value } : row)
                    )}
                    className="w-20 bg-[#0d0e1a] border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 transition-colors text-right disabled:opacity-40 disabled:cursor-not-allowed"
                  />
                </div>
                <label className={`flex items-center gap-1.5 shrink-0 ${customizeTables ? 'cursor-pointer' : 'cursor-not-allowed opacity-40'}`}>
                  <input
                    type="checkbox"
                    checked={t.isAvailable}
                    disabled={!customizeTables}
                    onChange={(e) => setEventTables((prev) =>
                      prev.map((row, idx) => idx === i ? { ...row, isAvailable: e.target.checked } : row)
                    )}
                    className="w-3.5 h-3.5 rounded accent-purple-500"
                  />
                  <span className="text-xs text-slate-500">Attivo</span>
                </label>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-[#111118] border border-white/8 rounded-xl p-5 text-center">
          <p className="text-sm text-slate-500">Nessun tavolo configurato per questo locale.</p>
          <a href="/club/venue" className="text-xs text-purple-400 hover:text-purple-300 mt-1 inline-block">
            Vai a Piantina & Tavoli →
          </a>
        </div>
      )}

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

      {/* Lineup — DJ e Vocalist */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-medium text-slate-400 uppercase tracking-wide">Lineup</label>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => addPerformer('dj')}
              className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              <Music size={12} />
              + DJ
            </button>
            <span className="text-white/20">|</span>
            <button
              type="button"
              onClick={() => addPerformer('vocalist')}
              className="flex items-center gap-1.5 text-xs text-purple-400 hover:text-purple-300 transition-colors"
            >
              <Mic2 size={12} />
              + Vocalist
            </button>
          </div>
        </div>

        {performers.length === 0 && (
          <p className="text-xs text-slate-600 italic">Nessun artista aggiunto. Usa i pulsanti sopra per aggiungere DJ o vocalist.</p>
        )}

        {performers.map((performer, index) => (
          <div key={index} className="flex items-center gap-3 bg-[#111118] border border-white/8 rounded-lg px-4 py-3">
            <span className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md shrink-0 ${
              performer.role === 'dj'
                ? 'bg-purple-500/15 text-purple-300 border border-purple-500/20'
                : 'bg-pink-500/15 text-pink-300 border border-pink-500/20'
            }`}>
              {performer.role === 'dj' ? <Music size={11} /> : <Mic2 size={11} />}
              {performer.role === 'dj' ? 'DJ' : 'Vocalist'}
            </span>
            <input
              value={performer.name}
              onChange={(e) => updatePerformerName(index, e.target.value)}
              placeholder={performer.role === 'dj' ? 'es. DJ Snake' : 'es. Kehlani'}
              className="flex-1 bg-transparent border-none text-sm text-white placeholder-slate-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => removePerformer(index)}
              className="text-slate-600 hover:text-red-400 transition-colors shrink-0"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

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
