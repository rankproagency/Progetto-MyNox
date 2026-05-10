import { getProfile, getStaffPermissions, FULL_PERMISSIONS } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Pencil, ArrowLeft, Users, CircleCheck, Circle } from 'lucide-react';

export default async function ClubEventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getProfile();
  if (!profile?.club_id) return <p className="text-slate-400">Club non configurato.</p>;

  const permissions = profile.role === 'club_admin'
    ? FULL_PERMISSIONS
    : await getStaffPermissions(profile.id, profile.club_id);
  const canEdit = permissions?.can_manage_events ?? false;

  const supabase = await createClient();

  const [{ data: event }, { data: tables }, { data: club }, { data: ticketTypes }, { data: soldTickets }, { data: clubTables }] = await Promise.all([
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
      .select('ticket_type_id, price_paid, ticket_types(price)')
      .eq('event_id', id)
      .in('status', ['valid', 'used']),
    supabase
      .from('club_tables')
      .select('id, label, capacity, pos_x, pos_y, default_deposit')
      .eq('club_id', profile.club_id),
  ]);

  if (!event) return <p className="text-slate-400">Evento non trovato.</p>;

  const totalTables = tables?.length ?? 0;
  const reservedTables = tables?.filter((t) => !t.is_available).length ?? 0;
  const floorPlanUrl = club?.floor_plan_url ?? null;

  // Conteggio e ricavi per tipo biglietto — calcolati da tickets reali (non da sold_quantity)
  const soldCountByType: Record<string, number> = {};
  const revenueByType: Record<string, number> = {};
  for (const t of soldTickets ?? []) {
    const tid = (t as any).ticket_type_id;
    if (tid === null) continue; // tavoli — esclusi
    const price = (t as any).ticket_types?.price ?? 0;
    soldCountByType[tid] = (soldCountByType[tid] ?? 0) + 1;
    revenueByType[tid] = (revenueByType[tid] ?? 0) + price;
  }
  const totalRevenue = Object.values(revenueByType).reduce((s, v) => s + v, 0);

  // Ricavi caparre tavoli
  const totalTableRevenue = (soldTickets ?? [])
    .filter((t: any) => t.ticket_type_id === null)
    .reduce((s: number, t: any) => s + (t.price_paid ?? 0), 0);

  // Mappa tavoli
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

      <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">{event.name}</h1>
          <p className="text-slate-400 mt-1">
            {new Date(event.date).toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' })}
            {' · '}{event.start_time}
          </p>
        </div>
        {canEdit && (
          <Link
            href={`/club/events/${id}/edit`}
            className="flex items-center justify-center gap-2 text-sm text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 px-4 py-2 rounded-lg transition-colors w-full md:w-auto"
          >
            <Pencil size={14} />
            Modifica evento
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-[#111118] border border-white/8 rounded-xl p-4">
          <p className="text-slate-400 text-xs mb-1">Biglietti venduti</p>
          <p className="text-2xl font-bold text-white">{event.tickets_sold ?? 0}</p>
          <p className="text-slate-500 text-xs mt-1">su {event.capacity ?? '—'} posti</p>
        </div>
        <div className="bg-[#111118] border border-white/8 rounded-xl p-4">
          <p className="text-slate-400 text-xs mb-1">Tavoli prenotati</p>
          <p className="text-2xl font-bold text-white">{reservedTables}/{totalTables}</p>
          <p className="text-slate-500 text-xs mt-1">{totalTables - reservedTables} ancora disponibili</p>
        </div>
        <div className="bg-[#111118] border border-white/8 rounded-xl p-4">
          <p className="text-slate-400 text-xs mb-1">Ricavi caparre tavoli</p>
          <p className="text-2xl font-bold text-purple-400">
            €{totalTableRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-slate-500 text-xs mt-1">da {reservedTables} prenotazioni</p>
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
                  <th className="text-left px-3 md:px-5 py-3 text-slate-400 font-medium">Tipo</th>
                  <th className="text-left px-3 md:px-5 py-3 text-slate-400 font-medium">Prezzo</th>
                  <th className="text-left px-3 md:px-5 py-3 text-slate-400 font-medium">Venduti</th>
                  <th className="text-left px-5 py-3 text-slate-400 font-medium hidden md:table-cell">Disponibili</th>
                  <th className="text-left px-5 py-3 text-slate-400 font-medium hidden md:table-cell">Ricavi</th>
                  <th className="text-left px-5 py-3 text-slate-400 font-medium hidden md:table-cell">Avanzamento</th>
                </tr>
              </thead>
              <tbody>
                {(ticketTypes ?? []).map((tt, i) => {
                  const sold = soldCountByType[tt.id] ?? 0;
                  const total = tt.total_quantity ?? 0;
                  const available = Math.max(0, total - sold);
                  const revenue = revenueByType[tt.id] ?? 0;
                  const pct = total > 0 ? Math.round((sold / total) * 100) : 0;
                  const isLast = i === (ticketTypes ?? []).length - 1;
                  return (
                    <tr key={tt.id} className={`${!isLast ? 'border-b border-white/5' : ''} hover:bg-white/3 transition-colors`}>
                      <td className="px-3 md:px-5 py-4 text-white font-semibold">{tt.label}</td>
                      <td className="px-3 md:px-5 py-4 text-slate-300">€{Number(tt.price).toFixed(2)}</td>
                      <td className="px-3 md:px-5 py-4 text-white font-semibold">{sold}</td>
                      <td className="px-5 py-4 text-slate-300 hidden md:table-cell">{available}</td>
                      <td className="px-5 py-4 text-purple-400 font-semibold hidden md:table-cell">
                        €{revenue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-5 py-4 w-40 hidden md:table-cell">
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
                  <td className="px-3 md:px-5 py-3 text-slate-400 font-medium" colSpan={2}>Totale ricavi biglietti</td>
                  <td className="px-3 md:px-5 py-3 text-purple-400 font-bold" colSpan={2}>
                    €{totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="hidden md:table-cell" colSpan={3} />
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
              <div className="relative select-none w-full" style={{ maxWidth: '560px' }}>
                <div className="overflow-hidden rounded-xl border border-white/10">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={floorPlanUrl}
                    alt="Piantina"
                    className="w-full object-contain block"
                    draggable={false}
                  />
                </div>

                {mappedTables.map((table) => {
                  const posX = table.pos_x as number;
                  const posY = table.pos_y as number;
                  const isReserved = !table.is_available;
                  const showBelow = posY < 0.28;
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

      {/* Prenotazioni tavoli */}
      {totalTables > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Prenotazioni tavoli</h2>
          <div className="bg-[#111118] border border-white/8 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/8">
                  <th className="text-left px-3 md:px-5 py-3 text-slate-400 font-medium">Tavolo</th>
                  <th className="text-left px-3 md:px-5 py-3 text-slate-400 font-medium hidden md:table-cell">Posti</th>
                  <th className="text-left px-3 md:px-5 py-3 text-slate-400 font-medium hidden md:table-cell">Caparra</th>
                  <th className="text-left px-3 md:px-5 py-3 text-slate-400 font-medium">Nome tavolo</th>
                  <th className="text-left px-3 md:px-5 py-3 text-slate-400 font-medium">Stato</th>
                </tr>
              </thead>
              <tbody>
                {tables!.map((table) => (
                  <tr key={table.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="px-3 md:px-5 py-4 text-white font-semibold">{table.label}</td>
                    <td className="px-3 md:px-5 py-4 text-slate-300 hidden md:table-cell">{table.capacity}</td>
                    <td className="px-3 md:px-5 py-4 text-slate-300 hidden md:table-cell">€{Number(table.deposit).toFixed(2)}</td>
                    <td className="px-3 md:px-5 py-4">
                      {table.reserved_by ? (
                        <span className="text-white font-medium">{table.reserved_by}</span>
                      ) : (
                        <span className="text-slate-600 italic">—</span>
                      )}
                    </td>
                    <td className="px-3 md:px-5 py-4">
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
        </div>
      )}
    </div>
  );
}
