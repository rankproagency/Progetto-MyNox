import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

const ALLOWED_KEYS = ['can_manage_events', 'can_manage_tables', 'can_view_analytics', 'can_view_participants', 'can_scan_tickets', 'can_manage_promos'] as const;
type AllowedKey = typeof ALLOWED_KEYS[number];

async function getClubId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, club_id')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'club_admin' || !profile.club_id) return null;
  return profile.club_id as string;
}

export async function PATCH(req: NextRequest) {
  const clubId = await getClubId();
  if (!clubId) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });

  const body = await req.json();
  const { staffId } = body;
  if (!staffId) return NextResponse.json({ error: 'staffId obbligatorio' }, { status: 400 });

  const admin = createAdminClient();

  // Bulk update (preset applicato su membro esistente)
  if (body.bulk) {
    const bulk = body.bulk as Record<string, boolean>;
    const update: Record<string, boolean> = {};
    for (const key of ALLOWED_KEYS) {
      if (typeof bulk[key] === 'boolean') update[key] = bulk[key];
    }
    const { error, count } = await admin
      .from('club_staff')
      .update(update)
      .eq('id', staffId)
      .eq('club_id', clubId)
      .select();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (count === 0) return NextResponse.json({ error: 'Membro non trovato' }, { status: 404 });
    return NextResponse.json({ success: true });
  }

  // Singolo toggle
  const { key, value } = body;
  if (!ALLOWED_KEYS.includes(key as AllowedKey) || typeof value !== 'boolean') {
    return NextResponse.json({ error: 'Parametri non validi' }, { status: 400 });
  }
  const { error, data } = await admin
    .from('club_staff')
    .update({ [key]: value })
    .eq('id', staffId)
    .eq('club_id', clubId)
    .select();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  if (!data || data.length === 0) return NextResponse.json({ error: 'Membro non trovato' }, { status: 404 });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const clubId = await getClubId();
  if (!clubId) return NextResponse.json({ error: 'Non autorizzato' }, { status: 403 });

  const { staffId } = await req.json();
  if (!staffId) return NextResponse.json({ error: 'staffId obbligatorio' }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin
    .from('club_staff')
    .delete()
    .eq('id', staffId)
    .eq('club_id', clubId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
