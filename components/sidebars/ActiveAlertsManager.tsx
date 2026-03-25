'use client';

import { Pencil, Trash2 } from 'lucide-react';
import TickerLogo from '@/components/portfolio/detail/TickerLogo';
import { cn, getChangeColorClass } from '@/lib/utils';
import type { AlertRule } from '@/components/modals/SetPriceAlertPopover';

export interface AlertSidebarGroup {
	ticker: string;
	company: string;
	currentPrice: number;
	changePercent: number;
	alerts: AlertRule[];
}

interface ActiveAlertsManagerProps {
	groups: AlertSidebarGroup[];
	onEdit: (ticker: string, alert: AlertRule) => void;
	onDelete: (ticker: string, alertId: string) => void;
}

const getConditionText = (alert: AlertRule) => {
	const operator = alert.condition === 'LESS' ? '<' : '>';
	return `Price ${operator} $${alert.triggerPrice.toFixed(2)}`;
};

export default function ActiveAlertsManager({
	groups,
	onEdit,
	onDelete,
}: ActiveAlertsManagerProps) {
	return (
		<aside className="rounded-xl border border-gray-600 bg-[#121418] p-3 shadow-[0_20px_45px_rgba(0,0,0,0.35)]">
			<div className="space-y-2.5">
				{groups.map((group) => (
					<section key={group.ticker} className="rounded-lg border border-gray-600 bg-gradient-to-r from-[#242934] to-[#1b1f27] px-3 py-2.5">
						<div className="flex items-start justify-between gap-2">
							<div className="flex items-center gap-2.5">
								<TickerLogo ticker={group.ticker} size={30} className="border-gray-500" />
								<div>
									<h4 className="line-clamp-1 text-[15px] font-medium leading-tight text-gray-100">{group.company}</h4>
									<p className="mt-0.5 text-[13px] text-gray-300">${group.currentPrice.toFixed(2)}</p>
								</div>
							</div>

							<div className="text-right">
								<p className="text-[20px] font-medium leading-none text-gray-300">{group.ticker}</p>
								<p className={cn('mt-1 text-[17px] font-semibold', getChangeColorClass(group.changePercent))}>
									{group.changePercent > 0 ? '+' : ''}
									{group.changePercent.toFixed(2)}%
								</p>
							</div>
						</div>

						<div className="mt-2.5 space-y-2">
							{group.alerts.map((alert) => (
								<div key={alert.id} className="rounded-md border border-gray-600/80 bg-[#1b1f27]/70 px-2.5 py-1.5">
									<div className="mb-1 flex items-center justify-between">
										<p className="text-[15px] text-gray-300">Alert:</p>
										<div className="flex items-center gap-1">
											<button
												type="button"
												className="rounded p-1 text-gray-400 transition hover:bg-blue-500/15 hover:text-blue-300"
												onClick={() => onEdit(group.ticker, alert)}
												aria-label={`Edit ${group.ticker} alert`}
											>
												<Pencil className="h-3.5 w-3.5" />
											</button>
											<button
												type="button"
												className="rounded p-1 text-gray-400 transition hover:bg-red-500/15 hover:text-red-300"
												onClick={() => onDelete(group.ticker, alert.id)}
												aria-label={`Delete ${group.ticker} alert`}
											>
												<Trash2 className="h-3.5 w-3.5" />
											</button>
										</div>
									</div>

									<div className="flex items-center justify-between gap-2">
										<p className="text-[18px] font-semibold leading-none text-gray-100">{getConditionText(alert)}</p>
										<span className="rounded bg-yellow-500/20 px-2 py-0.5 text-[11px] font-medium text-yellow-400">
											{alert.frequency}
										</span>
									</div>
								</div>
							))}
						</div>
					</section>
				))}

				{groups.length === 0 && (
					<div className="rounded-lg border border-dashed border-gray-600 bg-gray-700/20 px-3 py-8 text-center text-sm text-gray-500">
						No active alerts yet. Create your first alert.
					</div>
				)}
			</div>
		</aside>
	);
}
