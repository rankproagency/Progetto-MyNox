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

  const today = new Date().toISOString().slice(0, 10);
  const admin = createAdminClient();
  const { data: events } = await admin
    .from('events')
    .select('id, name')
    .eq('club_id', profile.club_id)
    .eq('date', today)
    .eq('is_published', true)
    .order('name');

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
