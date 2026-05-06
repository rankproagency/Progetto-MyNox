import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function getCallerClubId(): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('role, club_id')
    .eq('id', user.id)
    .single();

  if (!profile?.club_id) return null;
  if (profile.role === 'club_admin') return profile.club_id as string;

  if (profile.role === 'club_staff') {
    const { data: staffRecord } = await admin
      .from('club_staff')
      .select('can_scan_tickets')
      .eq('user_id', user.id)
      .eq('club_id', profile.club_id)
      .single();
    if (!staffRecord?.can_scan_tickets) return null;
    return profile.club_id as string;
  }

  return null;
}

// Stessa logica del bottone "Segna come usato" nell'app:
// apre a mezzanotte del giorno dell'evento, chiude a endTime (giorno dopo se < 12:00)
function eventCloseAt(eventDate: string, endTime: string | null): Date {
  if (endTime) {
    const [hh] = endTime.split(':').map(Number);
    const close = new Date(`${eventDate}T${endTime}:00`);
    if (hh < 12) close.setDate(close.getDate() + 1);
    return close;
  }
  const close = new Date(`${eventDate}T12:00:00`);
  close.setDate(close.getDate() + 1);
  return close;
}

function isWithinEventWindow(eventDate: string, endTime: string | null): boolean {
  const now = new Date();
  const openAt = new Date(`${eventDate}T00:00:00`);
  const closeAt = eventCloseAt(eventDate, endTime);
  return now >= openAt && now <= closeAt;
}

export async function POST(req: NextRequest) {
  const clubId = await getCallerClubId();
  if (!clubId) return NextResponse.json({ ok: false, reason: 'unauthorized' }, { status: 403 });

  const { code } = await req.json();
  if (!code) return NextResponse.json({ ok: false, reason: 'invalid' }, { status: 400 });

  const admin = createAdminClient();
  const trimmedCode = (code as string).trim();
  const isQrCode = trimmedCode.startsWith('MYNOX-TICKET-');
  const field = isQrCode ? 'qr_code' : 'entry_code';

  const { data: ticket } = await admin
    .from('tickets')
    .select('id, status, created_at, user_id, ticket_type_id, event_id')
    .eq(field, trimmedCode)
    .maybeSingle();

  if (!ticket) return NextResponse.json({ ok: false, reason: 'invalid' });

  if (ticket.event_id) {
    const { data: event } = await admin
      .from('events')
      .select('id, date, end_time')
      .eq('id', ticket.event_id)
      .eq('club_id', clubId)
      .single();

    if (!event) return NextResponse.json({ ok: false, reason: 'invalid' });

    if (!isWithinEventWindow(event.date, event.end_time)) {
      const closeAt = eventCloseAt(event.date, event.end_time);
      return NextResponse.json({
        ok: false,
        reason: new Date() > closeAt ? 'event_ended' : 'not_yet',
        eventDate: event.date,
      });
    }
  }

  if (ticket.status === 'used') {
    return NextResponse.json({
      ok: false,
      reason: 'already_used',
      usedAt: new Date(ticket.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' }),
    });
  }

  if (ticket.status !== 'valid') return NextResponse.json({ ok: false, reason: 'invalid' });

  await admin.from('tickets').update({ status: 'used' }).eq('id', ticket.id);

  const [{ data: profile }, { data: ticketType }] = await Promise.all([
    admin.from('profiles').select('name').eq('id', ticket.user_id).single(),
    ticket.ticket_type_id
      ? admin.from('ticket_types').select('label').eq('id', ticket.ticket_type_id).single()
      : Promise.resolve({ data: null }),
  ]);

  return NextResponse.json({
    ok: true,
    name: profile?.name ?? 'Cliente',
    ticketType: ticketType?.label ?? 'Biglietto',
  });
}
