'use client';

import { useState } from 'react';
import NotificationAlertsButton from '@/components/NotificationAlertsButton';
import SearchCommand from '@/components/SearchCommand';
import SidebarNavbar from '@/components/SidebarNavbar';
import TopTickerHeader from '@/components/TopTickerHeader';
import { Button } from '@/components/ui/button';

interface MainLayoutProps {
  children: React.ReactNode;
  user: User;
  initialStocks: StockWithWatchlistStatus[];
}

export default function MainLayout({ children, user, initialStocks }: MainLayoutProps) {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.08),transparent_22%),linear-gradient(180deg,#0b0f19_0%,#0a0f1b_100%)] text-white">
      <SidebarNavbar
        user={user}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapsed={() => setIsSidebarCollapsed((current) => !current)}
      />

      <div className={['min-h-screen transition-all duration-300 ease-in-out', isSidebarCollapsed ? 'lg:pl-[88px]' : 'lg:pl-[280px]'].join(' ')}>
        <div className="flex min-h-screen flex-col">
          <div className="sticky top-0 z-40 border-b border-white/10 bg-[#0B0F19]/88 backdrop-blur-xl">
            <div className="px-4 pb-4 pt-16 sm:px-5 lg:px-6 lg:pt-5">
              <TopTickerHeader />

              <div className="mt-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="hidden min-w-0 items-center gap-3 xl:flex">
                  <div>
                    <p className="text-[12px] font-medium text-gray-300">Command Center</p>
                    <p className="mt-0.5 text-[11px] text-gray-500">Search, review, and navigate without leaving the dashboard.</p>
                  </div>
                </div>

                <div className="flex w-full items-center gap-3 xl:max-w-[760px] xl:justify-end">
                  <div className="min-w-0 flex-1 xl:max-w-[430px]">
                    <SearchCommand renderAs="input" initialStocks={initialStocks} />
                  </div>

                  <NotificationAlertsButton />

                  <div className="hidden min-w-[160px] max-w-[220px] items-center rounded-[18px] border border-[#24283a] bg-[linear-gradient(180deg,#181b2a_0%,#131725_100%)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] sm:flex">
                    <p className="w-full truncate text-sm font-semibold text-white">{user.name}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <main className="flex-1 px-4 py-6 sm:px-5 lg:px-6 lg:py-8">
            <div className="mx-auto w-full max-w-[1600px]">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}