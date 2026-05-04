import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, club_id')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'club_admin' || !profile.club_id) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  const { email, permissions } = await req.json();
  if (!email) return NextResponse.json({ error: 'Email obbligatoria' }, { status: 400 });

  const admin = createAdminClient();

  // Cerca se l'utente esiste già
  const { data: existingUsers } = await admin.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find((u) => u.email === email);

  let targetUserId: string;

  if (existingUser) {
    // Utente già registrato — collegalo direttamente senza invito
    targetUserId = existingUser.id;
  } else {
    // Utente nuovo — invia invito via email
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        role: 'club_staff',
        club_id: profile.club_id,
      },
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/auth/callback`,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    targetUserId = data.user.id;
  }

  // Aggiorna solo se ha ruolo 'customer' o 'club_staff' (non toccare club_admin)
  await admin.from('profiles')
    .update({ role: 'club_staff', club_id: profile.club_id })
    .eq('id', targetUserId)
    .in('role', ['customer', 'club_staff']);

  await admin.from('club_staff').upsert({
    user_id: targetUserId,
    club_id: profile.club_id,
    invited_by: user.id,
    can_manage_events: permissions?.can_manage_events ?? false,
    can_manage_tables: permissions?.can_manage_tables ?? false,
    can_view_analytics: permissions?.can_view_analytics ?? false,
    can_view_participants: permissions?.can_view_participants ?? false,
  }, { onConflict: 'user_id,club_id' });

  return NextResponse.json({ success: true });
}
