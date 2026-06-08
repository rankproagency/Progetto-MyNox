'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getProfile } from '@/lib/auth';
import { redirect } from 'next/navigation';

interface EventExtraPayload {
  clubExtraId: string;
  label: string;
  deposit: number;
  maxQuantity?: number;
}

export async function saveEventExtras(eventId: string, extras: EventExtraPayload[]) {
  const profile = await getProfile();
  if (!profile?.club_id || !['club_admin', 'admin'].includes(profile.role ?? '')) {
    redirect('/club/dashboard');
  }

  const admin = createAdminClient();

  await admin.from('event_extras').delete().eq('event_id', eventId);

  if (extras.length > 0) {
    const { error } = await admin.from('event_extras').insert(
      extras.map((e) => ({
        event_id: eventId,
        club_extra_id: e.clubExtraId,
        label: e.label,
        deposit: e.deposit,
        max_quantity: e.maxQuantity ?? 10,
        is_available: true,
      }))
    );
    if (error) return { error: error.message };
  }

  return { error: null };
}
