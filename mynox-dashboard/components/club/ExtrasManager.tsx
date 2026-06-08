'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Package } from 'lucide-react';
import { useLanguage } from '@/components/providers/I18nProvider';
import { createExtra, updateExtra, toggleExtra, deleteExtra } from '@/app/(club)/club/extras/actions';

interface ClubExtra {
  id: string;
  club_id: string;
  name: string;
  description: string | null;
  deposit: number;
  is_available: boolean;
  max_quantity?: number;
}

interface Props {
  clubId: string;
  initialExtras: ClubExtra[];
}

const emptyForm = { name: '', description: '', deposit: '', maxQuantity: '10' };

export default function ExtrasManager({ clubId, initialExtras }: Props) {
  const { t } = useLanguage();
  const ex = t.clubExtras;
  const [extras, setExtras] = useState<ClubExtra[]>(initialExtras);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [togglingId, setTogglingId] = useState<string | null>(null);

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setShowForm(true);
  }

  function openEdit(extra: ClubExtra) {
    setEditingId(extra.id);
    setForm({ name: extra.name, description: extra.description ?? '', deposit: String(extra.deposit), maxQuantity: String(extra.max_quantity ?? 10) });
    setError('');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setError('');
  }

  async function handleSave() {
    if (!form.name.trim()) { setError(ex.nameLabel.replace(' *', '') + ' obbligatorio'); return; }
    setSaving(true);
    setError('');

    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      deposit: parseFloat(form.deposit) || 0,
      maxQuantity: parseInt(form.maxQuantity) || 10,
    };

    if (editingId) {
      const res = await updateExtra(editingId, payload);
      if (res.error) { setError(res.error); setSaving(false); return; }
      setExtras((prev) => prev.map((e) => e.id === editingId ? { ...e, ...payload, description: payload.description || null } : e));
    } else {
      const res = await createExtra(payload);
      if (res.error) { setError(res.error); setSaving(false); return; }
      if (res.data) setExtras((prev) => [...prev, res.data as ClubExtra]);
    }

    setSaving(false);
    closeForm();
  }

  async function handleToggle(extra: ClubExtra) {
    setTogglingId(extra.id);
    const next = !extra.is_available;
    setExtras((prev) => prev.map((e) => e.id === extra.id ? { ...e, is_available: next } : e));
    await toggleExtra(extra.id, next);
    setTogglingId(null);
  }

  async function handleDelete(id: string) {
    if (!confirm(ex.deleteConfirm)) return;
    const res = await deleteExtra(id);
    if (res.error) { alert(res.error); return; }
    setExtras((prev) => prev.filter((e) => e.id !== id));
  }

  return (
    <div className="max-w-2xl space-y-3">

      {/* Lista extras */}
      {extras.length === 0 && !showForm ? (
        <div className="bg-[#111118] border border-white/8 rounded-xl p-10 text-center">
          <Package size={36} className="text-slate-600 mx-auto mb-3" />
          <p className="text-slate-400 font-medium mb-1">{ex.noExtras}</p>
          <p className="text-slate-600 text-sm mb-5">{ex.noExtrasHint}</p>
          <button onClick={openAdd}
            className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
            <Plus size={14} /> {ex.addExtra}
          </button>
        </div>
      ) : (
        <>
          {extras.map((extra) => (
            <div key={extra.id} className="group bg-[#111118] border border-white/8 rounded-xl px-5 py-4 flex items-center gap-4">

              {/* Indicatore attivo */}
              <div className={`w-2 h-2 rounded-full shrink-0 transition-colors ${extra.is_available ? 'bg-emerald-400' : 'bg-slate-600'}`} />

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm transition-colors ${extra.is_available ? 'text-white' : 'text-slate-500'}`}>
                  {extra.name}
                </p>
                {extra.description && (
                  <p className="text-slate-500 text-xs mt-0.5 truncate">{extra.description}</p>
                )}
                <p className="text-purple-400 text-xs mt-1 font-medium">
                  €{extra.deposit.toFixed(2)}{ex.depositSuffix}
                </p>
              </div>

              {/* Badge stato — cliccabile */}
              <button
                onClick={() => handleToggle(extra)}
                disabled={togglingId === extra.id}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                  extra.is_available
                    ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400 hover:bg-emerald-500/20'
                    : 'bg-white/5 border-white/10 text-slate-500 hover:bg-white/10 hover:text-slate-300'
                }`}
              >
                {extra.is_available ? ex.available : ex.unavailable}
              </button>

              {/* Azioni — visibili solo su hover */}
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => openEdit(extra)}
                  className="p-2 rounded-lg text-slate-500 hover:text-white hover:bg-white/8 transition-colors"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => handleDelete(extra.id)}
                  className="p-2 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/8 transition-colors"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}

          {!showForm && (
            <button onClick={openAdd}
              className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors pt-1 pl-1">
              <Plus size={14} /> {ex.addExtra}
            </button>
          )}
        </>
      )}

      {/* Form aggiunta/modifica */}
      {showForm && (
        <div className="bg-[#111118] border border-purple-500/30 rounded-xl p-5 space-y-4 mt-2">
          <h3 className="text-sm font-semibold text-white">{editingId ? ex.editExtra : ex.addExtra}</h3>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{ex.nameLabel}</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={ex.namePlaceholder}
              className="w-full bg-[#0d0e1a] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{ex.descriptionLabel}</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={ex.descriptionPlaceholder}
              rows={2}
              className="w-full bg-[#0d0e1a] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 resize-none"
            />
          </div>

          <div className="flex items-start gap-4">
            <div className="space-y-1.5 max-w-[160px]">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{ex.depositLabel}</label>
              <div className="flex items-center gap-2 bg-[#0d0e1a] border border-white/10 rounded-lg px-3 py-2.5">
                <span className="text-slate-500 text-sm">€</span>
                <input
                  type="number" min="0" step="0.01"
                  value={form.deposit}
                  onChange={(e) => setForm({ ...form, deposit: e.target.value })}
                  placeholder={ex.depositPlaceholder}
                  className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none"
                />
              </div>
            </div>
            <div className="space-y-1.5 max-w-[140px]">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{ex.maxQuantityLabel}</label>
              <input
                type="number" min="1" max="99"
                value={form.maxQuantity}
                onChange={(e) => setForm({ ...form, maxQuantity: e.target.value })}
                placeholder="es. 2"
                className="w-full bg-[#0d0e1a] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60"
              />
              <p className="text-xs text-slate-600">{ex.maxQuantityHint}</p>
            </div>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
            >
              {saving ? '...' : ex.saveBtn}
            </button>
            <button
              onClick={closeForm}
              className="text-slate-400 hover:text-slate-200 text-sm font-medium px-4 py-2 transition-colors"
            >
              {ex.cancelBtn}
            </button>
            {editingId && (
              <button
                onClick={() => handleDelete(editingId)}
                className="ml-auto text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                {ex.deleteBtn}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
