import { getProfile, getStaffPermissions } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getT } from '@/lib/i18n-server';
import { redirect } from 'next/navigation';
import ExtrasManager from '@/components/club/ExtrasManager';

export default async function ExtrasPage() {
  const [profile, t] = await Promise.all([getProfile(), getT()]);
  if (!profile?.club_id) redirect('/club/dashboard');

  const isOwner = profile.role === 'club_admin';
  if (!isOwner) {
    const perms = await getStaffPermissions(profile.id, profile.club_id);
    if (!perms?.can_manage_extras) redirect('/club/dashboard');
  }

  const supabase = await createClient();
  const { data: extras } = await supabase
    .from('club_extras')
    .select('*')
    .eq('club_id', profile.club_id)
    .order('created_at', { ascending: true });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">{t.clubExtras.title}</h1>
        <p className="text-slate-400 mt-1">{t.clubExtras.subtitle}</p>
      </div>
      <ExtrasManager clubId={profile.club_id} initialExtras={extras ?? []} />
    </div>
  );
}
