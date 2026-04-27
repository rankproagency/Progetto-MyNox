'use server';

import { createAdminClient } from '@/lib/supabase/admin';

export async function createClubWithManager(data: {
  club: {
    name: string;
    city: string | null;
    address: string | null;
    instagram: string | null;
    tiktok: string | null;
    email: string | null;
    phone: string | null;
  };
  manager: {
    email: string;
  };
  dashboardUrl: string;
}): Promise<{ id: string; existingUser: boolean } | { error: string }> {
  const supabase = createAdminClient();

  // 1. Crea il club
  const { data: club, error: clubError } = await supabase
    .from('clubs')
    .insert({ ...data.club, image_url: null, is_active: false })
    .select('id')
    .single();

  if (clubError || !club) return { error: clubError?.message ?? 'Errore nella creazione del club.' };

  // 2. Cerca se l'utente esiste già in Supabase Auth
  const { data: usersData } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const existingUser = (usersData?.users ?? []).find((u) => u.email === data.manager.email);

  let userId: string;

  if (existingUser) {
    // Utente già registrato (es. cliente dell'app) — aggiorna il profilo
    // e manda email di reset così può impostare la password per la dashboard
    userId = existingUser.id;
    await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/recover`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
      body: JSON.stringify({
        email: data.manager.email,
        redirect_to: `${data.dashboardUrl}/auth/reset-password`,
      }),
    });
  } else {
    // Utente nuovo — invia email di invito con link one-time
    const { data: authData, error: authError } = await supabase.auth.admin.inviteUserByEmail(
      data.manager.email,
      {
        redirectTo: `${data.dashboardUrl}/auth/callback?next=/auth/reset-password`,
        data: { club_id: club.id, role: 'club_admin' },
      }
    );

    if (authError || !authData.user) {
      await supabase.from('clubs').delete().eq('id', club.id);
      return { error: authError?.message ?? 'Errore nell\'invio dell\'invito.' };
    }

    userId = authData.user.id;
  }

  // 3. Assegna ruolo club_admin e collega il club al profilo
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ role: 'club_admin', club_id: club.id })
    .eq('id', userId);

  if (profileError) return { error: profileError.message };

  return { id: club.id, existingUser: !!existingUser };
}

export async function updateClubImageUrl(clubId: string, imageUrl: string): Promise<{ error?: string }> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from('clubs')
    .update({ image_url: imageUrl })
    .eq('id', clubId);

  if (error) return { error: error.message };
  return {};
}
