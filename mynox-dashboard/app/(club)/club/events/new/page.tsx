import { redirect } from 'next/navigation';
import { getProfile, getStaffPermissions } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import EventForm from '@/components/club/EventForm';
import { getT } from '@/lib/i18n-server';

export default async function NewEventPage() {
  const t = await getT();
  const profile = await getProfile();
  if (!profile?.club_id) {
    return <p className="text-slate-400">{t.common.notConfigured}</p>;
  }

  if (profile.role === 'club_staff') {
    const perms = await getStaffPermissions(profile.id, profile.club_id);
    if (!perms?.can_manage_events) redirect('/club/dashboard');
  }

  const supabase = await createClient();
  const [{ data: club }, { data: clubTables }, { data: clubExtras }] = await Promise.all([
    supabase.from('clubs').select('floor_plan_url').eq('id', profile.club_id).single(),
    supabase.from('club_tables').select('*').eq('club_id', profile.club_id).order('created_at'),
    supabase.from('club_extras').select('id, name, description, deposit').eq('club_id', profile.club_id).eq('is_available', true).order('created_at'),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">{t.clubEvents.newTitle}</h1>
        <p className="text-slate-400 mt-1">{t.clubEvents.newSubtitle}</p>
      </div>
      <EventForm
        clubId={profile.club_id}
        clubFloorPlanUrl={club?.floor_plan_url}
        clubTables={(clubTables ?? []).map((t: any) => ({
          id: t.id, label: t.label, capacity: t.capacity,
          posX: t.pos_x, posY: t.pos_y, defaultDeposit: t.default_deposit ?? 0,
          zoneLabel: t.zone_label ?? '',
          zoneColor: t.zone_color ?? '#a855f7',
          minimumSpend: t.minimum_spend != null ? String(t.minimum_spend) : '',
          showMinimumSpend: t.minimum_spend != null,
        }))}
        clubExtras={(clubExtras ?? []).map((e: any) => ({
          id: e.id, name: e.name, description: e.description, deposit: e.deposit,
        }))}
      />
    </div>
  );
}
