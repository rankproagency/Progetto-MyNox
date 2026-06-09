'use server';

import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export async function getAllCrmEmails(search: string, eventId: string): Promise<string[]> {
  const profile = await getProfile();
  if (!profile?.club_id) redirect('/club/dashboard');

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
