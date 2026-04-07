'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SearchCommand from '@/components/SearchCommand';
import { NAV_ITEMS } from '@/lib/constants';

interface NavbarProps {
  initialStocks: StockWithWatchlistStatus[];
}

export default function Navbar({ initialStocks }: NavbarProps) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <nav className="hidden sm:block">
      <ul className="flex flex-col gap-3 p-2 text-sm font-medium sm:flex-row sm:items-center sm:gap-6">
        {NAV_ITEMS.map(({ href, label }) => {
          if (href === '/search') {
            return (
              <li key="search-trigger">
                <SearchCommand renderAs="text" label="ค้นหาหุ้น" initialStocks={initialStocks} />
              </li>
            );
          }

          const active = isActive(href);

          return (
            <li key={href}>
              <Link
                href={href}
                className={[
                  'group relative inline-flex items-center gap-2 rounded-full px-3 py-2 transition-all duration-300',
                  active
                    ? 'bg-white/8 text-white shadow-[0_0_0_1px_rgba(125,184,255,0.25),0_0_18px_rgba(88,98,255,0.18)]'
                    : 'text-gray-400 hover:bg-white/5 hover:text-[#7db8ff]',
                ].join(' ')}
              >
                <span>{label}</span>
                <span
                  className={[
                    'absolute inset-x-3 -bottom-px h-px rounded-full bg-gradient-to-r from-[#7db8ff] via-[#0fedbe] to-transparent transition-opacity duration-300',
                    active ? 'opacity-100' : 'opacity-0 group-hover:opacity-70',
                  ].join(' ')}
                />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}