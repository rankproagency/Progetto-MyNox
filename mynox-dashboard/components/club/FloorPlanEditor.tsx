'use client';

import { useState, useRef } from 'react';
import { Trash2, Pencil } from 'lucide-react';

export interface TableMarker {
  tempId: string;
  label: string;
  capacity: number;
  deposit: number;
  x: number;
  y: number;
}

interface Props {
  floorPlanUrl: string;
  tables: TableMarker[];
  onChange: (tables: TableMarker[]) => void;
}

type FormMode =
  | { type: 'add'; x: number; y: number }
  | { type: 'edit'; tempId: string };

export default function FloorPlanEditor({ floorPlanUrl, tables, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [formMode, setFormMode] = useState<FormMode | null>(null);
  const [label, setLabel] = useState('');
  const [capacity, setCapacity] = useState('4');
  const [deposit, setDeposit] = useState('');

  function openAdd(x: number, y: number) {
    setFormMode({ type: 'add', x, y });
    setLabel('');
    setCapacity('4');
    setDeposit('');
  }

  function openEdit(table: TableMarker) {
    setFormMode({ type: 'edit', tempId: table.tempId });
    setLabel(table.label);
    setCapacity(String(table.capacity));
    setDeposit(String(table.deposit));
  }

  function handleContainerClick(e: React.MouseEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement;
    if (target.closest('[data-marker]') || target.closest('[data-form]')) return;
    const rect = containerRef.current!.getBoundingClientRect();
    openAdd(
      (e.clientX - rect.left) / rect.width,
      (e.clientY - rect.top) / rect.height,
    );
  }

  function confirmAdd() {
    if (formMode?.type !== 'add' || !label.trim()) return;
    onChange([
      ...tables,
      {
        tempId: Math.random().toString(36).slice(2),
        label: label.trim(),
        capacity: parseInt(capacity) || 4,
        deposit: parseFloat(deposit) || 0,
        x: formMode.x,
        y: formMode.y,
      },
    ]);
    setFormMode(null);
  }

  function confirmEdit() {
    if (formMode?.type !== 'edit' || !label.trim()) return;
    onChange(
      tables.map((t) =>
        t.tempId === formMode.tempId
          ? { ...t, label: label.trim(), capacity: parseInt(capacity) || 4, deposit: parseFloat(deposit) || 0 }
          : t
      )
    );
    setFormMode(null);
  }

  function removeTable(tempId: string) {
    onChange(tables.filter((t) => t.tempId !== tempId));
    if (formMode?.type === 'edit' && formMode.tempId === tempId) setFormMode(null);
  }

  const pendingPos = formMode?.type === 'add' ? { x: formMode.x, y: formMode.y } : null;
  const editingId = formMode?.type === 'edit' ? formMode.tempId : null;

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-500">
        Clicca sulla piantina per aggiungere un tavolo. Clicca su un marker esistente per modificarlo.
      </p>

      {/* Piantina interattiva */}
      <div
        ref={containerRef}
        className="relative rounded-xl cursor-crosshair select-none"
        onClick={handleContainerClick}
        style={{ userSelect: 'none' }}
      >
        {/* Immagine con clip separato */}
        <div className="overflow-hidden rounded-xl border border-white/10 pointer-events-none">
          <img
            src={floorPlanUrl}
            alt="Piantina"
            className="w-full object-contain block"
            draggable={false}
          />
        </div>

        {/* Marker tavoli — fuori dall'overflow-hidden così i tooltip non vengono tagliati */}
        {tables.map((table) => {
          const isEditing = editingId === table.tempId;
          const showBelow = table.y < 0.28;
          const tooltipAlign =
            table.x < 0.22
              ? 'left-0'
              : table.x > 0.78
              ? 'right-0'
              : 'left-1/2 -translate-x-1/2';
          return (
            <div
              key={table.tempId}
              data-marker="true"
              style={{
                position: 'absolute',
                left: `${table.x * 100}%`,
                top: `${table.y * 100}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 10,
              }}
              className="group"
            >
              {/* Cerchio marker */}
              <div
                onClick={(e) => { e.stopPropagation(); openEdit(table); }}
                className={`w-9 h-9 rounded-full border-2 shadow-lg flex items-center justify-center text-white text-xs font-bold cursor-pointer transition-colors ${
                  isEditing
                    ? 'bg-amber-500 border-amber-300 scale-110'
                    : 'bg-purple-600 border-white hover:bg-purple-500'
                }`}
              >
                {table.capacity}
              </div>

              {/* Tooltip al hover (solo se non in editing) — direzione e allineamento adattivi */}
              {!isEditing && (
                <div
                  className={`absolute ${tooltipAlign} ${showBelow ? 'top-full mt-2' : 'bottom-full mb-2'} hidden group-hover:flex items-center gap-2 whitespace-nowrap bg-[#0d0e1a] border border-white/20 rounded-lg px-2.5 py-1.5 text-xs text-white shadow-xl z-30 pointer-events-auto`}
                >
                  <span className="font-semibold">{table.label}</span>
                  <span className="text-slate-400">· {table.capacity} posti · €{table.deposit}</span>
                  <button
                    data-marker="true"
                    type="button"
                    onClick={(e) => { e.stopPropagation(); openEdit(table); }}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <Pencil size={11} />
                  </button>
                  <button
                    data-marker="true"
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeTable(table.tempId); }}
                    className="text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              )}
            </div>
          );
        })}

        {/* Marker posizione in attesa (aggiunta) */}
        {pendingPos && (
          <div
            style={{
              position: 'absolute',
              left: `${pendingPos.x * 100}%`,
              top: `${pendingPos.y * 100}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 10,
            }}
          >
            <div className="w-9 h-9 rounded-full bg-purple-500/50 border-2 border-purple-400 animate-pulse" />
          </div>
        )}
      </div>

      {/* Form aggiunta */}
      {formMode?.type === 'add' && (
        <TableForm
          title="Nuovo tavolo"
          label={label} setLabel={setLabel}
          capacity={capacity} setCapacity={setCapacity}
          deposit={deposit} setDeposit={setDeposit}
          onConfirm={confirmAdd}
          onCancel={() => setFormMode(null)}
          confirmLabel="Aggiungi tavolo"
        />
      )}

      {/* Form modifica */}
      {formMode?.type === 'edit' && (
        <TableForm
          title={`Modifica — ${tables.find(t => t.tempId === editingId)?.label ?? ''}`}
          label={label} setLabel={setLabel}
          capacity={capacity} setCapacity={setCapacity}
          deposit={deposit} setDeposit={setDeposit}
          onConfirm={confirmEdit}
          onCancel={() => setFormMode(null)}
          confirmLabel="Salva modifiche"
          onDelete={() => removeTable(editingId!)}
        />
      )}

      {/* Riepilogo tavoli */}
      {tables.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tables.map((t) => (
            <button
              key={t.tempId}
              type="button"
              onClick={() => openEdit(t)}
              className={`flex items-center gap-1.5 border text-xs rounded-lg px-2.5 py-1 transition-colors ${
                editingId === t.tempId
                  ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                  : 'bg-purple-500/10 border-purple-500/20 text-purple-300 hover:bg-purple-500/20'
              }`}
            >
              <Pencil size={9} />
              {t.label} · {t.capacity} posti · €{t.deposit}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function TableForm({
  title, label, setLabel, capacity, setCapacity, deposit, setDeposit,
  onConfirm, onCancel, confirmLabel, onDelete,
}: {
  title: string;
  label: string; setLabel: (v: string) => void;
  capacity: string; setCapacity: (v: string) => void;
  deposit: string; setDeposit: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel: string;
  onDelete?: () => void;
}) {
  return (
    <div data-form="true" className="bg-[#111118] border border-purple-500/30 rounded-xl p-4 space-y-3">
      <p className="text-sm font-semibold text-white">{title}</p>
      <div className="grid grid-cols-3 gap-3">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Nome tavolo</label>
          <input
            autoFocus
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && onConfirm()}
            placeholder="es. Tavolo VIP 1"
            className="w-full bg-[#0d0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Posti</label>
          <input
            type="number"
            min="1"
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            placeholder="4"
            className="w-full bg-[#0d0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 transition-colors"
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Caparra default (€)</label>
          <input
            type="number"
            min="0"
            value={deposit}
            onChange={(e) => setDeposit(e.target.value)}
            placeholder="100"
            className="w-full bg-[#0d0e1a] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500/60 transition-colors"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={!label.trim()}
          className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-slate-400 hover:text-slate-200 text-sm px-3 py-2 transition-colors"
        >
          Annulla
        </button>
        {onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="ml-auto flex items-center gap-1.5 text-red-400 hover:text-red-300 text-sm transition-colors"
          >
            <Trash2 size={13} />
            Elimina
          </button>
        )}
      </div>
    </div>
  );
}
