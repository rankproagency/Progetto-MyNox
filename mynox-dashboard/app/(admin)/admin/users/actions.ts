'use server';

import { createAdminClient } from '@/lib/supabase/admin';

export async function updateUserRole(
  userId: string,
  role: string,
  clubId: string | null
): Promise<{ error?: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('profiles')
    .update({ role, club_id: clubId || null })
    .eq('id', userId);

  if (error) return { error: error.message };
  return {};
}

export async function createClubAdminAccount(
  email: string,
  password: string,
  clubId: string
): Promise<{ error?: string }> {
  const supabase = createAdminClient();

  // 1. Crea l'utente in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    return { error: authError?.message ?? 'Errore nella creazione dell\'account.' };
  }

  // 2. Aggiorna il profilo con ruolo club_admin e club_id
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role: 'club_admin', club_id: clubId })
    .eq('id', authData.user.id);

  if (profileError) return { error: profileError.message };
  return {};
}
