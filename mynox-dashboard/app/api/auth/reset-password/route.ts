import { createAdminClient } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { email, redirectTo } = await req.json();

  if (!email) {
    return NextResponse.json({ error: 'Email richiesta.' }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const admin = createAdminClient();

  // Verifica che l'email sia collegata a un account reale (bypassa RLS)
  const { data: profile } = await admin
    .from('profiles')
    .select('id')
    .eq('email', normalizedEmail)
    .maybeSingle();

  if (!profile) {
    // Risposta identica a quella di successo — evita user enumeration
    return NextResponse.json({ ok: true });
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const safeRedirectTo =
    redirectTo && siteUrl && (redirectTo as string).startsWith(siteUrl)
      ? (redirectTo as string)
      : `${siteUrl}/auth/reset-password`;

  const { error } = await admin.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: safeRedirectTo,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
