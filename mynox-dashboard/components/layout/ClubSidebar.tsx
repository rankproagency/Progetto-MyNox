'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { useLanguage } from '@/components/providers/I18nProvider';
import { createClient } from '@/lib/supabase/client';
import { useState } from 'react';
import {
  Home,
  CalendarDays,
  BarChart3,
  Map,
  LogOut,
  Settings,
  Users,
  ScanLine,
  Tag,
  BookUser,
  Menu,
  X,
  Globe,
  Sparkles,
} from 'lucide-react';
import type { StaffPermissions } from '@/types';
import type { LangCode } from '@/lib/i18n';

interface NavItem {
  href: string;
  labelKey: keyof ReturnType<typeof useLanguage>['t']['nav'];
  icon: React.ElementType;
  ownerOnly?: boolean;
  staffOnly?: boolean;
  permission?: keyof StaffPermissions;
}

const NAV_ITEMS: NavItem[] = [
  { href: '/club/dashboard', labelKey: 'home', icon: Home },
  { href: '/club/events', labelKey: 'myEvents', icon: CalendarDays, permission: 'can_manage_events' },
  { href: '/club/venue', labelKey: 'venue', icon: Map, permission: 'can_manage_tables' },
  { href: '/club/analytics', labelKey: 'analytics', icon: BarChart3, permission: 'can_view_analytics' },
  { href: '/club/scan', labelKey: 'scanner', icon: ScanLine, permission: 'can_scan_tickets', staffOnly: true },
  { href: '/club/extras', labelKey: 'extras', icon: Sparkles, permission: 'can_manage_extras' },
  { href: '/club/promo', labelKey: 'promo', icon: Tag, permission: 'can_manage_promos' },
  { href: '/club/crm', labelKey: 'crm', icon: BookUser, permission: 'can_access_crm' },
  { href: '/club/staff', labelKey: 'staff', icon: Users, ownerOnly: true },
  { href: '/club/settings', labelKey: 'settings', icon: Settings, ownerOnly: true },
];

const LANGS: { code: LangCode; label: string }[] = [
  { code: 'it', label: 'IT' },
  { code: 'en', label: 'EN' },
];

interface ClubSidebarProps {
  clubName: string;
  isOwner: boolean;
  permissions: StaffPermissions;
}

export default function ClubSidebar({ clubName, isOwner, permissions }: ClubSidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { lang, t, setLang } = useLanguage();

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
    <>
      {/* Hamburger button — solo mobile */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-[#111118] border border-white/8 text-slate-400"
      >
        <Menu size={20} />
      </button>

      {/* Overlay — solo mobile */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed left-0 top-0 h-full w-56 bg-[#111118] border-r border-white/8 flex flex-col z-50 transition-transform duration-300
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>

        {/* Logo + nome club */}
        <div className="px-6 py-5 border-b border-white/8 flex items-center justify-between">
          <div>
            <Image src="/logo.png" alt="MyNox" width={100} height={36} className="object-contain" />
            <div className="text-xs text-slate-400 mt-1 font-medium truncate max-w-[120px]">{clubName}</div>
          </div>
          <button onClick={() => setMobileOpen(false)} className="md:hidden text-slate-500 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {visibleItems.map(({ href, labelKey, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                }`}
              >
                <Icon size={16} />
                {t.nav[labelKey]}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="px-3 py-4 border-t border-white/8 space-y-1">
          {/* Language switcher */}
          <div className="flex items-center gap-2 px-3 py-2">
            <Globe size={14} className="text-slate-500 shrink-0" />
            <span className="text-xs text-slate-500">{t.language.label}</span>
            <div className="flex items-center gap-1 ml-auto">
              {LANGS.map(({ code, label }) => (
                <button
                  key={code}
                  onClick={() => setLang(code)}
                  className={`text-xs font-semibold px-1.5 py-0.5 rounded transition-colors ${
                    lang === code
                      ? 'text-purple-400 bg-purple-500/10'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-red-400 hover:bg-red-400/5 w-full transition-colors"
          >
            <LogOut size={16} />
            {t.common.logout}
          </button>
        </div>
      </aside>
    </>
  );
}
