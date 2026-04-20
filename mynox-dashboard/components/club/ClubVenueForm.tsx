'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Map, Check } from 'lucide-react';
import FloorPlanEditor, { TableMarker } from './FloorPlanEditor';

interface Props {
  clubId: string;
  initialFloorPlanUrl: string | null;
  initialTables: TableMarker[];
}

export default function ClubVenueForm({ clubId, initialFloorPlanUrl, initialTables }: Props) {
  const [floorPlanUrl, setFloorPlanUrl] = useState(initialFloorPlanUrl ?? '');
  const [tables, setTables] = useState<TableMarker[]>(initialTables);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  async function handleFloorPlanUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError('');
    const supabase = createClient();
    const ext = file.name.split('.').pop();
    const path = `floor-plans/${clubId}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from('event-assets')
      .upload(path, file, { upsert: true });
    if (uploadError) {
      setError('Errore upload: ' + uploadError.message);
      setUploading(false);
      return;
    }
    const { data } = supabase.storage.from('event-assets').getPublicUrl(path);
    setFloorPlanUrl(data.publicUrl);
    setUploading(false);
  }

  async function handleSave() {
    setSaving(true);
    setError('');
    setSaved(false);
    const supabase = createClient();

    // 1. Aggiorna floor_plan_url del club
    const { error: clubError } = await supabase
      .from('clubs')
      .update({ floor_plan_url: floorPlanUrl || null })
      .eq('id', clubId);

    if (clubError) {
      setError('Errore salvataggio: ' + clubError.message);
      setSaving(false);
      return;
    }

    // 2. Elimina i tavoli esistenti e reinserisci
    await supabase.from('club_tables').delete().eq('club_id', clubId);

    if (tables.length > 0) {
      const { error: tablesError } = await supabase.from('club_tables').insert(
        tables.map((t) => ({
          club_id: clubId,
          label: t.label,
          capacity: t.capacity,
          pos_x: t.x,
          pos_y: t.y,
          default_deposit: t.deposit ?? 0,
        }))
      );
      if (tablesError) {
        setError('Errore salvataggio tavoli: ' + tablesError.message);
        setSaving(false);
        return;
      }
    }

    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="space-y-8 max-w-2xl">

      {/* Upload piantina */}
      <div className="space-y-4">
        <div>
          <h2 className="text-base font-semibold text-white mb-1">Piantina del locale</h2>
          <p className="text-xs text-slate-500">
            Carica un&apos;immagine della pianta del locale (PNG, JPG). Sarà usata come sfondo per il posizionamento dei tavoli.
          </p>
        </div>

        <label className={`flex items-center gap-3 cursor-pointer px-4 py-3 rounded-xl border border-dashed border-white/20 hover:border-purple-500/50 transition-colors w-full ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
          <Map size={18} className="text-slate-400 shrink-0" />
          <span className="text-sm text-slate-400">
            {uploading ? 'Caricamento...' : floorPlanUrl ? 'Cambia piantina' : 'Carica la piantina del locale'}
          </span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFloorPlanUpload}
            disabled={uploading}
          />
        </label>
      </div>

      {/* Editor piantina + tavoli */}
      {floorPlanUrl ? (
        <div className="space-y-3">
          <div>
            <h2 className="text-base font-semibold text-white mb-1">Posiziona i tavoli</h2>
            <p className="text-xs text-slate-500">
              Clicca sulla piantina per aggiungere un tavolo. Le posizioni rimarranno le stesse per tutti gli eventi — potrai solo modificare il prezzo per ogni evento.
            </p>
          </div>
          <FloorPlanEditor
            floorPlanUrl={floorPlanUrl}
            tables={tables}
            onChange={setTables}
          />
        </div>
      ) : (
        <div className="bg-[#111118] border border-white/8 rounded-xl p-8 text-center">
          <Map size={32} className="text-slate-600 mx-auto mb-3" />
          <p className="text-sm text-slate-500">Carica prima la piantina per posizionare i tavoli.</p>
        </div>
      )}

      {error && <p className="text-red-400 text-sm">{error}</p>}

      {/* Salva */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving || !floorPlanUrl}
        className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors"
      >
        {saved ? (
          <>
            <Check size={15} />
            Salvato
          </>
        ) : saving ? (
          'Salvataggio...'
        ) : (
          'Salva configurazione'
        )}
      </button>

      {tables.length > 0 && (
        <p className="text-xs text-slate-600">
          {tables.length} {tables.length === 1 ? 'tavolo configurato' : 'tavoli configurati'} · Le modifiche si applicano a tutti i nuovi eventi.
        </p>
      )}
    </div>
  );
}
