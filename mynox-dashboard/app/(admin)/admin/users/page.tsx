import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/types';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin',
  club_admin: 'Discoteca',
  customer: 'Cliente',
};

const ROLE_STYLES: Record<string, string> = {
  admin: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  club_admin: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  customer: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export default async function AdminUsersPage() {
  const supabase = await createClient();
  const { data: users } = await supabase
    .from('profiles')
    .select('*')
    .order('member_since', { ascending: false });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Utenti</h1>
        <p className="text-slate-400 mt-1">Tutti gli utenti registrati sulla piattaforma.</p>
      </div>

      <div className="bg-[#111118] border border-white/8 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/8">
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Nome</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Email</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Ruolo</th>
              <th className="text-left px-5 py-3 text-slate-400 font-medium">Membro dal</th>
            </tr>
          </thead>
          <tbody>
            {users && users.length > 0 ? (
              users.map((user: Profile) => (
                <tr key={user.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                  <td className="px-5 py-4 text-white font-medium">{user.name || '—'}</td>
                  <td className="px-5 py-4 text-slate-300">{user.email}</td>
                  <td className="px-5 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                      ROLE_STYLES[user.role] ?? ROLE_STYLES.customer
                    }`}>
                      {ROLE_LABELS[user.role] ?? user.role}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-400">{user.member_since || '—'}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-5 py-12 text-center text-slate-500">
                  Nessun utente trovato.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
