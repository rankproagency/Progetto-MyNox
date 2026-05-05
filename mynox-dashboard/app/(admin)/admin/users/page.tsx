import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import { Users } from 'lucide-react';
import UserRoleEditor from '@/components/admin/UserRoleEditor';

const ROLE_LABELS: Record<string, string> = {
  admin:      'Admin',
  club_admin: 'Discoteca',
  customer:   'Cliente',
};

const ROLE_STYLES: Record<string, string> = {
  admin:      'bg-purple-500/10 text-purple-400 border-purple-500/20',
  club_admin: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  customer:   'bg-slate-500/10 text-slate-400 border-slate-500/20',
};

export default async function AdminUsersPage() {
  const supabase = createAdminClient();
  const supabaseServer = await createClient();

  // Tutti gli utenti registrati in Supabase Auth
  const { data: authData, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });

  // Profili con ruolo e club_id
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, name, role, club_id, member_since');

  // Club per il dropdown
  const { data: clubs } = await supabaseServer.from('clubs').select('id, name').order('name');

  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

  const users = (authData?.users ?? []).map((u) => {
    const profile = profileMap[u.id];
    return {
      id:          u.id,
      email:       u.email ?? '—',
      name:        profile?.name ?? u.user_metadata?.name ?? '—',
      role:        profile?.role ?? 'customer',
      clubId:      profile?.club_id ?? null,
      memberSince: profile?.member_since ?? null,
      createdAt:   u.created_at,
      lastSignIn:  u.last_sign_in_at ?? null,
      confirmed:   !!u.email_confirmed_at,
    };
  });

  // Ordina: prima admin, poi club_admin, poi customer — poi per data registrazione
  const roleOrder: Record<string, number> = { admin: 0, club_admin: 1, customer: 2 };
  users.sort((a, b) => {
    const rDiff = (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3);
    if (rDiff !== 0) return rDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Utenti</h1>
          <p className="text-slate-400 mt-1">
            {users.length} utenti registrati sulla piattaforma.
          </p>
        </div>
      </div>

      {error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-red-400 text-sm">
          <p className="font-semibold mb-1">Errore di accesso</p>
          <p>Aggiungi <code className="bg-white/10 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> al file <code className="bg-white/10 px-1 rounded">.env.local</code> della dashboard.</p>
          <p className="mt-2 text-red-500/70 text-xs">La trovi su: Supabase → Project Settings → API → service_role (secret)</p>
        </div>
      ) : (
        <div className="bg-[#111118] border border-white/8 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/8">
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Nome</th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Email</th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Ruolo</th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Registrato il</th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Ultimo accesso</th>
                <th className="text-left px-5 py-3 text-slate-400 font-medium">Stato</th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? (
                users.map((user) => (
                  <tr key={user.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                    <td className="px-5 py-4 text-white font-medium">{user.name}</td>
                    <td className="px-5 py-4 text-slate-300">{user.email}</td>
                    <td className="px-5 py-4">
                      <UserRoleEditor
                        userId={user.id}
                        currentRole={user.role}
                        currentClubId={user.clubId}
                        clubs={clubs ?? []}
                      />
                    </td>
                    <td className="px-5 py-4 text-slate-400">
                      {new Date(user.createdAt).toLocaleDateString('it-IT', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}
                    </td>
                    <td className="px-5 py-4 text-slate-400">
                      {user.lastSignIn
                        ? new Date(user.lastSignIn).toLocaleDateString('it-IT', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })
                        : '—'}
                    </td>
                    <td className="px-5 py-4">
                      {user.confirmed ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-green-500/10 text-green-400 border-green-500/20">
                          Confermato
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border bg-amber-500/10 text-amber-400 border-amber-500/20">
                          In attesa
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="px-5 py-16 text-center">
                    <Users size={32} className="text-slate-600 mx-auto mb-3" />
                    <p className="text-slate-400 font-medium">Nessun utente trovato</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
