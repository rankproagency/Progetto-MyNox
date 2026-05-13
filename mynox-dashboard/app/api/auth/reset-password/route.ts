import { createAdminClient } from '@/lib/supabase/admin';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
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
    return NextResponse.json(
      { error: 'Nessun account associato a questa email.' },
      { status: 404 }
    );
  }

  // Email valida: invia il link di reset tramite Supabase Auth
  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
    redirectTo: redirectTo ?? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/reset-password`,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
