'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  BarChart3,
  BriefcaseBusiness,
  ChevronLeft,
  ChevronsLeft,
  LayoutDashboard,
  LogOut,
  Menu,
  Star,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signOut } from '@/lib/actions/auth.actions';

const SIDEBAR_LINKS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/watchlist', label: 'Watchlist', icon: Star },
  { href: '/portfolio', label: 'Portfolio', icon: BriefcaseBusiness },
  { href: '/community-portfolio', label: 'Community', icon: BarChart3 },
];

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

interface SidebarNavbarProps {
  user: User;
  isCollapsed: boolean;
  onToggleCollapsed: () => void;
}

export default function SidebarNavbar({ user, isCollapsed, onToggleCollapsed }: SidebarNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await signOut();
      router.push('/sign-in');
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        onClick={() => setIsOpen(true)}
        className="fixed left-4 top-4 z-[70] h-11 w-11 rounded-2xl border border-white/10 bg-[#11182a]/90 text-white shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur-md lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {isOpen ? (
        <button
          type="button"
          aria-label="Close sidebar overlay"
          className="fixed inset-0 z-50 bg-[#020611]/70 backdrop-blur-sm lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      ) : null}

      <aside
        className={[
          'fixed left-0 top-0 z-[60] flex h-screen flex-col border-r border-white/10 bg-[linear-gradient(180deg,rgba(9,12,21,0.98),rgba(7,10,18,0.98))] text-white backdrop-blur-md transition-all duration-300 ease-in-out',
          isCollapsed ? 'w-[84px] lg:w-[84px]' : 'w-[286px] lg:w-[286px]',
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        ].join(' ')}
      >
        <div className={['border-b border-white/10 py-6', isCollapsed ? 'px-3' : 'px-4'].join(' ')}>
          <div className={['flex items-center gap-3', isCollapsed ? 'justify-center' : 'justify-between'].join(' ')}>
            <Link
              href="/"
              className={[
                'min-w-0 items-center gap-3 transition-all duration-300 ease-in-out',
                isCollapsed ? 'pointer-events-none hidden w-0 opacity-0 lg:hidden' : 'flex w-auto opacity-100',
              ].join(' ')}
              onClick={() => setIsOpen(false)}
              aria-hidden={isCollapsed}
              tabIndex={isCollapsed ? -1 : undefined}
            >
              <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-[22px] bg-[#0a0d17] shadow-[0_0_0_1px_rgba(255,255,255,0.08)]">
                <Image src="/assets/icons/logo.svg" alt="Signalist logo" width={28} height={28} className="h-7 w-7" />
              </div>
              <div
                className={[
                  'min-w-0 overflow-hidden transition-all duration-300 ease-in-out',
                  isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100',
                ].join(' ')}
              >
                <p className="truncate text-[14px] font-semibold tracking-[0.06em] text-white">Signalist</p>
                <p className="mt-1 truncate text-[12px] text-gray-500">signalist.app</p>
              </div>
            </Link>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={onToggleCollapsed}
                className={[
                  'hidden shrink-0 text-gray-300 shadow-none lg:flex',
                  isCollapsed
                    ? 'h-[48px] w-[48px] rounded-[20px] border border-white/10 bg-white/[0.03]'
                    : 'h-[48px] w-[48px] rounded-[20px] border border-white/10 bg-white/[0.02]',
                ].join(' ')}
                aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              >
                <ChevronsLeft
                  className={['h-[18px] w-[18px] transition-transform duration-300', isCollapsed ? 'rotate-180' : 'rotate-0'].join(' ')}
                />
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsOpen(false)}
                className="h-10 w-10 rounded-2xl border border-white/10 text-gray-300 lg:hidden"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        <nav className="mt-6 flex-1 overflow-y-auto px-3 pb-6 tv-scrollbar">
          <ul className="space-y-2">
            {SIDEBAR_LINKS.map(({ href, label, icon: Icon }) => {
              const active = isActive(href);

              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={() => setIsOpen(false)}
                    className={[
                      'group relative flex items-center rounded-[18px] border transition-all duration-300 ease-in-out',
                      active
                        ? 'border-[#5561c9]/30 bg-[#2d2d49] text-[#f3f6ff] shadow-[0_0_0_1px_rgba(85,97,201,0.16)]'
                        : 'border-transparent bg-transparent text-gray-400 hover:border-white/8 hover:bg-white/[0.04] hover:text-white',
                      isCollapsed ? 'justify-center px-0 py-3.5' : 'justify-between px-5 py-4',
                    ].join(' ')}
                    title={isCollapsed ? label : undefined}
                  >
                    {active && !isCollapsed ? (
                      <span className="absolute -left-4 top-1/2 h-10 w-1 -translate-y-1/2 rounded-full bg-[#645cff]" />
                    ) : null}
                    <div className={['flex items-center', isCollapsed ? 'justify-center' : 'gap-3'].join(' ')}>
                      <span
                        className={[
                          'flex h-10 w-10 items-center justify-center rounded-[14px] border transition-all duration-300',
                          active
                            ? 'border-[#6976d7]/20 bg-[#232742] text-[#dfe7ff]'
                            : 'border-white/8 bg-[#111625] text-gray-500 group-hover:text-[#cfd8ff]',
                        ].join(' ')}
                      >
                        <Icon className="h-4 w-4" />
                      </span>
                      <div
                        className={[
                          'overflow-hidden transition-all duration-300 ease-in-out',
                          isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100',
                        ].join(' ')}
                      >
                        <p className="whitespace-nowrap text-[15px] font-medium tracking-[0.01em]">{label}</p>
                      </div>
                    </div>
                    {!isCollapsed ? (
                      <ChevronLeft className="h-4 w-4 rotate-180 text-gray-700 transition-transform duration-300 group-hover:translate-x-0.5" />
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="border-t border-white/10 px-3 py-4">
          <div
            className={[
              'rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,24,39,0.95),rgba(11,16,30,0.95))] shadow-[0_12px_36px_rgba(0,0,0,0.28)]',
              isCollapsed ? 'p-2.5' : 'p-3',
            ].join(' ')}
          >
            <div className={['flex items-center', isCollapsed ? 'justify-center' : 'gap-3'].join(' ')}>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[linear-gradient(135deg,#2563eb,#0f172a)] text-sm font-semibold text-white shadow-[0_10px_26px_rgba(37,99,235,0.32)]">
                {getInitials(user.name)}
              </div>
              <div
                className={[
                  'min-w-0 overflow-hidden transition-all duration-300 ease-in-out',
                  isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100',
                ].join(' ')}
              >
                <p className="truncate text-sm font-semibold text-white">{user.name}</p>
                <p className="truncate text-xs text-gray-500">{user.email || 'trader@signalist.dev'}</p>
              </div>
            </div>

            <Button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className={[
                'mt-3 h-10 rounded-2xl border border-white/10 bg-white/[0.05] text-white transition-all duration-300 hover:bg-white/[0.08]',
                isCollapsed ? 'w-full px-0' : 'w-full',
              ].join(' ')}
              title={isCollapsed ? 'Log out' : undefined}
            >
              <LogOut className="h-4 w-4" />
              {!isCollapsed ? (isLoggingOut ? 'Logging out...' : 'Log out') : null}
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}