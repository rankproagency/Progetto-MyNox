import { getProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import EventForm from '@/components/club/EventForm';

export default async function NewEventPage() {
  const profile = await getProfile();
  if (!profile?.club_id) {
    return <p className="text-slate-400">Club non configurato. Contatta l&apos;amministratore.</p>;
  }

  const supabase = await createClient();
  const [{ data: club }, { data: clubTables }] = await Promise.all([
    supabase.from('clubs').select('floor_plan_url').eq('id', profile.club_id).single(),
    supabase.from('club_tables').select('*').eq('club_id', profile.club_id).order('created_at'),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Nuovo evento</h1>
        <p className="text-slate-400 mt-1">Compila i dettagli per creare un nuovo evento.</p>
      </div>
      <EventForm
        clubId={profile.club_id}
        clubFloorPlanUrl={club?.floor_plan_url}
        clubTables={(clubTables ?? []).map((t: any) => ({
          id: t.id,
          label: t.label,
          capacity: t.capacity,
          posX: t.pos_x,
          posY: t.pos_y,
          defaultDeposit: t.default_deposit ?? 0,
        }))}
      />
    </div>
  );
}
