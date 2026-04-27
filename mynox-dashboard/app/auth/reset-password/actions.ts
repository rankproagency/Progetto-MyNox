'use server';

import { createAdminClient } from '@/lib/supabase/admin';

export async function activateClub(clubId: string): Promise<void> {
  const supabase = createAdminClient();
  await supabase.from('clubs').update({ is_active: true }).eq('id', clubId);
}
