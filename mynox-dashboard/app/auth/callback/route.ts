import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      const meta = data.session.user.user_metadata as Record<string, string> | undefined;

      if (meta?.role === 'club_staff' && meta?.club_id) {
        const admin = createAdminClient();
        await admin.from('profiles')
          .update({ role: 'club_staff', club_id: meta.club_id })
          .eq('id', data.session.user.id);

        // Utente invitato — deve impostare la password prima di accedere
        return NextResponse.redirect(`${origin}/auth/reset-password`);
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
