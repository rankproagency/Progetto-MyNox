import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import ClubSidebar from '@/components/layout/ClubSidebar';
import { createClient } from '@/lib/supabase/server';

export default async function ClubLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();

  if (!profile || profile.role !== 'club_admin') {
    redirect('/login');
  }

  const supabase = await createClient();
  const { data: club } = await supabase
    .from('clubs')
    .select('name')
    .eq('id', profile.club_id!)
    .single();

  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      <ClubSidebar clubName={club?.name ?? 'La tua discoteca'} />
      <main className="ml-56 flex-1 p-8 relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_80%_40%_at_50%_0%,rgba(168,85,247,0.10),transparent)] z-0" />
        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
