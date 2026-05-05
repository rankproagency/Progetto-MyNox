import { createClient } from '@/lib/supabase/server';
import { InviteClubManager } from './InviteClubManager';
import type { Club } from '@/types';

export default async function AdminClubsPage() {
  const supabase = await createClient();

  const [{ data: clubs }, { data: ticketRevenue }] = await Promise.all([
    supabase.from('clubs').select('*').order('name'),
    supabase
      .from('tickets')
      .select('ticket_types(price), events(club_id)')
      .in('status', ['valid', 'used']),
  ]);

  const revenueByClub: Record<string, number> = {};
  for (const t of ticketRevenue ?? []) {
    const clubId = (t as any).events?.club_id;
    const price = (t as any).ticket_types?.price ?? 0;
    if (clubId) revenueByClub[clubId] = (revenueByClub[clubId] ?? 0) + price;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Discoteche</h1>
        <p className="text-slate-400 mt-1">Gestisci le discoteche registrate sulla piattaforma.</p>
      </div>

      <div className="bg-[#111118] border border-white/8 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8">
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Nome</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Città</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Ricavi totali</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Email</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Telefono</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Registrata</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {clubs && clubs.length > 0 ? (
              clubs.map((club: Club) => (
                <tr key={club.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="px-5 py-4 text-white font-medium">{club.name}</td>
                  <td className="px-5 py-4 text-slate-300">{club.city}</td>
                  <td className="px-5 py-4 font-semibold text-purple-400">
                    €{(revenueByClub[club.id] ?? 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-4 text-slate-300">{club.email ?? '—'}</td>
                  <td className="px-5 py-4 text-slate-300">{club.phone ?? '—'}</td>
                  <td className="px-5 py-4 text-slate-400">
                    {new Date(club.created_at).toLocaleDateString('it-IT')}
                  </td>
                  <td className="px-5 py-4">
                    <InviteClubManager clubId={club.id} clubName={club.name} />
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-slate-500">
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
