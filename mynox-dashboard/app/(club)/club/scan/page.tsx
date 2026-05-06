import { redirect } from 'next/navigation';
import { getProfile, getStaffPermissions } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import TicketScanner from '@/components/club/TicketScanner';

export const dynamic = 'force-dynamic';

export default async function ScanPage() {
  const profile = await getProfile();
  if (!profile?.club_id) return <p className="text-slate-400">Club non configurato.</p>;

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
        <p className="text-slate-300 font-semibold mb-1">Nessuna serata in programma oggi</p>
        <p className="text-slate-500 text-sm">
          Pubblica un evento con la data di oggi per abilitare lo scanner.
        </p>
      </div>
    );
  }

  return (
    <div className="-m-8 h-screen">
      <TicketScanner events={events} defaultEventId={events[0].id} />
    </div>
  );
}
