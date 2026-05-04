import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import type { Profile, Role, StaffPermissions } from '@/types';

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

export async function getStaffPermissions(userId: string, clubId: string): Promise<StaffPermissions | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from('club_staff')
    .select('can_manage_events, can_manage_tables, can_view_analytics, can_view_participants')
    .eq('user_id', userId)
    .eq('club_id', clubId)
    .single();

  return data as StaffPermissions | null;
}

export const FULL_PERMISSIONS: StaffPermissions = {
  can_manage_events: true,
  can_manage_tables: true,
  can_view_analytics: true,
  can_view_participants: true,
};

export function getRoleRedirect(role: Role): string {
  if (role === 'admin') return '/admin/dashboard';
  if (role === 'club_admin') return '/club/dashboard';
  if (role === 'club_staff') return '/club/dashboard';
  return '/login?error=unauthorized';
}
