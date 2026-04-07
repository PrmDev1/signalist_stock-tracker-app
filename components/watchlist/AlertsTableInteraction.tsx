'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, Pencil, Trash2 } from 'lucide-react';
import {
	Popover,
	PopoverContent,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from '@/components/ui/popover';
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from '@/components/ui/table';
import { cn, getChangeColorClass } from '@/lib/utils';
import type { AlertRule } from '@/components/modals/SetPriceAlertPopover';
import WatchlistButton from '@/components/WatchlistButton';

export interface WatchlistAlertRow {
	ticker: string;
	company: string;
	currentPrice: number;
	priceFormatted: string;
	changeFormatted: string;
	changePercent: number;
	marketCap: string;
	peRatio: string;
}

interface AlertsTableInteractionProps {
	rows: WatchlistAlertRow[];
	alertsByTicker: Record<string, AlertRule[]>;
	onCreateAlert: (row: WatchlistAlertRow) => void;
	onEditAlert: (row: WatchlistAlertRow, alert: AlertRule) => void;
	onDeleteAlert: (ticker: string, alertId: string) => void;
	onWatchlistChange?: (ticker: string, isAdded: boolean) => void;
}

const getConditionText = (alert: AlertRule) => {
	const operator = alert.condition === 'LESS' ? '<' : '>';
	return `ราคา ${operator} $${alert.triggerPrice.toFixed(2)}`;
};

export default function AlertsTableInteraction({
	rows,
	alertsByTicker,
	onCreateAlert,
	onEditAlert,
	onDeleteAlert,
	onWatchlistChange,
}: AlertsTableInteractionProps) {
	const router = useRouter();
	const displayRows = useMemo(
		() =>
			rows.map((row) => {
				const key = row.ticker.toUpperCase();
				const alerts = alertsByTicker[key] || [];

				return {
					...row,
					key,
					alerts,
					alertCount: alerts.length,
				};
			}),
		[rows, alertsByTicker]
	);

	return (
		<div className="overflow-hidden rounded-xl border border-gray-600 bg-[#111317] shadow-[0_22px_60px_rgba(0,0,0,0.34)]">
			<Table className="w-full table-fixed">
				<colgroup>
					<col className="w-10" />
					<col className="w-[220px]" />
					<col className="w-[96px]" />
					<col className="w-[110px]" />
					<col className="w-[110px]" />
					<col className="w-[122px]" />
					<col className="w-[98px]" />
					<col className="w-[136px]" />
				</colgroup>
				<TableHeader>
					<TableRow className="h-12 border-b border-gray-600 bg-gradient-to-r from-[#232733] to-[#1A1D24] hover:bg-gradient-to-r hover:from-[#232733] hover:to-[#1A1D24]">
						<TableHead className="w-10 pl-2" />
						<TableHead className="px-3 text-[14px] font-medium text-[#d1d6df]">บริษัท</TableHead>
						<TableHead className="px-3 text-[14px] font-medium text-[#d1d6df]">ตัวย่อ</TableHead>
						<TableHead className="px-3 text-[14px] font-medium text-[#d1d6df]">ราคา</TableHead>
						<TableHead className="px-3 text-[14px] font-medium text-[#d1d6df]">การเปลี่ยนแปลง</TableHead>
						<TableHead className="px-3 text-[14px] font-medium text-[#d1d6df]">มูลค่าตลาด</TableHead>
						<TableHead className="px-3 text-[14px] font-medium text-[#d1d6df]">P/E</TableHead>
						<TableHead className="px-3 text-[14px] font-medium text-[#d1d6df]">การแจ้งเตือน</TableHead>
					</TableRow>
				</TableHeader>

				<TableBody>
					{displayRows.map((row) => (
						<TableRow
							key={row.key}
							className="h-[54px] cursor-pointer border-b border-gray-600/80 bg-transparent hover:bg-[#191c23]"
							onClick={() => router.push(`/stocks/${encodeURIComponent(row.ticker)}`)}
						>
							<TableCell className="pl-2">
								<div className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-gray-600 bg-[#2a2f39] text-yellow-400/90">
									<WatchlistButton
										symbol={row.ticker}
										company={row.company}
										isInWatchlist={true}
										showTrashIcon={true}
										type="icon"
										onWatchlistChange={onWatchlistChange}
									/>
								</div>
							</TableCell>
							<TableCell className="truncate px-3 text-[16px] font-medium leading-none text-gray-100">{row.company}</TableCell>
							<TableCell className="px-3 text-[16px] font-semibold leading-none text-gray-100">{row.ticker}</TableCell>
							<TableCell className="px-3 text-[16px] font-medium leading-none text-gray-100">{row.priceFormatted || '—'}</TableCell>
							<TableCell className={cn('px-3 text-[16px] font-semibold leading-none', getChangeColorClass(row.changePercent))}>
								{row.changeFormatted || '—'}
							</TableCell>
							<TableCell className="px-3 text-[16px] font-medium leading-none text-gray-100">{row.marketCap || '—'}</TableCell>
							<TableCell className="px-3 text-[16px] font-medium leading-none text-gray-100">{row.peRatio || '—'}</TableCell>

							<TableCell className="px-3">
								{row.alertCount > 0 ? (
									<Popover>
										<PopoverTrigger asChild>
											<button
												type="button"
												onClick={(event) => {
													event.preventDefault();
													event.stopPropagation();
												}}
												className="inline-flex h-9 w-[116px] items-center justify-center gap-1.5 rounded-[6px] border border-yellow-500/25 bg-[#1c1910] px-2.5 text-[15px] font-semibold text-yellow-500 transition hover:border-yellow-500/40 hover:bg-[#292115]"
												aria-label={`ดูการแจ้งเตือนของ ${row.ticker}`}
											>
												<Bell className="h-4 w-4 fill-yellow-500 text-yellow-500" />
												ใช้งานอยู่
											</button>
										</PopoverTrigger>

										<PopoverContent
											className="w-[280px] border-gray-600 bg-gray-800 p-3 text-gray-300"
											align="start"
											sideOffset={8}
										>
											<PopoverHeader>
												<PopoverTitle className="text-sm font-semibold text-gray-100">
													การแจ้งเตือน {row.ticker}
												</PopoverTitle>
											</PopoverHeader>

											<div className="mt-2 space-y-2">
												{row.alerts.map((alert) => (
													<div key={alert.id} className="rounded-md border border-gray-600 bg-gray-700/40 px-3 py-2">
														<div className="flex items-center justify-between gap-2">
															<div>
																<p className="text-xs text-gray-500">{alert.alertType === 'Price' ? 'ราคา' : alert.alertType}</p>
																<p className="text-sm font-semibold text-gray-100">{getConditionText(alert)}</p>
															</div>
															<div className="flex items-center gap-1">
																<button
																	type="button"
																	className="rounded p-1.5 text-gray-400 transition hover:bg-blue-500/15 hover:text-blue-300"
																	onClick={(event) => {
																		event.preventDefault();
																		event.stopPropagation();
																		onEditAlert(row, alert);
																	}}
																	aria-label={`แก้ไขการแจ้งเตือน ${alert.id}`}
																>
																	<Pencil className="h-3.5 w-3.5" />
																</button>
																<button
																	type="button"
																	className="rounded p-1.5 text-gray-400 transition hover:bg-red-500/15 hover:text-red-300"
																	onClick={(event) => {
																		event.preventDefault();
																		event.stopPropagation();
																		onDeleteAlert(row.ticker, alert.id);
																	}}
																	aria-label={`ลบการแจ้งเตือน ${alert.id}`}
																>
																	<Trash2 className="h-3.5 w-3.5" />
																</button>
															</div>
														</div>
													</div>
												))}
											</div>
										</PopoverContent>
									</Popover>
								) : (
									<button
										type="button"
										onClick={(event) => {
											event.preventDefault();
											event.stopPropagation();
											onCreateAlert(row);
										}}
										className="inline-flex h-9 w-[116px] items-center justify-center gap-1.5 rounded-[6px] border border-[#704731]/45 bg-[#3f281a] px-2.5 text-[14px] font-medium text-[#ed9850] transition hover:border-[#926040] hover:bg-[#4f3020]"
										aria-label={`สร้างการแจ้งเตือนสำหรับ ${row.ticker}`}
									>
										<Bell className="h-4 w-4" />
										ตั้งการแจ้งเตือน
									</button>
								)}
							</TableCell>
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
