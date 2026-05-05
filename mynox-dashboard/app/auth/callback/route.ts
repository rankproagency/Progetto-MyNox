import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getRoleRedirect } from '@/lib/auth';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();
        if (profile?.role) {
          return NextResponse.redirect(`${origin}${getRoleRedirect(profile.role)}`);
        }
      }
      return NextResponse.redirect(`${origin}/login`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
