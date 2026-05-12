import { createClient } from '@/lib/supabase/server';
import ClubRowActions from '@/components/admin/ClubRowActions';
import Link from 'next/link';
import { Plus } from 'lucide-react';

export default async function AdminClubsPage() {
  const supabase = await createClient();

  const [{ data: clubs }, { data: ticketRevenue }, { data: eventCounts }] = await Promise.all([
    supabase.from('clubs').select('*').order('name'),
    supabase
      .from('tickets')
      .select('price_paid, ticket_types(price), events(club_id)')
      .in('status', ['valid', 'used']),
    supabase
      .from('events')
      .select('club_id'),
  ]);

  const revenueByClub: Record<string, number> = {};
  for (const t of ticketRevenue ?? []) {
    const clubId = (t as any).events?.club_id;
    const price = (t as any).ticket_types?.price ?? ((t as any).price_paid ?? 0) / 1.08;
    if (clubId) revenueByClub[clubId] = (revenueByClub[clubId] ?? 0) + price;
  }

  const eventCountByClub: Record<string, number> = {};
  for (const e of eventCounts ?? []) {
    const cid = (e as any).club_id;
    if (cid) eventCountByClub[cid] = (eventCountByClub[cid] ?? 0) + 1;
  }

  const totalRevenue = Object.values(revenueByClub).reduce((a, b) => a + b, 0);
  const activeClubs = (clubs ?? []).filter((c: any) => c.is_active === true).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Discoteche</h1>
          <p className="text-slate-400 mt-1">Gestisci le discoteche registrate sulla piattaforma.</p>
        </div>
        <Link
          href="/admin/clubs/new"
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus size={16} />
          Nuova discoteca
        </Link>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <KpiCard label="Discoteche totali" value={String(clubs?.length ?? 0)} />
        <KpiCard label="Attive" value={String(activeClubs)} accent />
        <KpiCard label="Ricavi totali" value={`€${totalRevenue.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
      </div>

      {/* Tabella */}
      <div className="bg-[#111118] border border-white/8 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8">
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Nome</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium hidden md:table-cell">Città</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Stato</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium hidden md:table-cell">Eventi</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Ricavi</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium hidden md:table-cell">Registrata</th>
              <th className="text-right px-5 py-3 text-slate-400 font-medium">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {clubs && clubs.length > 0 ? (
              clubs.map((club: any) => {
                const isActive = club.is_active === true;
                const isPending = club.is_active === false;
                const textColor = isActive ? 'text-white' : 'text-slate-500';

                let statusBadge;
                if (isActive) {
                  statusBadge = <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-green-500/10 text-green-400 border-green-500/20">Attiva</span>;
                } else if (isPending) {
                  statusBadge = <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-amber-500/10 text-amber-400 border-amber-500/20">In configurazione</span>;
                } else {
                  statusBadge = <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border bg-slate-500/10 text-slate-400 border-slate-500/20">Sospesa</span>;
                }

                return (
                  <tr key={club.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {club.image_url ? (
                          <img src={club.image_url} alt={club.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-white/5 border border-white/10 shrink-0" />
                        )}
                        <span className={`font-medium ${textColor}`}>{club.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-300 hidden md:table-cell">{club.city}</td>
                    <td className="px-5 py-4">{statusBadge}</td>
                    <td className="px-5 py-4 text-slate-300 hidden md:table-cell">{eventCountByClub[club.id] ?? 0}</td>
                    <td className="px-5 py-4 font-semibold text-purple-400">
                      €{(revenueByClub[club.id] ?? 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-4 text-slate-400 hidden md:table-cell">
                      {new Date(club.created_at).toLocaleDateString('it-IT')}
                    </td>
                    <td className="px-5 py-4">
                      <ClubRowActions clubId={club.id} clubName={club.name} isActive={isActive} />
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-5 py-12 text-center text-slate-500">
                  Nessuna discoteca registrata.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function KpiCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="bg-[#111118] border border-white/8 rounded-xl px-5 py-4">
      <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-bold ${accent ? 'text-green-400' : 'text-white'}`}>{value}</p>
    </div>
  );
}
