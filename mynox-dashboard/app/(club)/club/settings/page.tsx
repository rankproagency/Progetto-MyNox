import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import ClubSettingsForm from '@/components/club/ClubSettingsForm';
import { getT } from '@/lib/i18n-server';

export default async function ClubSettingsPage() {
  const t = await getT();
  const profile = await getProfile();
  if (!profile?.club_id) return <p className="text-slate-400">{t.common.notConfigured}</p>;

  if (profile.role !== 'club_admin') redirect('/club/dashboard');

  const supabase = await createClient();
  const { data: club } = await supabase.from('clubs').select('*').eq('id', profile.club_id).single();

  if (!club) return <p className="text-slate-400">{t.clubSettings.notFound}</p>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">{t.clubSettings.title}</h1>
        <p className="text-slate-400 mt-1">{t.clubSettings.subtitle}</p>
      </div>
      <ClubSettingsForm club={club} />
    </div>
  );
}
