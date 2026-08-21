import { redirect } from 'next/navigation';
import { getProfile, getStaffPermissions } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { getT } from '@/lib/i18n-server';
import CrmTable from '@/components/club/CrmTable';

const PAGE_SIZE = 50;

interface Props {
  searchParams: Promise<{ query?: string; event?: string; page?: string }>;
}

export default async function CrmPage({ searchParams }: Props) {
  const t = await getT();
  const profile = await getProfile();
  if (!profile || !profile.club_id) redirect('/club/dashboard');

  const isOwner = profile.role === 'club_admin';
  if (!isOwner) {
    const perms = await getStaffPermissions(profile.id, profile.club_id);
    if (!perms?.can_access_crm) redirect('/club/dashboard');
  }

  const params = await searchParams;
  const query = params.query?.trim() ?? '';
  const eventFilter = params.event ?? '';
  const page = Math.max(1, parseInt(params.page ?? '1', 10));
  const offset = (page - 1) * PAGE_SIZE;

  const admin = createAdminClient();

  // Carica eventi per il filtro dropdown (piccolo set, sempre veloce)
  const { data: events } = await admin
    .from('events')
    .select('id, name, date')
    .eq('club_id', profile.club_id)
    .order('date', { ascending: false });

  // RPC paginata — DB fa tutto: join, dedup, ricerca, paginazione
  const { data: rows, error } = await admin.rpc('get_crm_contacts', {
    p_club_id:  profile.club_id,
    p_search:   query,
    p_event_id: eventFilter || null,
    p_limit:    PAGE_SIZE,
    p_offset:   offset,
  });

  const contacts = (rows ?? []).map((r: any) => ({
    id:         r.ticket_id,
    created_at: r.created_at,
    profiles:   { id: r.user_id,   name: r.user_name, email: r.user_email, marketing_consent: r.marketing_consent ?? false },
    events:     { id: r.event_id,  name: r.event_name, date: r.event_date },
  }));

  const totalCount: number = rows?.[0]?.total_count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">{t.clubCrm.title}</h1>
        <p className="text-slate-400 mt-1">{t.clubCrm.subtitle}</p>
      </div>
      <CrmTable
        contacts={contacts}
        events={events ?? []}
        totalCount={totalCount}
        totalPages={totalPages}
        currentPage={page}
        currentQuery={query}
        currentEvent={eventFilter}
      />
    </div>
  );
}
