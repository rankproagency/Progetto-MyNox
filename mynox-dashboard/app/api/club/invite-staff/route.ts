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

  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: 'Email obbligatoria' }, { status: 400 });

  const admin = createAdminClient();

  const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: {
      role: 'club_staff',
      club_id: profile.club_id,
    },
    redirectTo: `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/auth/callback`,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await admin.from('profiles').upsert({
    id: data.user.id,
    role: 'club_staff',
    club_id: profile.club_id,
  }, { onConflict: 'id' });

  await admin.from('club_staff').upsert({
    user_id: data.user.id,
    club_id: profile.club_id,
    invited_by: user.id,
    can_manage_events: false,
    can_manage_tables: false,
    can_view_analytics: false,
    can_view_participants: false,
  }, { onConflict: 'user_id,club_id' });

  return NextResponse.json({ success: true });
}
