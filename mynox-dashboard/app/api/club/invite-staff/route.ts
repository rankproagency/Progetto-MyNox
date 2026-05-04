import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

async function sendStaffNotificationEmail(email: string, clubName: string, loginUrl: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return; // skip se non configurato

  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'MyNox <onboarding@resend.dev>',
      to: email,
      subject: `Sei stato aggiunto allo staff di ${clubName}`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#07080f;color:#f8fafc;border-radius:16px;">
          <h2 style="color:#a855f7;margin-top:0;">MyNox Staff</h2>
          <p>Sei stato aggiunto come membro dello staff di <strong>${clubName}</strong>.</p>
          <p>Accedi alla dashboard per gestire eventi, tavoli e altro.</p>
          <a href="${loginUrl}" style="display:inline-block;margin-top:16px;padding:12px 24px;background:#a855f7;color:#fff;border-radius:10px;text-decoration:none;font-weight:600;">
            Accedi alla dashboard
          </a>
          <p style="margin-top:24px;font-size:12px;color:#64748b;">
            Se non conosci MyNox o pensi di aver ricevuto questa email per errore, ignorala.
          </p>
        </div>
      `,
    }),
  });
}

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

  // Recupera il nome del club per l'email
  const { data: club } = await admin.from('clubs').select('name').eq('id', profile.club_id).single();
  const clubName = club?.name ?? 'il club';

  // Cerca se l'utente esiste già
  const { data: existingUsers } = await admin.auth.admin.listUsers();
  const existingUser = existingUsers?.users?.find((u) => u.email === email);

  let targetUserId: string;

  if (existingUser) {
    // Utente già registrato — collegalo e invia email di notifica
    targetUserId = existingUser.id;

    // Genera un magic link per l'accesso diretto alla dashboard
    const { data: linkData } = await admin.auth.admin.generateLink({
      type: 'magiclink',
      email,
      options: { redirectTo: `${APP_URL}/club/dashboard` },
    });
    const loginUrl = linkData?.properties?.action_link ?? `${APP_URL}/login`;

    await sendStaffNotificationEmail(email, clubName, loginUrl);
  } else {
    // Utente nuovo — invia invito via email (Supabase gestisce l'email di onboarding)
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: {
        role: 'club_staff',
        club_id: profile.club_id,
      },
      redirectTo: `${APP_URL}/auth/callback`,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    targetUserId = data.user.id;
  }

  // Aggiorna il profilo (funziona per utenti esistenti; per i nuovi viene fatto nel callback)
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
