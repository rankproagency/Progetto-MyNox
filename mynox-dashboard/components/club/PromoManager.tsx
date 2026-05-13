'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Plus, Tag, Trash2, ToggleLeft, ToggleRight, X, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';

interface PromoCode {
  id: string;
  club_id: string;
  event_id: string | null;
  code: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  max_uses: number | null;
  current_uses: number;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

interface Event {
  id: string;
  name: string;
  date: string;
}

interface Props {
  initialCodes: PromoCode[];
  events: Event[];
  clubId: string;
}

const EMPTY_FORM = {
  code: '',
  discount_type: 'percentage' as 'percentage' | 'fixed',
  discount_value: '',
  event_id: '',
  max_uses: '',
  expires_at: '',
};

export default function PromoManager({ initialCodes, events, clubId }: Props) {
  const supabase = createClient();
  const router = useRouter();
  const [codes, setCodes] = useState<PromoCode[]>(initialCodes);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    router.refresh();
    setTimeout(() => setRefreshing(false), 800);
  }

  const PCT_PRESETS = [10, 15, 20, 25, 50, 100];
  const FLAT_PRESETS = [5, 10, 15, 20];

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function discountLabel(code: PromoCode) {
    return code.discount_type === 'percentage'
      ? `${code.discount_value}%`
      : `€${code.discount_value}`;
  }

  function usesLabel(code: PromoCode) {
    if (code.max_uses === null) return `${code.current_uses} / ∞`;
    return `${code.current_uses} / ${code.max_uses}`;
  }

  function isExpired(code: PromoCode) {
    return !!code.expires_at && new Date(code.expires_at) < new Date();
  }

  async function handleCreate() {
    setError('');
    const normalized = form.code.trim().toUpperCase();
    if (!normalized) { setError('Inserisci un codice.'); return; }
    if (!form.discount_value || Number(form.discount_value) <= 0) { setError('Inserisci un valore sconto valido.'); return; }
    if (form.discount_type === 'percentage' && Number(form.discount_value) > 100) { setError('La percentuale non può superare 100.'); return; }

    setSaving(true);
    const { data, error: err } = await supabase
      .from('promo_codes')
      .insert({
        club_id: clubId,
        event_id: form.event_id || null,
        code: normalized,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        expires_at: form.expires_at || null,
      })
      .select()
      .single();

    setSaving(false);
    if (err) { setError(err.message); return; }
    setCodes((prev) => [data as PromoCode, ...prev]);
    setShowModal(false);
    setForm(EMPTY_FORM);
  }

  async function handleToggle(code: PromoCode) {
    const next = !code.is_active;
    setCodes((prev) => prev.map((c) => c.id === code.id ? { ...c, is_active: next } : c));
    await supabase.from('promo_codes').update({ is_active: next }).eq('id', code.id);
  }

  async function handleDelete(id: string) {
    if (!confirm('Eliminare questo codice promo?')) return;
    setCodes((prev) => prev.filter((c) => c.id !== id));
    await supabase.from('promo_codes').delete().eq('id', id);
  }

  const active = codes.filter((c) => c.is_active && !isExpired(c)).length;
  const totalUses = codes.reduce((sum, c) => sum + c.current_uses, 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Codici totali', value: codes.length },
          { label: 'Attivi ora', value: active },
          { label: 'Utilizzi totali', value: totalUses },
        ].map(({ label, value }) => (
          <div key={label} className="bg-[#111118] border border-white/8 rounded-xl p-4">
            <div className="text-2xl font-bold text-white">{value}</div>
            <div className="text-sm text-slate-400 mt-0.5">{label}</div>
          </div>
        ))}
      </div>

      {/* Header + crea */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Tutti i codici</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            title="Aggiorna dati"
            className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg transition-colors"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={() => { setShowModal(true); setError(''); setForm(EMPTY_FORM); }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            <Plus size={15} />
            Crea codice
          </button>
        </div>
      </div>

      {/* Tabella */}
      {codes.length === 0 ? (
        <div className="bg-[#111118] border border-white/8 rounded-xl p-12 flex flex-col items-center gap-3 text-slate-500">
          <Tag size={36} />
          <p className="text-sm">Nessun codice promo ancora. Creane uno!</p>
        </div>
      ) : (
        <div className="bg-[#111118] border border-white/8 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8 text-xs text-slate-500 uppercase tracking-wide">
                <th className="text-left px-5 py-3">Codice</th>
                <th className="text-left px-5 py-3">Sconto</th>
                <th className="text-left px-5 py-3">Evento</th>
                <th className="text-left px-5 py-3">Utilizzi</th>
                <th className="text-left px-5 py-3">Scadenza</th>
                <th className="text-left px-5 py-3">Stato</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {codes.map((code) => {
                const expired = isExpired(code);
                const event = events.find((e) => e.id === code.event_id);
                return (
                  <tr key={code.id} className="border-b border-white/5 last:border-0 hover:bg-white/2">
                    <td className="px-5 py-3.5">
                      <span className="font-mono font-bold text-purple-400 tracking-widest">{code.code}</span>
                    </td>
                    <td className="px-5 py-3.5 text-white font-semibold">{discountLabel(code)}</td>
                    <td className="px-5 py-3.5 text-slate-400 max-w-[180px] truncate">
                      {event ? event.name : <span className="text-slate-600">Tutti gli eventi</span>}
                    </td>
                    <td className="px-5 py-3.5 text-slate-300">{usesLabel(code)}</td>
                    <td className="px-5 py-3.5 text-slate-400">
                      {code.expires_at ? (
                        <span className={expired ? 'text-red-400' : ''}>{formatDate(code.expires_at)}</span>
                      ) : (
                        <span className="text-slate-600">Nessuna</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      {expired ? (
                        <span className="flex items-center gap-1.5 text-xs text-red-400"><AlertCircle size={13} /> Scaduto</span>
                      ) : code.is_active ? (
                        <span className="flex items-center gap-1.5 text-xs text-green-400"><CheckCircle size={13} /> Attivo</span>
                      ) : (
                        <span className="text-xs text-slate-500">Disattivato</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3 justify-end">
                        <button
                          onClick={() => handleToggle(code)}
                          title={code.is_active ? 'Disattiva' : 'Attiva'}
                          className="text-slate-400 hover:text-white transition-colors"
                        >
                          {code.is_active ? <ToggleRight size={28} className="text-purple-400" /> : <ToggleLeft size={28} />}
                        </button>
                        <button
                          onClick={() => handleDelete(code.id)}
                          className="text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal crea */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-[#111118] border border-white/10 rounded-2xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Nuovo codice promo</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Codice */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Codice</label>
                <input
                  className="mt-1.5 w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2.5 text-white font-mono uppercase tracking-widest text-sm focus:outline-none focus:border-purple-500"
                  placeholder="ES. ESTATE25"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                />
              </div>

              {/* Tipo + valore */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Tipo sconto</label>
                  <select
                    className="mt-1.5 w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                    value={form.discount_type}
                    onChange={(e) => setForm((f) => ({ ...f, discount_type: e.target.value as 'percentage' | 'fixed' }))}
                  >
                    <option value="percentage">Percentuale (%)</option>
                    <option value="fixed">Importo fisso (€)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Valore {form.discount_type === 'percentage' ? '(%)' : '(€)'}
                  </label>
                  <input
                    type="number"
                    min="0"
                    max={form.discount_type === 'percentage' ? 100 : undefined}
                    className="mt-1.5 w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                    placeholder={form.discount_type === 'percentage' ? '20' : '5'}
                    value={form.discount_value}
                    onChange={(e) => setForm((f) => ({ ...f, discount_value: e.target.value }))}
                  />
                </div>
              </div>

              {/* Preset rapidi */}
              <div className="flex flex-wrap gap-1.5">
                {(form.discount_type === 'percentage' ? PCT_PRESETS : FLAT_PRESETS).map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, discount_value: String(v) }))}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                      form.discount_value === String(v)
                        ? 'bg-purple-600 border-purple-500 text-white'
                        : 'bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                    }`}
                  >
                    {form.discount_type === 'percentage' ? `${v}%` : `€${v}`}
                  </button>
                ))}
              </div>

              {/* Evento */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Evento (opzionale)</label>
                <select
                  className="mt-1.5 w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                  value={form.event_id}
                  onChange={(e) => setForm((f) => ({ ...f, event_id: e.target.value }))}
                >
                  <option value="">Tutti gli eventi</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.name} — {formatDate(ev.date)}</option>
                  ))}
                </select>
              </div>

              {/* Max utilizzi + scadenza */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Max utilizzi</label>
                  <input
                    type="number"
                    min="1"
                    className="mt-1.5 w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                    placeholder="Illimitati"
                    value={form.max_uses}
                    onChange={(e) => setForm((f) => ({ ...f, max_uses: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Scadenza</label>
                  <input
                    type="date"
                    className="mt-1.5 w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2.5 text-white text-sm focus:outline-none focus:border-purple-500"
                    value={form.expires_at}
                    onChange={(e) => setForm((f) => ({ ...f, expires_at: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {error && (
              <p className="text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 py-2.5 rounded-lg border border-white/10 text-slate-400 hover:text-white text-sm font-medium transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-sm font-bold transition-colors"
              >
                {saving ? 'Salvataggio...' : 'Crea codice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
