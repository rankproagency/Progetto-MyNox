import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import StaffManager from '@/components/club/StaffManager';
import type { ClubStaff } from '@/types';

export default async function StaffPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== 'club_admin') redirect('/club/dashboard');
  if (!profile.club_id) return <p className="text-slate-400">Club non configurato.</p>;

  const supabase = await createClient();

  const { data: staffRows } = await supabase
    .from('club_staff')
    .select('*')
    .eq('club_id', profile.club_id)
    .order('created_at', { ascending: true });

  const userIds = (staffRows ?? []).map((s) => s.user_id);

  const profilesMap: Record<string, { name: string; email: string }> = {};
  if (userIds.length > 0) {
    const admin = createAdminClient();
    const { data: profileRows } = await admin
      .from('profiles')
      .select('id, name, email')
      .in('id', userIds);
    for (const p of profileRows ?? []) {
      profilesMap[p.id] = { name: p.name, email: p.email };
    }
  }

  const staff: ClubStaff[] = (staffRows ?? []).map((s) => ({
    ...s,
    profiles: profilesMap[s.user_id] ?? undefined,
  }));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Gestione Staff</h1>
        <p className="text-slate-400 mt-1">Invita membri e gestisci i loro permessi.</p>
      </div>
      <StaffManager initialStaff={staff} />
    </div>
  );
}
