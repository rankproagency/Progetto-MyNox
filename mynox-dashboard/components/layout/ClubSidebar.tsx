'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import {
  Home,
  CalendarDays,
  BarChart3,
  Map,
  LogOut,
  Settings,
  Users,
  ScanLine,
} from 'lucide-react';
import type { StaffPermissions } from '@/types';

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  ownerOnly?: boolean;
  staffOnly?: boolean;
  permission?: keyof StaffPermissions;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/club/dashboard', label: 'Home', icon: Home },
  { href: '/club/events', label: 'I miei eventi', icon: CalendarDays, permission: 'can_manage_events' },
  { href: '/club/venue', label: 'Piantina & Tavoli', icon: Map, permission: 'can_manage_tables' },
  { href: '/club/analytics', label: 'Analytics', icon: BarChart3, permission: 'can_view_analytics' },
  { href: '/club/scan', label: 'Scanner', icon: ScanLine, permission: 'can_scan_tickets', staffOnly: true },
  { href: '/club/staff', label: 'Staff', icon: Users, ownerOnly: true },
  { href: '/club/settings', label: 'Profilo club', icon: Settings, ownerOnly: true },
];

interface ClubSidebarProps {
  clubName: string;
  isOwner: boolean;
  permissions: StaffPermissions;
}

export default function ClubSidebar({ clubName, isOwner, permissions }: ClubSidebarProps) {
  const pathname = usePathname();

  const visibleItems = NAV_ITEMS.filter((item) => {
    if (item.ownerOnly && !isOwner) return false;
    if (item.staffOnly && isOwner) return false;
    if (item.permission && !isOwner && !permissions[item.permission]) return false;
    return true;
  });

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
        {visibleItems.map(({ href, label, icon: Icon }) => {
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
