'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  LayoutDashboard,
  CalendarDays,
  BarChart3,
  LogOut,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/club/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/club/events', label: 'I miei eventi', icon: CalendarDays },
  { href: '/club/analytics', label: 'Analytics', icon: BarChart3 },
];

// URL prefix that the (club) layout applies to
// Routes: /club/dashboard, /club/events, /club/analytics

interface ClubSidebarProps {
  clubName: string;
}

export default function ClubSidebar({ clubName }: ClubSidebarProps) {
  const pathname = usePathname();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-[#111118] border-r border-white/8 flex flex-col z-40">
      {/* Logo + nome club */}
      <div className="px-6 py-5 border-b border-white/8">
        <Image src="/logo.png" alt="MyNox" width={100} height={36} className="object-contain" />
        <div className="text-xs text-slate-400 mt-1 font-medium truncate">{clubName}</div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t border-white/8">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-400/5 w-full transition-colors"
        >
          <LogOut size={16} />
          Esci
        </button>
      </div>
    </aside>
  );
}
