import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  // Verifica che chi chiama sia un admin autenticato
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 401 });
  }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });
  }

  const { email, clubId, clubName } = await req.json();
  if (!email || !clubId) {
    return NextResponse.json({ error: 'Email e clubId sono obbligatori' }, { status: 400 });
  }

  const admin = createAdminClient();

  // Invia invito — Supabase manda la mail "Invite User" con link per settare la password
  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      role: 'club_admin',
      club_id: clubId,
      club_name: clubName ?? '',
    },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/auth/callback`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // Crea subito il record in club_admins così quando il gestore accede è già collegato
  await admin.from('club_admins').upsert({
    user_id: data.user.id,
    club_id: clubId,
  }, { onConflict: 'user_id,club_id' });

  // Aggiorna il ruolo nel profilo (il trigger potrebbe non essersi ancora attivato)
  await admin.from('profiles').upsert({
    id: data.user.id,
    role: 'club_admin',
  }, { onConflict: 'id' });

  return NextResponse.json({ success: true });
}
