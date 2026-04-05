import type { ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <section className="w-full min-w-0 bg-transparent">
      <div className="mx-auto w-full max-w-[1500px] min-w-0 px-0">
        {children}
      </div>
    </section>
  );
}
