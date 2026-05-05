import { redirect } from 'next/navigation';
import { getProfile, getStaffPermissions, FULL_PERMISSIONS } from '@/lib/auth';
import ClubSidebar from '@/components/layout/ClubSidebar';
import RealtimeRefresher from '@/components/RealtimeRefresher';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export default async function ClubLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();

  if (!profile || (profile.role !== 'club_admin' && profile.role !== 'club_staff')) {
    redirect('/login');
  }

  const supabase = await createClient();
  const { data: club } = await supabase
    .from('clubs')
    .select('name, is_active')
    .eq('id', profile.club_id!)
    .single();

  // Attiva il club al primo accesso del gestore alla dashboard
  if (club && club.is_active === false && profile.role === 'club_admin') {
    const adminSupabase = createAdminClient();
    await adminSupabase
      .from('clubs')
      .update({ is_active: true })
      .eq('id', profile.club_id!);
  }

  const isOwner = profile.role === 'club_admin';
  const permissions = isOwner
    ? FULL_PERMISSIONS
    : await getStaffPermissions(profile.id, profile.club_id!) ?? {
        can_manage_events: false,
        can_manage_tables: false,
        can_view_analytics: false,
        can_view_participants: false,
        can_scan_tickets: false,
      };

  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      <ClubSidebar
        clubName={club?.name ?? 'La tua discoteca'}
        isOwner={isOwner}
        permissions={permissions}
      />
      <RealtimeRefresher
        clubId={profile.club_id!}
        tables={['events', 'club_staff', 'tickets', 'tables']}
      />
      <main className="ml-56 flex-1 p-8 relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_80%_40%_at_50%_0%,rgba(168,85,247,0.10),transparent)] z-0" />
        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
