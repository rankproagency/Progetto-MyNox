import { createClient } from '@/lib/supabase/server';
import ClubRowActions from '@/components/admin/ClubRowActions';

export default async function AdminClubsPage() {
  const supabase = await createClient();

  const [{ data: clubs }, { data: ticketRevenue }, { data: eventCounts }] = await Promise.all([
    supabase.from('clubs').select('*').order('name'),
    supabase
      .from('tickets')
      .select('ticket_types(price), events(club_id)')
      .in('status', ['valid', 'used']),
    supabase
      .from('events')
      .select('club_id'),
  ]);

  const revenueByClub: Record<string, number> = {};
  for (const t of ticketRevenue ?? []) {
    const clubId = (t as any).events?.club_id;
    const price = (t as any).ticket_types?.price ?? 0;
    if (clubId) revenueByClub[clubId] = (revenueByClub[clubId] ?? 0) + price;
  }

  const eventCountByClub: Record<string, number> = {};
  for (const e of eventCounts ?? []) {
    const cid = (e as any).club_id;
    if (cid) eventCountByClub[cid] = (eventCountByClub[cid] ?? 0) + 1;
  }

  const totalRevenue = Object.values(revenueByClub).reduce((a, b) => a + b, 0);
  const activeClubs = (clubs ?? []).filter((c: any) => c.is_active !== false).length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Discoteche</h1>
        <p className="text-slate-400 mt-1">Gestisci le discoteche registrate sulla piattaforma.</p>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-4 mb-8">
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
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Città</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Stato</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Eventi</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Ricavi</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Registrata</th>
              <th className="text-right px-5 py-3 text-slate-400 font-medium">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {clubs && clubs.length > 0 ? (
              clubs.map((club: any) => {
                const isActive = club.is_active !== false;
                return (
                  <tr key={club.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        {club.image_url && (
                          <img src={club.image_url} alt={club.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                        )}
                        <span className={`font-medium ${isActive ? 'text-white' : 'text-slate-500'}`}>{club.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-slate-300">{club.city}</td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${
                        isActive
                          ? 'bg-green-500/10 text-green-400 border-green-500/20'
                          : 'bg-slate-500/10 text-slate-400 border-slate-500/20'
                      }`}>
                        {isActive ? 'Attiva' : 'Sospesa'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-300">{eventCountByClub[club.id] ?? 0}</td>
                    <td className="px-5 py-4 font-semibold text-purple-400">
                      €{(revenueByClub[club.id] ?? 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-4 text-slate-400">
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
