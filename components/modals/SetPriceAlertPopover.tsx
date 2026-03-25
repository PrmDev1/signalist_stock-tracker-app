'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import type { PriceAlertDto } from '@/lib/alerts/types';

export type AlertConditionType = 'ABOVE' | 'BELOW';

export type AlertRuleCondition = 'GREATER' | 'LESS';

export interface AlertRule {
	id: string;
	alertName: string;
	alertType: 'Price';
	condition: AlertRuleCondition;
	triggerPrice: number;
	frequency: 'Once per day' | 'Once per hour' | 'Once per minute';
	isActive: boolean;
}

export interface AlertStockContext {
	ticker: string;
	company: string;
	currentPrice: number;
}

interface SetPriceAlertPopoverProps {
	open: boolean;
	mode: 'create' | 'edit';
	onOpenChange: (value: boolean) => void;
	stockOptions: AlertStockContext[];
	existingAlertTickers?: string[];
	stock: AlertStockContext | null;
	initialRule?: AlertRule;
	onSubmit: (payload: Omit<AlertRule, 'id'> & { id?: string; ticker: string }) => void;
}

export default function SetPriceAlertPopover({
	open,
	mode,
	onOpenChange,
	stockOptions,
	existingAlertTickers = [],
	stock,
	initialRule,
	onSubmit,
}: SetPriceAlertPopoverProps) {
	const [selectedTicker, setSelectedTicker] = useState('');
	const [alertName, setAlertName] = useState('');
	const [alertType, setAlertType] = useState<'Price'>('Price');
	const [condition, setCondition] = useState<AlertRuleCondition>('GREATER');
	const [triggerPrice, setTriggerPrice] = useState<string>('0');
	const [frequency, setFrequency] = useState<'Once per day' | 'Once per hour' | 'Once per minute'>(
		'Once per day'
	);
	const [existingAlertId, setExistingAlertId] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

	const toAlertRule = (dto: PriceAlertDto): AlertRule => ({
		id: dto.id,
		alertName,
		alertType: 'Price',
		condition: dto.alertType === 'ABOVE' ? 'GREATER' : 'LESS',
		triggerPrice: dto.triggerPrice,
		frequency,
		isActive: dto.isActive,
	});

	const canSelectStock = mode === 'create' && !stock;

	const selectedStock =
		(canSelectStock
			? stockOptions.find((item) => item.ticker.toUpperCase() === selectedTicker.toUpperCase())
			: stock) || null;

	const hasExistingAlertForSelected = selectedStock
		? existingAlertTickers.includes(selectedStock.ticker.toUpperCase())
		: false;

	const sortedStockOptions = useMemo(() => {
		const options = [...stockOptions];

		options.sort((a, b) => {
			const aHas = existingAlertTickers.includes(a.ticker.toUpperCase()) ? 1 : 0;
			const bHas = existingAlertTickers.includes(b.ticker.toUpperCase()) ? 1 : 0;

			if (aHas !== bHas) {
				return bHas - aHas;
			}

			return a.company.localeCompare(b.company);
		});

		return options;
	}, [stockOptions, existingAlertTickers]);

	useEffect(() => {
		if (!open) return;

		if (mode === 'edit') {
			if (!stock) return;

			setSelectedTicker(stock.ticker);
			setAlertName(initialRule?.alertName || `${stock.company} Price Alert`);
			setAlertType('Price');
			setCondition(initialRule?.condition || 'GREATER');
			setTriggerPrice(initialRule ? String(initialRule.triggerPrice) : '');
			setFrequency(initialRule?.frequency || 'Once per day');
			setExistingAlertId(initialRule?.id || null);
			return;
		}

		const defaultStock = stock || sortedStockOptions[0] || null;
		setSelectedTicker(defaultStock?.ticker || '');
		setAlertName('');
		setAlertType('Price');
		setCondition('GREATER');
		setTriggerPrice('');
		setFrequency('Once per day');
		setExistingAlertId(null);
	}, [open, mode, stock, sortedStockOptions, initialRule]);

	useEffect(() => {
		if (!open || !selectedStock) return;

		let active = true;

		const loadFromApi = async () => {
			try {
				const response = await fetch(`/api/alerts?ticker=${encodeURIComponent(selectedStock.ticker)}`, {
					method: 'GET',
					cache: 'no-store',
				});

				if (!response.ok || !active) return;

				const payload = (await response.json()) as { alert: PriceAlertDto | null };
				if (!active) return;

				if (mode === 'edit') {
					if (!payload.alert) return;
					setExistingAlertId(payload.alert.id);
					setCondition(payload.alert.alertType === 'ABOVE' ? 'GREATER' : 'LESS');
					setTriggerPrice(String(payload.alert.triggerPrice));
					if (!alertName) {
						setAlertName(`${selectedStock.company} Price Alert`);
					}
					return;
				}

				if (!payload.alert) {
					setExistingAlertId(null);
					return;
				}

				// In create mode, keep form blank but remember existing id for upsert/update behavior.
				setExistingAlertId(payload.alert.id);
			} catch {
				// Keep modal usable with current state when API fetch fails.
			}
		};

		void loadFromApi();

		return () => {
			active = false;
		};
	}, [open, mode, selectedStock?.ticker]);

	if (!selectedStock) return null;

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="w-[95vw] max-w-[450px] rounded-2xl border border-gray-600 bg-gray-800/95 p-0 text-gray-200 shadow-[0_40px_100px_rgba(0,0,0,0.65)] backdrop-blur-md"
				showCloseButton={false}
			>
				<form
					className="p-6"
					onSubmit={async (event) => {
						event.preventDefault();
						const numeric = Number(triggerPrice);
						if (!Number.isFinite(numeric) || numeric <= 0) return;

						if (!Number.isFinite(selectedStock.currentPrice) || selectedStock.currentPrice <= 0) {
							toast.error('Current market price is unavailable for this stock');
							return;
						}

						if (condition === 'GREATER' && numeric <= selectedStock.currentPrice) {
							toast.error('For Greater than alert, threshold must be above current price');
							return;
						}

						if (condition === 'LESS' && numeric >= selectedStock.currentPrice) {
							toast.error('For Less than alert, threshold must be below current price');
							return;
						}

						setSaving(true);

						try {
							const endpoint = existingAlertId ? `/api/alerts/${existingAlertId}` : '/api/alerts';
							const method = existingAlertId ? 'PATCH' : 'POST';

							const response = await fetch(endpoint, {
								method,
								headers: {
									'Content-Type': 'application/json',
								},
								body: JSON.stringify({
									ticker: selectedStock.ticker,
									company: selectedStock.company,
									alertType: condition === 'GREATER' ? 'ABOVE' : 'BELOW',
									triggerPrice: numeric,
									currentPriceAtSet: selectedStock.currentPrice,
									isActive: true,
								}),
							});

							const payload = (await response.json()) as { alert?: PriceAlertDto; error?: string };
							if (!response.ok || !payload.alert) {
								throw new Error(payload.error || 'Failed to save alert');
							}

							setExistingAlertId(payload.alert.id);
							onSubmit({ ...toAlertRule(payload.alert), ticker: selectedStock.ticker });
							toast.success(mode === 'edit' || existingAlertId ? 'Alert updated' : 'Alert created');
							onOpenChange(false);
						} catch (error) {
							const message = error instanceof Error ? error.message : 'Failed to save alert';
							toast.error(message);
						} finally {
							setSaving(false);
						}
					}}
				>
					<DialogTitle className="text-3xl font-bold text-gray-100">Price Alert</DialogTitle>
					<DialogDescription className="mt-1 text-sm text-gray-500">
						{mode === 'edit'
							? `Edit alert conditions for ${selectedStock.ticker}`
							: 'Create alert conditions from your watchlist'}
					</DialogDescription>

					<div className="mt-6 space-y-4">
						<div>
							<Label className="text-gray-400">Alert Name</Label>
							<Input
								value={alertName}
								onChange={(event) => setAlertName(event.target.value)}
								className="mt-2 h-11 border-gray-600 bg-gray-700 text-gray-100"
								placeholder="AAPL Watch"
							/>
						</div>

						<div>
							<Label className="text-gray-400">Stock identifier</Label>
							{canSelectStock ? (
								<>
									<Select value={selectedTicker} onValueChange={setSelectedTicker}>
										<SelectTrigger className="mt-2 h-11 w-full border-gray-600 bg-gray-700 text-gray-100">
											<SelectValue placeholder="Select stock from watchlist" />
										</SelectTrigger>
										<SelectContent className="border-gray-600 bg-gray-800 text-gray-100">
											{sortedStockOptions.map((option) => {
												const hasExisting = existingAlertTickers.includes(option.ticker.toUpperCase());
												return (
													<SelectItem key={option.ticker} value={option.ticker}>
														{option.company} ({option.ticker}){hasExisting ? ' · Existing alert' : ''}
													</SelectItem>
												);
											})}
										</SelectContent>
									</Select>
									{hasExistingAlertForSelected && (
										<div className="mt-2 inline-flex rounded-full border border-yellow-500/40 bg-yellow-500/10 px-2.5 py-1 text-[11px] font-medium text-yellow-300">
											Existing alert
										</div>
									)}
								</>
							) : (
								<Input
									disabled
									value={`${selectedStock.company} (${selectedStock.ticker})`}
									className="mt-2 h-11 border-gray-600 bg-gray-700 text-gray-300"
								/>
							)}
						</div>

						<div>
							<Label className="text-gray-400">Alert type</Label>
							<Select value={alertType} onValueChange={(value) => setAlertType(value as 'Price')}>
								<SelectTrigger className="mt-2 h-11 w-full border-gray-600 bg-gray-700 text-gray-100">
									<SelectValue placeholder="Select type" />
								</SelectTrigger>
								<SelectContent className="border-gray-600 bg-gray-800 text-gray-100">
									<SelectItem value="Price">Price</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div>
							<Label className="text-gray-400">Condition</Label>
							<Select value={condition} onValueChange={(value) => setCondition(value as AlertRuleCondition)}>
								<SelectTrigger className="mt-2 h-11 w-full border-gray-600 bg-gray-700 text-gray-100">
									<SelectValue placeholder="Select condition" />
								</SelectTrigger>
								<SelectContent className="border-gray-600 bg-gray-800 text-gray-100">
									<SelectItem value="GREATER">Greater than (&gt;)</SelectItem>
									<SelectItem value="LESS">Less than (&lt;)</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div>
							<Label className="text-gray-400">Threshold value</Label>
							<Input
								value={triggerPrice}
								onChange={(event) => setTriggerPrice(event.target.value)}
								type="number"
								min="0"
								step="0.01"
								className="mt-2 h-11 border-gray-600 bg-gray-700 text-gray-100"
								placeholder="e.g. 240.60"
							/>
						</div>

						<div>
							<Label className="text-gray-400">Frequency</Label>
							<Select
								value={frequency}
								onValueChange={(value) =>
									setFrequency(value as 'Once per day' | 'Once per hour' | 'Once per minute')
								}
							>
								<SelectTrigger className="mt-2 h-11 w-full border-gray-600 bg-gray-700 text-gray-100">
									<SelectValue placeholder="Select frequency" />
								</SelectTrigger>
								<SelectContent className="border-gray-600 bg-gray-800 text-gray-100">
									<SelectItem value="Once per day">Once per day</SelectItem>
									<SelectItem value="Once per hour">Once per hour</SelectItem>
									<SelectItem value="Once per minute">Once per minute</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="mt-6 flex flex-col gap-2">
						<Button
							type="submit"
							disabled={saving}
							className="h-11 w-full bg-gradient-to-b from-yellow-400 to-yellow-500 text-gray-900 hover:from-yellow-500 hover:to-yellow-400"
						>
							{saving
								? 'Saving...'
								: mode === 'edit'
									? 'Update Alert'
									: hasExistingAlertForSelected
										? 'Update Existing Alert'
										: 'Create Alert'}
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							className="h-11 w-full border-gray-600 bg-transparent text-gray-300 hover:bg-gray-700"
						>
							Cancel
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
