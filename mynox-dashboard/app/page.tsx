import { redirect } from 'next/navigation';
import { getProfile, getRoleRedirect } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import type { Role } from '@/types';

export default async function Home() {
  const profile = await getProfile();

  if (profile && ['admin', 'club_admin', 'club_staff'].includes(profile.role)) {
    redirect(getRoleRedirect(profile.role as Role));
  }

  // Un customer può anche essere staff di un club: controlla la tabella club_staff
  if (profile && profile.role === 'customer') {
    const supabase = await createClient();
    const { data: staffRecord } = await supabase
      .from('club_staff')
      .select('club_id')
      .eq('user_id', profile.id)
      .single();

    if (staffRecord) redirect('/club/dashboard');
  }

  if (profile) {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/login?error=unauthorized');
  }

  redirect('/login');
}
