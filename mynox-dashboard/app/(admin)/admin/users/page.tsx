import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';
import UsersTable from '@/components/admin/UsersTable';

const PER_PAGE = 25;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, parseInt((sp.page as string) ?? '1', 10));
  const q = ((sp.q as string) ?? '').trim();
  const role = (sp.role as string) ?? '';
  const status = (sp.status as string) ?? '';
  const offset = (page - 1) * PER_PAGE;

  const supabase = createAdminClient();
  const supabaseServer = await createClient();

  const [{ data: users, error }, { data: total }, { data: clubs }] = await Promise.all([
    supabase.rpc('admin_list_users', {
      p_offset: offset,
      p_limit: PER_PAGE,
      p_role: role || null,
      p_q: q || null,
      p_status: status || null,
    }),
    supabase.rpc('admin_count_users', {
      p_role: role || null,
      p_q: q || null,
      p_status: status || null,
    }),
    supabaseServer.from('clubs').select('id, name').order('name'),
  ]);

  const totalCount = (total as number) ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PER_PAGE));

  const formattedUsers = (users ?? []).map((u: any) => ({
    id: u.id,
    email: u.email ?? '—',
    name: u.name ?? '—',
    role: u.role ?? 'customer',
    clubId: u.club_id ?? null,
    memberSince: u.member_since ?? null,
    createdAt: u.created_at,
    lastSignIn: u.last_sign_in_at ?? null,
    confirmed: !!u.email_confirmed_at,
  }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Utenti</h1>
        <p className="text-slate-400 mt-1">{totalCount} utenti registrati sulla piattaforma.</p>
      </div>

      {error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 text-red-400 text-sm">
          <p className="font-semibold mb-1">Funzioni SQL mancanti</p>
          <p>Esegui <code className="bg-white/10 px-1 rounded">migration_admin_users_pagination.sql</code> su Supabase SQL Editor.</p>
          <p className="mt-2 text-red-500/70 text-xs">{(error as any)?.message}</p>
        </div>
      ) : (
        <UsersTable
          users={formattedUsers}
          clubs={clubs ?? []}
          total={totalCount}
          totalPages={totalPages}
          perPage={PER_PAGE}
          currentPage={page}
          currentQ={q}
          currentRole={role}
          currentStatus={status}
        />
      )}
    </div>
  );
}
