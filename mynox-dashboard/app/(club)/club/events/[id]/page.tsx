import { getProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import Link from 'next/link';
import { Pencil, ArrowLeft, Users, CircleCheck, Circle } from 'lucide-react';
import ParticipantsTable from '@/components/club/ParticipantsTable';

export default async function ClubEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile();
  if (!profile?.club_id) return <p className="text-slate-400">Club non configurato.</p>;

  const supabase = await createClient();

  const adminSupabase = createAdminClient();

  const [{ data: event }, { data: tables }, { data: club }, { data: ticketTypes }, { data: soldTickets }, { data: clubTables }, { data: rawParticipants }] = await Promise.all([
    supabase
      .from('events')
      .select('*')
      .eq('id', id)
      .eq('club_id', profile.club_id)
      .single(),
    supabase
      .from('tables')
      .select('*')
      .eq('event_id', id)
      .order('label', { ascending: true }),
    supabase
      .from('clubs')
      .select('floor_plan_url')
      .eq('id', profile.club_id)
      .single(),
    supabase
      .from('ticket_types')
      .select('id, label, price, total_quantity, sold_quantity')
      .eq('event_id', id)
      .order('label', { ascending: true }),
    supabase
      .from('tickets')
      .select('ticket_type_id, ticket_types(price)')
      .eq('event_id', id)
      .in('status', ['valid', 'used']),
    supabase
      .from('club_tables')
      .select('id, label, capacity, pos_x, pos_y, default_deposit')
      .eq('club_id', profile.club_id),
    adminSupabase
      .from('tickets')
      .select('id, status, drink_used, created_at, user_id, ticket_type_id, ticket_types(label, price), profiles(name, email)')
      .eq('event_id', id)
      .order('created_at', { ascending: true }),
  ]);

  if (!event) return <p className="text-slate-400">Evento non trovato.</p>;

  const totalTables = tables?.length ?? 0;
  const reservedTables = tables?.filter((t) => !t.is_available).length ?? 0;
  const floorPlanUrl = club?.floor_plan_url ?? null;

  // Ricavi per tipo biglietto
  const revenueByType: Record<string, number> = {};
  for (const t of soldTickets ?? []) {
    const tid = (t as any).ticket_type_id;
    const price = (t as any).ticket_types?.price ?? 0;
    revenueByType[tid] = (revenueByType[tid] ?? 0) + price;
  }
  const totalRevenue = Object.values(revenueByType).reduce((s, v) => s + v, 0);

  const participants = (rawParticipants ?? []).map((t: any) => ({
    id: t.id,
    name: t.profiles?.name ?? '—',
    email: t.profiles?.email ?? '—',
    ticketLabel: t.ticket_types?.label ?? '—',
    price: t.ticket_types?.price ?? 0,
    status: t.status,
    drinkUsed: t.drink_used,
    createdAt: t.created_at,
  }));

  // Mappa tavoli: usa club_tables per le posizioni, tables per la disponibilità evento
  // Abbina per label (A, B, C, D...)
  const eventTableByLabel = new Map((tables ?? []).map((t) => [t.label, t]));
  const mappedTables = (clubTables ?? []).filter(
    (ct) => ct.pos_x != null && ct.pos_y != null
  ).map((ct) => {
    const eventTable = eventTableByLabel.get(ct.label);
    return {
      ...ct,
      is_available: eventTable ? eventTable.is_available : true,
      reserved_by: eventTable ? (eventTable as any).reserved_by : null,
      deposit: eventTable ? eventTable.deposit : ct.default_deposit,
    };
  });
  const showMap = floorPlanUrl && mappedTables.length > 0;

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-3 mb-2">
        <Link
          href="/club/events"
          className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition-colors"
        >
          <ArrowLeft size={15} />
          Eventi
        </Link>
        <span className="text-slate-600">/</span>
        <span className="text-slate-400 text-sm">{event.name}</span>
      </div>

      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">{event.name}</h1>
          <p className="text-slate-400 mt-1">
            {new Date(event.date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
            {' · '}{event.start_time}
          </p>
        </div>
        <Link
          href={`/club/events/${id}/edit`}
          className="flex items-center gap-2 text-sm text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-lg transition-colors"
        >
          <Pencil size={14} />
          Modifica evento
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-[#111118] border border-white/8 rounded-xl p-4">
          <p className="text-slate-400 text-xs mb-1">Biglietti venduti</p>
          <p className="text-2xl font-bold text-white">{event.tickets_sold ?? 0}</p>
          <p className="text-slate-500 text-xs mt-1">su {event.capacity ?? '—'} posti</p>
        </div>
        <div className="bg-[#111118] border border-white/8 rounded-xl p-4">
          <p className="text-slate-400 text-xs mb-1">Tavoli prenotati</p>
          <p className="text-2xl font-bold text-white">{reservedTables}</p>
          <p className="text-slate-500 text-xs mt-1">su {totalTables} tavoli</p>
        </div>
        <div className="bg-[#111118] border border-white/8 rounded-xl p-4">
          <p className="text-slate-400 text-xs mb-1">Tavoli liberi</p>
          <p className="text-2xl font-bold text-green-400">{totalTables - reservedTables}</p>
          <p className="text-slate-500 text-xs mt-1">disponibili</p>
        </div>
      </div>

      {/* Biglietti per tipo */}
      {(ticketTypes ?? []).length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Biglietti per tipo</h2>
          <div className="bg-[#111118] border border-white/8 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8">
                  <th className="text-left px-5 py-3 text-slate-400 font-medium">Tipo</th>
                  <th className="text-left px-5 py-3 text-slate-400 font-medium">Prezzo</th>
                  <th className="text-left px-5 py-3 text-slate-400 font-medium">Venduti</th>
                  <th className="text-left px-5 py-3 text-slate-400 font-medium">Disponibili</th>
                  <th className="text-left px-5 py-3 text-slate-400 font-medium">Ricavi</th>
                  <th className="text-left px-5 py-3 text-slate-400 font-medium">Avanzamento</th>
                </tr>
              </thead>
              <tbody>
                {(ticketTypes ?? []).map((tt, i) => {
                  const sold = tt.sold_quantity ?? 0;
                  const total = tt.total_quantity ?? 0;
                  const available = Math.max(0, total - sold);
                  const revenue = revenueByType[tt.id] ?? 0;
                  const pct = total > 0 ? Math.round((sold / total) * 100) : 0;
                  const isLast = i === (ticketTypes ?? []).length - 1;
                  return (
                    <tr key={tt.id} className={`${!isLast ? 'border-b border-white/5' : ''} hover:bg-white/3 transition-colors`}>
                      <td className="px-5 py-4 text-white font-semibold">{tt.label}</td>
                      <td className="px-5 py-4 text-slate-300">€{Number(tt.price).toFixed(2)}</td>
                      <td className="px-5 py-4 text-white font-semibold">{sold}</td>
                      <td className="px-5 py-4 text-slate-300">{available}</td>
                      <td className="px-5 py-4 text-purple-400 font-semibold">
                        €{revenue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-4 w-40">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-purple-500 rounded-full"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-slate-400 w-8 text-right">{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="border-t border-white/8 bg-white/3">
                  <td className="px-5 py-3 text-slate-400 font-medium" colSpan={4}>Totale ricavi biglietti</td>
                  <td className="px-5 py-3 text-purple-400 font-bold">
                    €{totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Mappa piantina */}
      {showMap && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">Mappa tavoli</h2>
          <div className="bg-[#111118] border border-white/8 rounded-xl p-4">
            <div className="flex justify-center">
              {/* Contenitore posizionamento — NO overflow-hidden così i tooltip non vengono tagliati */}
              <div className="relative select-none w-full" style={{ maxWidth: '560px' }}>
                {/* Immagine con il suo clip separato */}
                <div className="overflow-hidden rounded-xl border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={floorPlanUrl}
                    alt="Piantina"
                    className="w-full object-contain block"
                    draggable={false}
                  />
                </div>

                {/* Marker posizionati sullo stesso sistema percentuale dell'immagine */}
                {mappedTables.map((table) => {
                  const posX = table.pos_x as number;
                  const posY = table.pos_y as number;
                  const isReserved = !table.is_available;

                  // Direzione tooltip: verso il basso se il tavolo è in alto, altrimenti verso l'alto
                  const showBelow = posY < 0.28;
                  // Allineamento orizzontale tooltip: evita uscita a sinistra/destra
                  const tooltipAlign =
                    posX < 0.22
                      ? 'left-0'
                      : posX > 0.78
                      ? 'right-0'
                      : 'left-1/2 -translate-x-1/2';

                  return (
                    <div
                      key={table.id}
                      className="group absolute"
                      style={{
                        left: `${posX * 100}%`,
                        top: `${posY * 100}%`,
                        transform: 'translate(-50%, -50%)',
                        zIndex: 10,
                      }}
                    >
                      {/* Marker */}
                      <div
                        className={`w-10 h-10 rounded-full border-2 flex flex-col items-center justify-center shadow-lg transition-transform group-hover:scale-110 cursor-default ${
                          isReserved
                            ? 'bg-red-500/20 border-red-400 text-red-300'
                            : 'bg-green-500/20 border-green-400 text-green-300'
                        }`}
                      >
                        <span className="text-xs font-bold leading-none">{table.capacity}</span>
                        <span className="text-[9px] leading-none mt-0.5 opacity-70">{table.label}</span>
                      </div>

                      {/* Tooltip — direzione e allineamento adattivi */}
                      <div
                        className={`absolute ${tooltipAlign} ${showBelow ? 'top-full mt-2' : 'bottom-full mb-2'} hidden group-hover:block z-30 pointer-events-none`}
                      >
                        <div className="bg-[#0d0e1a] border border-white/20 rounded-lg px-3 py-2 text-xs text-white shadow-xl whitespace-nowrap">
                          <p className="font-semibold">{table.label}</p>
                          <p className="text-slate-400 mt-0.5">
                            {table.capacity} posti · €{Number(table.deposit).toFixed(0)} caparra
                          </p>
                          {isReserved && (
                            <p className="text-red-400 mt-0.5">
                              {table.reserved_by ? `"${table.reserved_by}"` : 'Prenotato'}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Legenda */}
            <div className="flex items-center gap-6 mt-3">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-green-500/20 border-2 border-green-400" />
                <span className="text-xs text-slate-400">Disponibile</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-500/20 border-2 border-red-400" />
                <span className="text-xs text-slate-400">Prenotato</span>
              </div>
              <span className="text-xs text-slate-600 ml-auto">Passa il mouse su un tavolo per i dettagli</span>
            </div>
          </div>
        </div>
      )}

      {/* Partecipanti */}
      <div className="mb-8">
        <ParticipantsTable participants={participants} eventName={event.name} />
      </div>

      {/* Tabella prenotazioni */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Prenotazioni tavoli</h2>

        {totalTables === 0 ? (
          <div className="bg-[#111118] border border-white/8 rounded-xl p-10 text-center">
            <Users size={32} className="text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 font-medium">Nessun tavolo configurato per questo evento</p>
            <p className="text-slate-500 text-sm mt-1">Modifica l&apos;evento per aggiungere i tavoli.</p>
          </div>
        ) : (
          <div className="bg-[#111118] border border-white/8 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8">
                  <th className="text-left px-5 py-3 text-slate-400 font-medium">Tavolo</th>
                  <th className="text-left px-5 py-3 text-slate-400 font-medium">Posti</th>
                  <th className="text-left px-5 py-3 text-slate-400 font-medium">Caparra</th>
                  <th className="text-left px-5 py-3 text-slate-400 font-medium">Nome tavolo</th>
                  <th className="text-left px-5 py-3 text-slate-400 font-medium">Stato</th>
                </tr>
              </thead>
              <tbody>
                {tables!.map((table) => (
                  <tr key={table.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="px-5 py-4 text-white font-semibold">{table.label}</td>
                    <td className="px-5 py-4 text-slate-300">{table.capacity}</td>
                    <td className="px-5 py-4 text-slate-300">€{Number(table.deposit).toFixed(2)}</td>
                    <td className="px-5 py-4">
                      {table.reserved_by ? (
                        <span className="text-white font-medium">{table.reserved_by}</span>
                      ) : (
                        <span className="text-slate-600 italic">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      {table.is_available ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-green-500/10 text-green-400 border-green-500/20">
                          <Circle size={8} fill="currentColor" />
                          Disponibile
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border bg-red-500/10 text-red-400 border-red-500/20">
                          <CircleCheck size={10} />
                          Prenotato
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
