import { redirect } from 'next/navigation';
import { getProfile, getStaffPermissions } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import TicketScanner from '@/components/club/TicketScanner';
import { getT } from '@/lib/i18n-server';

export const dynamic = 'force-dynamic';

export default async function ScanPage() {
  const t = await getT();
  const profile = await getProfile();
  if (!profile?.club_id) return <p className="text-slate-400">{t.common.notConfigured}</p>;

  const isOwner = profile.role === 'club_admin';
  let canScan = isOwner;
  if (!isOwner) {
    const perms = await getStaffPermissions(profile.id, profile.club_id);
    canScan = perms?.can_scan_tickets ?? false;
  }
  if (!canScan) redirect('/club/dashboard');

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const yesterdayDate = new Date(now);
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterdayStr = yesterdayDate.toISOString().slice(0, 10);
  const currentTime = now.toTimeString().slice(0, 5);

  const admin = createAdminClient();
  const { data: allEvents } = await admin
    .from('events')
    .select('id, name, date, end_time')
    .eq('club_id', profile.club_id)
    .gte('date', yesterdayStr)
    .lte('date', todayStr)
    .eq('is_published', true)
    .order('date', { ascending: false })
    .order('name');

  // Evento di ieri: incluso se end_time > ora, oppure se end_time non è stato impostato
  // e siamo ancora prima di mezzogiorno (qualsiasi serata è certamente finita entro le 12:00)
  const events = (allEvents ?? [])
    .filter((ev) => {
      if (ev.date === todayStr) return true;
      if (ev.end_time != null) return ev.end_time > currentTime;
      return currentTime < '12:00';
    })
    .map(({ id, name }) => ({ id, name }));

  if (!events || events.length === 0) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-center">
        <p className="text-slate-300 font-semibold mb-1">{t.clubScan.noEventToday}</p>
        <p className="text-slate-500 text-sm">{t.clubScan.noEventDesc}</p>
      </div>
    );
  }

  return <TicketScanner events={events} defaultEventId={events[0].id} />;
}
