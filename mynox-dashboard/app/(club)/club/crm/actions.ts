'use server';

import { redirect } from 'next/navigation';
import { getProfile, getStaffPermissions } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function getAllCrmEmails(search: string, eventId: string): Promise<string[]> {
  const profile = await getProfile();
  if (!profile?.club_id) redirect('/club/dashboard');

  // I club_staff devono avere can_access_crm; i club_admin hanno sempre accesso
  if (profile.role !== 'club_admin' && profile.role !== 'admin') {
    const perms = await getStaffPermissions(profile.id, profile.club_id);
    if (!perms?.can_access_crm) redirect('/club/dashboard');
  }

  const admin = createAdminClient();

  const { data } = await admin.rpc('get_crm_contacts', {
    p_club_id:  profile.club_id,
    p_search:   search,
    p_event_id: eventId || null,
    p_limit:    10000,
    p_offset:   0,
  });

  return (data ?? []).map((r: any) => r.user_email as string);
}
