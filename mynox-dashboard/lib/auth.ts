import { createClient } from '@/lib/supabase/server';
import type { Profile, Role } from '@/types';

export async function getProfile(): Promise<Profile | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  return data as Profile | null;
}

export function getRoleRedirect(role: Role): string {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'club_admin') return '/club/dashboard';
  return '/login?error=unauthorized';
}
