'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { getProfile } from '@/lib/auth';
import { redirect } from 'next/navigation';

interface EventExtraPayload {
  clubExtraId: string;
  label: string;
  deposit: number;
  totalStock: number | null; // null = illimitato
}

export async function saveEventExtras(eventId: string, extras: EventExtraPayload[]) {
  const profile = await getProfile();
  if (!profile?.club_id || !['club_admin', 'admin'].includes(profile.role ?? '')) {
    redirect('/club/dashboard');
  }

  const admin = createAdminClient();

  // Verifica che l'evento appartenga al club dell'utente (admin bypassa)
  if (profile.role !== 'admin') {
    const { data: ev } = await admin.from('events').select('club_id').eq('id', eventId).single();
    if (!ev || ev.club_id !== profile.club_id) redirect('/club/dashboard');
  }

  // Legge i valori esistenti per preservare lo stock già venduto
  const { data: existing } = await admin
    .from('event_extras')
    .select('club_extra_id, total_stock, available_stock')
    .eq('event_id', eventId);

  await admin.from('event_extras').delete().eq('event_id', eventId);

  if (extras.length > 0) {
    const { error } = await admin.from('event_extras').insert(
      extras.map((e) => {
        const prev = existing?.find((x: any) => x.club_extra_id === e.clubExtraId);
        // unità già vendute = total_stock precedente - available_stock precedente
        const alreadySold =
          prev && prev.total_stock !== null && prev.available_stock !== null
            ? prev.total_stock - prev.available_stock
            : 0;
        const availableStock =
          e.totalStock !== null ? Math.max(0, e.totalStock - alreadySold) : null;

        return {
          event_id: eventId,
          club_extra_id: e.clubExtraId,
          label: e.label,
          deposit: e.deposit,
          total_stock: e.totalStock,
          available_stock: availableStock,
          is_available: true,
        };
      })
    );
    if (error) return { error: error.message };
  }

  return { error: null };
}
