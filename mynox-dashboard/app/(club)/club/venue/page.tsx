import { redirect } from 'next/navigation';
import { getProfile, getStaffPermissions } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import ClubVenueForm from '@/components/club/ClubVenueForm';

export default async function VenuePage() {
  const profile = await getProfile();
  if (!profile?.club_id) {
    return <p className="text-slate-400">Club non configurato. Contatta l&apos;amministratore.</p>;
  }

  if (profile.role === 'club_staff') {
    const perms = await getStaffPermissions(profile.id, profile.club_id);
    if (!perms?.can_manage_tables) redirect('/club/dashboard');
  }

  const supabase = createAdminClient();
  const [{ data: club }, { data: clubTables }] = await Promise.all([
    supabase.from('clubs').select('id, floor_plan_url').eq('id', profile.club_id).single(),
    supabase.from('club_tables').select('*').eq('club_id', profile.club_id).order('created_at'),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Piantina & Tavoli</h1>
        <p className="text-slate-400 mt-1">
          Configura la piantina del locale e posiziona i tavoli. Questa configurazione si applica a tutti gli eventi.
        </p>
      </div>
      <ClubVenueForm
        clubId={profile.club_id}
        initialFloorPlanUrl={club?.floor_plan_url ?? null}
        initialTables={(clubTables ?? []).map((t: any) => ({
          tempId: t.id,
          label: t.label,
          capacity: t.capacity,
          deposit: t.default_deposit ?? 0,
          x: t.pos_x,
          y: t.pos_y,
        }))}
      />
    </div>
  );
}
