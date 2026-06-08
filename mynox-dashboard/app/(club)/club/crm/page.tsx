import { redirect } from 'next/navigation';
import { getProfile, getStaffPermissions } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { getT } from '@/lib/i18n-server';
import CrmTable from '@/components/club/CrmTable';

export default async function CrmPage() {
  const t = await getT();
  const profile = await getProfile();
  if (!profile || !profile.club_id) redirect('/club/dashboard');

  const isOwner = profile.role === 'club_admin';
  if (!isOwner) {
    const perms = await getStaffPermissions(profile.id, profile.club_id);
    if (!perms?.can_view_participants) redirect('/club/dashboard');
  }

  const admin = createAdminClient();

  // Step 1: get this club's events
  const { data: events } = await admin
    .from('events')
    .select('id, name, date')
    .eq('club_id', profile.club_id)
    .order('date', { ascending: false });

  const eventIds = (events ?? []).map((e) => e.id);
  const eventMap = new Map((events ?? []).map((e) => [e.id, e]));

  // Step 2: get tickets for those events
  const { data: tickets } = eventIds.length > 0
    ? await admin
        .from('tickets')
        .select('id, created_at, user_id, event_id')
        .in('event_id', eventIds)
        .order('created_at', { ascending: false })
    : { data: null };

  // Step 3: fetch profiles with marketing_consent = true for those users
  const userIds = [...new Set((tickets ?? []).map((t: any) => t.user_id))];
  const { data: profiles } = userIds.length > 0
    ? await admin
        .from('profiles')
        .select('id, name, email, marketing_consent')
        .in('id', userIds)
        .eq('marketing_consent', true)
    : { data: null };

  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

  const normalized = (tickets ?? [])
    .filter((t: any) => profileMap.has(t.user_id) && eventMap.has(t.event_id))
    .map((t: any) => ({
      id: t.id as string,
      created_at: t.created_at as string,
      profiles: profileMap.get(t.user_id),
      events: eventMap.get(t.event_id),
    }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">{t.clubCrm.title}</h1>
        <p className="text-slate-400 mt-1">{t.clubCrm.subtitle}</p>
      </div>
      <CrmTable
        contacts={normalized as any}
        events={events ?? []}
      />
    </div>
  );
}
