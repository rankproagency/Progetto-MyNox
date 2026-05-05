import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import StaffManager from '@/components/club/StaffManager';
import type { ClubStaff } from '@/types';

export default async function StaffPage() {
  const profile = await getProfile();
  if (!profile || profile.role !== 'club_admin') redirect('/club/dashboard');
  if (!profile.club_id) return <p className="text-slate-400">Club non configurato.</p>;

  const admin = createAdminClient();
  const { data: staffRows } = await admin
    .from('club_staff')
    .select('*')
    .eq('club_id', profile.club_id)
    .order('created_at', { ascending: true });

  const userIds = (staffRows ?? []).map((s: any) => s.user_id);
  const { data: profileRows } = userIds.length
    ? await admin.from('profiles').select('id, name, email').in('id', userIds)
    : { data: [] };

  const profileMap = Object.fromEntries((profileRows ?? []).map((p: any) => [p.id, p]));
  const staff = (staffRows ?? []).map((s: any) => ({
    ...s,
    profiles: profileMap[s.user_id] ?? null,
  })) as ClubStaff[];

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
