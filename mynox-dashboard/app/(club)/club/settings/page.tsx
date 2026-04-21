import { getProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import ClubSettingsForm from '@/components/club/ClubSettingsForm';

export default async function ClubSettingsPage() {
  const profile = await getProfile();
  if (!profile?.club_id) return <p className="text-slate-400">Club non configurato. Contatta l&apos;amministratore.</p>;

  const supabase = await createClient();
  const { data: club } = await supabase.from('clubs').select('*').eq('id', profile.club_id).single();

  if (!club) return <p className="text-slate-400">Club non trovato.</p>;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Profilo club</h1>
        <p className="text-slate-400 mt-1">Modifica le informazioni pubbliche della tua discoteca.</p>
      </div>
      <ClubSettingsForm club={club} />
    </div>
  );
}
