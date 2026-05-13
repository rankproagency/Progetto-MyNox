import { redirect } from 'next/navigation';
import { getProfile, getRoleRedirect } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export default async function Home() {
  const profile = await getProfile();

  if (profile && ['admin', 'club_admin', 'club_staff'].includes(profile.role)) {
    redirect(getRoleRedirect(profile.role));
  }

  if (profile) {
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect('/login?error=unauthorized');
  }

  redirect('/login');
}
