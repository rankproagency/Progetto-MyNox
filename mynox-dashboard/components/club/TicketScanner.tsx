'use client';

import { useEffect, useRef, useState } from 'react';
import { Scan, Search, CheckCircle2, XCircle, Clock } from 'lucide-react';

type ScanState = 'idle' | 'success' | 'error';
type Tab = 'scan' | 'search';

interface ScanResult {
  ok: boolean;
  name?: string;
  ticketType?: string;
  reason?: 'already_used' | 'invalid' | 'unauthorized' | 'not_yet' | 'event_ended' | 'wrong_event';
  usedAt?: string;
  eventDate?: string;
}

interface Event {
  id: string;
  name: string;
}

interface Props {
  events: Event[];
  defaultEventId: string;
}

export default function TicketScanner({ events, defaultEventId }: Props) {
  const [tab, setTab] = useState<Tab>('scan');
  const [selectedEventId, setSelectedEventId] = useState(defaultEventId);
  const [scanState, setScanState] = useState<ScanState>('idle');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const html5QrRef = useRef<any>(null);
  const processingRef = useRef(false);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  async function handleCode(rawCode: string) {
    if (processingRef.current) return;
    processingRef.current = true;

    const code = rawCode.trim();
    const res = await fetch('/api/club/validate-ticket', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, eventId: selectedEventId }),
    });
    const data: ScanResult = await res.json();

    setResult(data);
    setScanState(data.ok ? 'success' : 'error');

    if (data.ok) {
      navigator.vibrate?.([80]);
    } else {
      navigator.vibrate?.([120, 60, 120]);
    }

    clearTimeout(resetTimerRef.current);
    resetTimerRef.current = setTimeout(() => {
      setScanState('idle');
      setResult(null);
      processingRef.current = false;
    }, 2000);
  }

  useEffect(() => {
    if (tab !== 'scan') return;

    let instance: any;
    setCameraError(false);

    async function init() {
      const { Html5Qrcode } = await import('html5-qrcode');
      instance = new Html5Qrcode('qr-reader');
      html5QrRef.current = instance;

      try {
        await instance.start(
          { facingMode: 'environment' },
          {
            fps: 15,
            qrbox: (w: number, h: number) => {
              const side = Math.round(Math.min(w, h) * 0.75);
              return { width: side, height: side };
            },
          },
          (text: string) => { handleCode(text); },
          () => {}
        );
      } catch {
        setCameraError(true);
      }
    }

    init();

    return () => {
      if (instance) instance.stop().catch(() => {});
      clearTimeout(resetTimerRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, selectedEventId]);

  async function handleManualSubmit(e: React.FormEvent) {
    e.preventDefault();
    const code = manualCode.trim().toUpperCase();
    if (code.length < 6 || manualLoading) return;
    setManualLoading(true);
    await handleCode(code);
    setManualLoading(false);
    setManualCode('');
  }

  function switchTab(t: Tab) {
    setTab(t);
    setScanState('idle');
    setResult(null);
    processingRef.current = false;
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#07080f]">

      {/* Header */}
      <div className="flex-none pl-14 pr-4 md:px-4 pt-10 md:pt-4 pb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full flex-none ${
            scanState === 'idle' ? 'bg-green-400 animate-pulse' :
            scanState === 'success' ? 'bg-green-400' : 'bg-red-400'
          }`} />
          <span className="text-white text-sm font-semibold">Scanner ingresso</span>
        </div>
        {events.length > 1 ? (
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-purple-500/40 max-w-[160px] truncate"
          >
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>{ev.name}</option>
            ))}
          </select>
        ) : (
          <span className="text-slate-400 text-xs truncate max-w-[160px]">{events[0]?.name}</span>
        )}
      </div>

      {/* Tabs */}
      <div className="flex-none mx-4 mb-3 flex bg-white/5 rounded-xl p-1 gap-1">
        {(['scan', 'search'] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => switchTab(t)}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-colors ${
              tab === t ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {t === 'scan' ? <><Scan size={13} /> Scansiona QR</> : <><Search size={13} /> Codice manuale</>}
          </button>
        ))}
      </div>

      {/* Content */}
      {tab === 'scan' ? (
        <div className="flex-1 flex flex-col items-center px-4 pb-4 min-h-0 gap-3">

          {/* Camera — quadrato adattivo */}
          <div className="w-full min-h-0 flex-1 max-h-[min(calc(100vw-2rem),calc(100vh-280px))] relative rounded-2xl overflow-hidden bg-black">
            <div className={`absolute inset-0 z-10 pointer-events-none transition-all duration-200 rounded-2xl ${
              scanState === 'success' ? 'ring-4 ring-green-500 bg-green-500/10' :
              scanState === 'error' ? 'ring-4 ring-red-500 bg-red-500/10' :
              'ring-0 bg-transparent'
            }`} />

            {cameraError ? (
              <div className="h-full flex flex-col items-center justify-center gap-3 p-8 text-center">
                <Scan size={40} className="text-slate-600" />
                <p className="text-slate-300 font-semibold">Camera non disponibile</p>
                <p className="text-slate-500 text-sm">Usa la tab &quot;Codice manuale&quot; oppure verifica i permessi camera del browser.</p>
                <button
                  onClick={() => switchTab('search')}
                  className="mt-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors"
                >
                  Vai al codice manuale
                </button>
              </div>
            ) : (
              <div id="qr-reader" className="w-full h-full" />
            )}
          </div>

          {/* Result */}
          {result && <ResultCard result={result} />}
        </div>

      ) : (
        <div className="flex-1 flex flex-col px-4 pb-4 min-h-0">
          <form onSubmit={handleManualSubmit} className="flex flex-col gap-4 w-full max-w-sm mx-auto">
            <p className="text-slate-400 text-sm text-center">
              Digita il codice a 6 caratteri mostrato sul biglietto
            </p>
            <input
              type="text"
              inputMode="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
              placeholder="A7XK2M"
              maxLength={6}
              autoFocus
              className="bg-white/5 border border-white/10 rounded-2xl px-4 py-5 text-3xl sm:text-4xl text-white text-center font-mono tracking-[0.3em] sm:tracking-[0.4em] placeholder:text-slate-700 focus:outline-none focus:border-purple-500/50 focus:ring-2 focus:ring-purple-500/20 w-full"
            />
            <button
              type="submit"
              disabled={manualCode.length < 6 || manualLoading}
              className="bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white font-bold py-4 rounded-2xl transition-colors text-base w-full"
            >
              {manualLoading ? 'Verifica in corso...' : 'Valida biglietto'}
            </button>
          </form>

          {result && (
            <div className="mt-4 max-w-sm mx-auto w-full">
              <ResultCard result={result} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ResultCard({ result }: { result: ScanResult }) {
  const isOrange = !result.ok && (result.reason === 'already_used' || result.reason === 'not_yet' || result.reason === 'event_ended');
  const cardClass = result.ok
    ? 'bg-green-500/10 border-green-500/40'
    : isOrange
      ? 'bg-orange-500/10 border-orange-500/40'
      : 'bg-red-500/10 border-red-500/40';

  return (
    <div className={`w-full rounded-2xl p-4 flex items-center gap-3 border-2 transition-all ${cardClass}`}>
      <div className="shrink-0">
        {result.ok ? (
          <CheckCircle2 size={36} className="text-green-400" />
        ) : isOrange ? (
          <Clock size={36} className="text-orange-400" />
        ) : (
          <XCircle size={36} className="text-red-400" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        {result.ok ? (
          <>
            <p className="text-green-400 font-bold text-base">Ingresso valido ✓</p>
            <p className="text-white text-sm mt-0.5 truncate">{result.name}</p>
            <p className="text-slate-400 text-xs mt-0.5">{result.ticketType}</p>
          </>
        ) : result.reason === 'already_used' ? (
          <>
            <p className="text-orange-400 font-bold text-base">Biglietto già usato</p>
            {result.usedAt && <p className="text-slate-300 text-sm mt-0.5">Prima scansione alle {result.usedAt}</p>}
          </>
        ) : result.reason === 'wrong_event' ? (
          <>
            <p className="text-red-400 font-bold text-base">Biglietto per un altro evento</p>
            <p className="text-slate-300 text-sm mt-0.5">Questo biglietto non è valido per la serata selezionata.</p>
          </>
        ) : result.reason === 'not_yet' ? (
          <>
            <p className="text-orange-400 font-bold text-base">Serata non ancora iniziata</p>
            <p className="text-slate-300 text-sm mt-0.5">Lo scanner si attiva dal giorno dell&apos;evento.</p>
          </>
        ) : result.reason === 'event_ended' ? (
          <>
            <p className="text-orange-400 font-bold text-base">Serata terminata</p>
            <p className="text-slate-300 text-sm mt-0.5">La finestra di ingresso è chiusa.</p>
          </>
        ) : (
          <p className="text-red-400 font-bold text-base">Biglietto non valido</p>
        )}
      </div>
    </div>
  );
}
