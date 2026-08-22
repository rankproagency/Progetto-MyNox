'use server';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

async function requireAdmin(): Promise<{ error: string } | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Non autenticato.' };
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
  if (profile?.role !== 'admin') return { error: 'Accesso negato.' };
  return null;
}

export async function deleteClub(clubId: string): Promise<{ error?: string }> {
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = createAdminClient();

  // 1. Recupera gli event_id del club
  const { data: events, error: eventsError } = await supabase
    .from('events')
    .select('id')
    .eq('club_id', clubId);

  if (eventsError) return { error: eventsError.message };

  const eventIds = (events ?? []).map((e) => e.id);

  // 2. Elimina i biglietti legati agli eventi (FK senza CASCADE)
  if (eventIds.length > 0) {
    const { error: ticketsError } = await supabase
      .from('tickets')
      .delete()
      .in('event_id', eventIds);
    if (ticketsError) return { error: ticketsError.message };
  }

  // 3. Scollega i profili (FK senza CASCADE)
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ club_id: null, role: 'customer' })
    .eq('club_id', clubId);

  if (profileError) return { error: profileError.message };

  // 4. Elimina il club (CASCADE su events, club_tables)
  const { error } = await supabase.from('clubs').delete().eq('id', clubId);
  if (error) return { error: error.message };
  return {};
}

export async function toggleClubActive(clubId: string, isActive: boolean): Promise<{ error?: string }> {
  const authError = await requireAdmin();
  if (authError) return authError;

  const supabase = createAdminClient();
  const { error } = await supabase.from('clubs').update({ is_active: !isActive }).eq('id', clubId);
  if (error) return { error: error.message };
  return {};
}
