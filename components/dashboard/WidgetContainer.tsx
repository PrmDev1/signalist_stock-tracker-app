'use client';

import type { ReactNode } from 'react';

interface WidgetContainerProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  draggableHint?: boolean;
}

export default function WidgetContainer({
  title,
  subtitle,
  actions,
  children,
  className = '',
  draggableHint = true,
}: WidgetContainerProps) {
  return (
    <section
      data-widget-shell
      data-draggable={draggableHint ? 'true' : 'false'}
      className={[
        'rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(24,27,41,0.96),rgba(14,18,29,0.96))] p-5 shadow-[0_20px_50px_rgba(0,0,0,0.24)] transition-all duration-300',
        className,
      ].join(' ')}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold text-white">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
        </div>

        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>

      {children}
    </section>
  );
}