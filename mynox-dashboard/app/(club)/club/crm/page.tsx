import { redirect } from 'next/navigation';
import { getProfile, getStaffPermissions } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
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

  const supabase = await createClient();

  const [{ data: contacts }, { data: events }] = await Promise.all([
    supabase
      .from('tickets')
      .select(`
        id,
        created_at,
        profiles!inner(id, name, email, marketing_consent),
        events!inner(id, name, date, club_id)
      `)
      .eq('events.club_id', profile.club_id)
      .eq('profiles.marketing_consent', true)
      .order('created_at', { ascending: false }),
    supabase
      .from('events')
      .select('id, name')
      .eq('club_id', profile.club_id)
      .order('date', { ascending: false }),
  ]);

  const normalized = (contacts ?? [])
    .map((c) => ({
      id: c.id as string,
      created_at: c.created_at as string,
      profiles: Array.isArray(c.profiles) ? c.profiles[0] : c.profiles,
      events: Array.isArray(c.events) ? c.events[0] : c.events,
    }))
    .filter((c) => c.profiles && c.events);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">{t.clubCrm.title}</h1>
        <p className="text-slate-400 mt-1">{t.clubCrm.subtitle}</p>
      </div>
      <CrmTable
        contacts={normalized}
        events={events ?? []}
      />
    </div>
  );
}
