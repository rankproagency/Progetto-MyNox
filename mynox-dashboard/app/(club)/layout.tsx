import { redirect } from 'next/navigation';
import { getProfile, getStaffPermissions, FULL_PERMISSIONS } from '@/lib/auth';
import ClubSidebar from '@/components/layout/ClubSidebar';
import { createClient } from '@/lib/supabase/server';

export default async function ClubLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();

  if (!profile || (profile.role !== 'club_admin' && profile.role !== 'club_staff')) {
    redirect('/login');
  }

  const supabase = await createClient();
  const { data: club } = await supabase
    .from('clubs')
    .select('name')
    .eq('id', profile.club_id!)
    .single();

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
      <main className="ml-56 flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
