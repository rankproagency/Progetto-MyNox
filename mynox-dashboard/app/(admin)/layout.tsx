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
      <main className="ml-56 flex-1 p-8">
        {children}
      </main>
    </div>
  );
}
