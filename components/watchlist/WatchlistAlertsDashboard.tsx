'use client';

import { useEffect, useMemo, useState } from 'react';
import SearchCommand from '@/components/SearchCommand';
import AlertsTableInteraction, {
	type WatchlistAlertRow,
} from '@/components/watchlist/AlertsTableInteraction';
import SetPriceAlertPopover, {
	type AlertRule,
} from '@/components/modals/SetPriceAlertPopover';
import ActiveAlertsManager from '@/components/sidebars/ActiveAlertsManager';
import type { PriceAlertDto } from '@/lib/alerts/types';
import { toast } from 'sonner';

interface WatchlistAlertsDashboardProps {
	initialStocks: StockWithWatchlistStatus[];
	rows: WatchlistAlertRow[];
}

interface AlertModalState {
	mode: 'create' | 'edit';
	stock: WatchlistAlertRow | null;
	alert?: AlertRule;
}

const toAlertRule = (dto: PriceAlertDto): AlertRule => ({
	id: dto.id,
	alertName: `${dto.ticker} Breakout`,
	alertType: 'Price',
	condition: dto.alertType === 'ABOVE' ? 'GREATER' : 'LESS',
	triggerPrice: dto.triggerPrice,
	frequency: 'Once per day',
	isActive: dto.isActive,
});

export default function WatchlistAlertsDashboard({ initialStocks, rows }: WatchlistAlertsDashboardProps) {
	const [watchlistRows, setWatchlistRows] = useState(rows);
	const [alertsByTicker, setAlertsByTicker] = useState<Record<string, AlertRule[]>>({});
	const [modalState, setModalState] = useState<AlertModalState | null>(null);

	useEffect(() => {
		setWatchlistRows(rows);
	}, [rows]);

	const rowByTicker = useMemo(() => {
		const map = new Map<string, WatchlistAlertRow>();
		for (const row of watchlistRows) {
			map.set(row.ticker.toUpperCase(), row);
		}
		return map;
	}, [watchlistRows]);

	const groups = useMemo(
		() =>
			watchlistRows
				.map((row) => ({
					ticker: row.ticker,
					company: row.company,
					currentPrice: row.currentPrice,
					changePercent: row.changePercent,
					alerts: alertsByTicker[row.ticker.toUpperCase()] || [],
				}))
				.filter((group) => group.alerts.length > 0),
		[watchlistRows, alertsByTicker]
	);

	const stockOptions = useMemo(
		() =>
			watchlistRows.map((row) => ({
				ticker: row.ticker,
				company: row.company,
				currentPrice: row.currentPrice,
			})),
		[watchlistRows]
	);

	const existingAlertTickers = useMemo(
		() =>
			Object.entries(alertsByTicker)
				.filter(([, alerts]) => alerts.length > 0)
				.map(([ticker]) => ticker.toUpperCase()),
		[alertsByTicker]
	);

	const upsertAlert = (ticker: string, payload: Omit<AlertRule, 'id'> & { id?: string }) => {
		const key = ticker.toUpperCase();

		setAlertsByTicker((prev) => {
			const next = { ...prev };
			const current = next[key] || [];
			const fallbackId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
			const normalized = { ...payload, id: payload.id || fallbackId } as AlertRule;

			if (payload.id || current.length > 0) {
				next[key] = current.map((item) =>
					item.id === normalized.id
						? { ...item, ...normalized }
						: item
				);

				if (!next[key].some((item) => item.id === normalized.id)) {
					next[key] = [normalized];
				}
			} else {
				next[key] = [normalized];
			}

			return next;
		});
	};

	const deleteAlert = async (ticker: string, alertId: string) => {
		try {
			const response = await fetch(`/api/alerts/${alertId}`, {
				method: 'DELETE',
			});

			const payload = (await response.json()) as { success?: boolean; error?: string };
			if (!response.ok || !payload.success) {
				throw new Error(payload.error || 'Failed to delete alert');
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Failed to delete alert';
			toast.error(message);
			return;
		}

		const key = ticker.toUpperCase();

		setAlertsByTicker((prev) => {
			const next = { ...prev };
			const filtered = (next[key] || []).filter((item) => item.id !== alertId);

			if (filtered.length === 0) {
				delete next[key];
			} else {
				next[key] = filtered;
			}

			return next;
		});

		toast.success('Alert deleted');
	};

	useEffect(() => {
		if (watchlistRows.length === 0) {
			setAlertsByTicker({});
			return;
		}

		let active = true;

		const loadAlerts = async () => {
			try {
				const tickers = watchlistRows.map((row) => row.ticker.toUpperCase()).join(',');
				const response = await fetch(`/api/alerts?tickers=${encodeURIComponent(tickers)}`, {
					method: 'GET',
					cache: 'no-store',
				});

				if (!response.ok || !active) {
					return;
				}

				const payload = (await response.json()) as { alerts?: PriceAlertDto[] };
				const nextState: Record<string, AlertRule[]> = {};

				for (const dto of payload.alerts || []) {
					if (!dto.isActive) continue;
					const key = dto.ticker.toUpperCase();
					nextState[key] = [toAlertRule(dto)];
				}

				setAlertsByTicker(nextState);
			} catch {
				// Keep current UI state if sync fails.
			}
		};

		void loadAlerts();

		return () => {
			active = false;
		};
	}, [watchlistRows]);

	const handleWatchlistChange = (ticker: string, isAdded: boolean) => {
		if (isAdded) {
			return;
		}

		const key = ticker.toUpperCase();
		setWatchlistRows((prev) => prev.filter((row) => row.ticker.toUpperCase() !== key));
		setAlertsByTicker((prev) => {
			const next = { ...prev };
			delete next[key];
			return next;
		});

		setModalState((prev) => {
			if (!prev?.stock) {
				return prev;
			}

			return prev.stock.ticker.toUpperCase() === key ? null : prev;
		});
	};

	return (
		<>
			<div className="mb-1.5 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1fr)_330px] xl:gap-4 2xl:grid-cols-[minmax(0,1fr)_342px]">
				<div className="flex items-end justify-between">
					<h2 className="text-[52px] font-bold leading-[1] tracking-tight text-gray-100">Watchlist</h2>
					<SearchCommand label="Add Stock" initialStocks={initialStocks} />
				</div>
				<div className="flex items-end justify-between xl:pl-1">
					<h3 className="text-[52px] font-bold leading-[1] tracking-tight text-gray-100">Alerts</h3>
					<button
						type="button"
						onClick={() => {
							setModalState({ mode: 'create', stock: null });
						}}
						className="h-9 rounded-[6px] bg-gradient-to-b from-[#f2c940] to-[#e3b732] px-3 text-[14px] font-semibold text-[#111] transition hover:from-[#f8d356] hover:to-[#e6be45]"
					>
						Create Alert
					</button>
				</div>
			</div>

			<div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_330px] xl:gap-4 2xl:grid-cols-[minmax(0,1fr)_342px]">
				<AlertsTableInteraction
					rows={watchlistRows}
					alertsByTicker={alertsByTicker}
					onCreateAlert={(row) => setModalState({ mode: 'create', stock: row })}
					onEditAlert={(row, alert) => setModalState({ mode: 'edit', stock: row, alert })}
					onDeleteAlert={deleteAlert}
					onWatchlistChange={handleWatchlistChange}
				/>

				<ActiveAlertsManager
					groups={groups}
					onEdit={(ticker, alert) => {
						const row = rowByTicker.get(ticker.toUpperCase());
						if (!row) return;
						setModalState({ mode: 'edit', stock: row, alert });
					}}
					onDelete={deleteAlert}
				/>
			</div>

			<SetPriceAlertPopover
				open={Boolean(modalState)}
				mode={modalState?.mode || 'create'}
				onOpenChange={(open) => {
					if (!open) setModalState(null);
				}}
				stockOptions={stockOptions}
				existingAlertTickers={existingAlertTickers}
				stock={
					modalState?.stock
						? {
								ticker: modalState.stock.ticker,
								company: modalState.stock.company,
								currentPrice: modalState.stock.currentPrice,
							}
						: null
				}
				initialRule={modalState?.alert}
				onSubmit={(payload) => {
					upsertAlert(payload.ticker, payload);
				}}
			/>
		</>
	);
}
