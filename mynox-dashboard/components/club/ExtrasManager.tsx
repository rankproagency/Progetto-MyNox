'use client';

import { useState } from 'react';
import { Plus, Pencil, Trash2, Package, ToggleLeft, ToggleRight } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useLanguage } from '@/components/providers/I18nProvider';
import { useRouter } from 'next/navigation';

interface ClubExtra {
  id: string;
  club_id: string;
  name: string;
  description: string | null;
  deposit: number;
  is_available: boolean;
}

interface Props {
  clubId: string;
  initialExtras: ClubExtra[];
}

const emptyForm = { name: '', description: '', deposit: '' };

export default function ExtrasManager({ clubId, initialExtras }: Props) {
  const { t } = useLanguage();
  const ex = t.clubExtras;
  const router = useRouter();
  const [extras, setExtras] = useState<ClubExtra[]>(initialExtras);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function openAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setError('');
    setShowForm(true);
  }

  function openEdit(extra: ClubExtra) {
    setEditingId(extra.id);
    setForm({ name: extra.name, description: extra.description ?? '', deposit: String(extra.deposit) });
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
    const supabase = createClient();
    const payload = {
      club_id: clubId,
      name: form.name.trim(),
      description: form.description.trim() || null,
      deposit: parseFloat(form.deposit) || 0,
    };

    if (editingId) {
      const { error: err } = await supabase.from('club_extras').update(payload).eq('id', editingId);
      if (err) { setError(err.message); setSaving(false); return; }
      setExtras((prev) => prev.map((e) => e.id === editingId ? { ...e, ...payload } : e));
    } else {
      const { data, error: err } = await supabase.from('club_extras').insert(payload).select().single();
      if (err || !data) { setError(err?.message ?? 'Errore'); setSaving(false); return; }
      setExtras((prev) => [...prev, data as ClubExtra]);
    }
    setSaving(false);
    closeForm();
    router.refresh();
  }

  async function handleToggle(extra: ClubExtra) {
    const supabase = createClient();
    const next = !extra.is_available;
    setExtras((prev) => prev.map((e) => e.id === extra.id ? { ...e, is_available: next } : e));
    await supabase.from('club_extras').update({ is_available: next }).eq('id', extra.id);
  }

  async function handleDelete(id: string) {
    if (!confirm(ex.deleteConfirm)) return;
    const supabase = createClient();
    await supabase.from('club_extras').delete().eq('id', id);
    setExtras((prev) => prev.filter((e) => e.id !== id));
    router.refresh();
  }

  return (
    <div className="max-w-2xl space-y-4">
      {/* List */}
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
          <div className="space-y-3">
            {extras.map((extra) => (
              <div key={extra.id} className={`bg-[#111118] border rounded-xl px-5 py-4 flex items-center gap-4 transition-opacity ${extra.is_available ? 'border-white/8' : 'border-white/4 opacity-50'}`}>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm">{extra.name}</p>
                  {extra.description && <p className="text-slate-500 text-xs mt-0.5 truncate">{extra.description}</p>}
                  <p className="text-purple-400 text-xs mt-1 font-medium">€{extra.deposit.toFixed(2)}{ex.depositSuffix}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => handleToggle(extra)} className="text-slate-500 hover:text-purple-400 transition-colors">
                    {extra.is_available ? <ToggleRight size={20} className="text-purple-400" /> : <ToggleLeft size={20} />}
                  </button>
                  <button onClick={() => openEdit(extra)} className="text-slate-500 hover:text-white transition-colors p-1">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => handleDelete(extra.id)} className="text-slate-500 hover:text-red-400 transition-colors p-1">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {!showForm && (
            <button onClick={openAdd}
              className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors">
              <Plus size={14} /> {ex.addExtra}
            </button>
          )}
        </>
      )}

      {/* Form */}
      {showForm && (
        <div className="bg-[#111118] border border-purple-500/30 rounded-xl p-5 space-y-4">
          <h3 className="text-sm font-semibold text-white">{editingId ? ex.editExtra : ex.addExtra}</h3>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{ex.nameLabel}</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder={ex.namePlaceholder}
              className="w-full bg-[#0d0e1a] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60" />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{ex.descriptionLabel}</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder={ex.descriptionPlaceholder} rows={2}
              className="w-full bg-[#0d0e1a] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 resize-none" />
          </div>

          <div className="space-y-1.5 max-w-[160px]">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wide">{ex.depositLabel}</label>
            <div className="flex items-center gap-2 bg-[#0d0e1a] border border-white/10 rounded-lg px-3 py-2.5">
              <span className="text-slate-500 text-sm">€</span>
              <input type="number" min="0" step="0.01" value={form.deposit}
                onChange={(e) => setForm({ ...form, deposit: e.target.value })}
                placeholder={ex.depositPlaceholder}
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-500 focus:outline-none" />
            </div>
          </div>

          {error && <p className="text-red-400 text-xs">{error}</p>}

          <div className="flex items-center gap-3 pt-1">
            <button onClick={handleSave} disabled={saving}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors">
              {saving ? '...' : ex.saveBtn}
            </button>
            <button onClick={closeForm}
              className="text-slate-400 hover:text-slate-200 text-sm font-medium px-4 py-2 transition-colors">
              {ex.cancelBtn}
            </button>
            {editingId && (
              <button onClick={() => handleDelete(editingId)}
                className="ml-auto text-sm text-red-400 hover:text-red-300 transition-colors">
                {ex.deleteBtn}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
