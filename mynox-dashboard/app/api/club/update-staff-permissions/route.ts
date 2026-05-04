import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_KEYS = ['can_manage_events', 'can_manage_tables', 'can_view_analytics', 'can_view_participants'] as const;
type AllowedKey = typeof ALLOWED_KEYS[number];

async function getClubAdminProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, club_id')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'club_admin' || !profile.club_id) return null;
  return { supabase, clubId: profile.club_id as string };
}

export async function PATCH(req: NextRequest) {
  const ctx = await getClubAdminProfile();
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });

  const { staffId, key, value } = await req.json();
  if (!staffId || !ALLOWED_KEYS.includes(key as AllowedKey) || typeof value !== 'boolean') {
    return NextResponse.json({ error: 'Parametri non validi' }, { status: 400 });
  }

  const { error } = await ctx.supabase
    .from('club_staff')
    .update({ [key]: value })
    .eq('id', staffId)
    .eq('club_id', ctx.clubId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const ctx = await getClubAdminProfile();
  if (!ctx) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });

  const { staffId } = await req.json();
  if (!staffId) return NextResponse.json({ error: 'staffId obbligatorio' }, { status: 400 });

  const { error } = await ctx.supabase
    .from('club_staff')
    .delete()
    .eq('id', staffId)
    .eq('club_id', ctx.clubId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
