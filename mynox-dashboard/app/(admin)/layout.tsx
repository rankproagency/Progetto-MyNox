import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import AdminSidebar from '@/components/layout/AdminSidebar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await getProfile();

  if (!profile || profile.role !== 'admin') {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen bg-[#0a0a0f]">
      <AdminSidebar />
      <main className="md:ml-56 flex-1 p-4 pt-16 md:p-8 relative">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 bg-[radial-gradient(ellipse_80%_40%_at_50%_0%,rgba(168,85,247,0.10),transparent)] z-0" />
        <div className="relative z-10">
          {children}
        </div>
      </main>
    </div>
  );
}
