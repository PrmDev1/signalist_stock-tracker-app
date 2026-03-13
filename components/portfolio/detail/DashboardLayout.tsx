import type { ReactNode } from 'react';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return (
    <section className="relative left-1/2 right-1/2 -mx-[50vw] w-screen bg-[#040810] px-3 pb-6 pt-3 sm:px-4 lg:px-6 2xl:px-8">
      {children}
    </section>
  );
}
