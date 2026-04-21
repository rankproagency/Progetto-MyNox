'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Pencil, Trash2, PowerOff, Power, Loader2 } from 'lucide-react';

interface Props {
  clubId: string;
  clubName: string;
  isActive: boolean;
}

export default function ClubRowActions({ clubId, clubName, isActive }: Props) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [loadingToggle, setLoadingToggle] = useState(false);
  const [loadingDelete, setLoadingDelete] = useState(false);

  async function handleToggleActive() {
    setLoadingToggle(true);
    const supabase = createClient();
    await supabase.from('clubs').update({ is_active: !isActive }).eq('id', clubId);
    setLoadingToggle(false);
    router.refresh();
  }

  async function handleDelete() {
    setLoadingDelete(true);
    const supabase = createClient();
    await supabase.from('clubs').delete().eq('id', clubId);
    setLoadingDelete(false);
    setShowDeleteDialog(false);
    router.refresh();
  }

  return (
    <>
      <div className="flex items-center gap-1 justify-end">
        {/* Modifica */}
        <a
          href={`/admin/clubs/${clubId}`}
          className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/8 transition-colors"
          title="Modifica"
        >
          <Pencil size={14} />
        </a>

        {/* Sospendi / Attiva */}
        <button
          onClick={handleToggleActive}
          disabled={loadingToggle}
          className={`p-2 rounded-lg transition-colors disabled:opacity-40 ${
            isActive
              ? 'text-slate-400 hover:text-amber-400 hover:bg-amber-400/8'
              : 'text-green-400 hover:bg-green-400/8'
          }`}
          title={isActive ? 'Sospendi' : 'Riattiva'}
        >
          {loadingToggle
            ? <Loader2 size={14} className="animate-spin" />
            : isActive ? <PowerOff size={14} /> : <Power size={14} />
          }
        </button>

        {/* Elimina */}
        <button
          onClick={() => setShowDeleteDialog(true)}
          className="p-2 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-400/8 transition-colors"
          title="Elimina"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* Dialog conferma eliminazione */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-[#111118] border border-white/12 rounded-2xl p-6 w-full max-w-sm mx-4 shadow-2xl">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 mx-auto mb-4">
              <Trash2 size={20} className="text-red-400" />
            </div>
            <h3 className="text-white font-bold text-lg text-center mb-2">Elimina discoteca</h3>
            <p className="text-slate-400 text-sm text-center mb-1">
              Stai per eliminare <span className="text-white font-semibold">{clubName}</span>.
            </p>
            <p className="text-slate-500 text-xs text-center mb-6">
              Tutti gli eventi, biglietti e tavoli associati verranno eliminati. Questa azione è irreversibile.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteDialog(false)}
                disabled={loadingDelete}
                className="flex-1 px-4 py-2.5 rounded-lg border border-white/10 text-sm font-medium text-slate-300 hover:bg-white/5 transition-colors"
              >
                Annulla
              </button>
              <button
                onClick={handleDelete}
                disabled={loadingDelete}
                className="flex-1 px-4 py-2.5 rounded-lg bg-red-600 hover:bg-red-500 disabled:opacity-60 text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2"
              >
                {loadingDelete && <Loader2 size={13} className="animate-spin" />}
                {loadingDelete ? 'Eliminazione...' : 'Elimina'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
