import { redirect } from 'next/navigation';
import { getProfile, getStaffPermissions } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import PromoManager from '@/components/club/PromoManager';

export default async function PromoPage() {
  const profile = await getProfile();
  if (!profile || !profile.club_id) redirect('/club/dashboard');

  const isOwner = profile.role === 'club_admin';
  if (!isOwner) {
    const perms = await getStaffPermissions(profile.id, profile.club_id);
    if (!perms?.can_manage_promos) redirect('/club/dashboard');
  }

  const supabase = await createClient();

  const [{ data: promoCodes }, { data: events }] = await Promise.all([
    supabase
      .from('promo_codes')
      .select('*')
      .eq('club_id', profile.club_id)
      .order('created_at', { ascending: false }),
    supabase
      .from('events')
      .select('id, name, date')
      .eq('club_id', profile.club_id)
      .gte('date', new Date().toISOString().split('T')[0])
      .order('date', { ascending: true }),
  ]);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Codici Promo</h1>
        <p className="text-slate-400 mt-1">Crea e gestisci i codici sconto per i tuoi eventi.</p>
      </div>
      <PromoManager
        initialCodes={promoCodes ?? []}
        events={events ?? []}
        clubId={profile.club_id}
      />
    </div>
  );
}
