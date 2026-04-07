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
											toast.error('ไม่มีข้อมูลราคาตลาดปัจจุบันของหุ้นนี้');
							return;
						}

						if (condition === 'GREATER' && numeric <= selectedStock.currentPrice) {
											toast.error('หากเลือกมากกว่า ราคาที่ตั้งต้องสูงกว่าราคาปัจจุบัน');
							return;
						}

						if (condition === 'LESS' && numeric >= selectedStock.currentPrice) {
											toast.error('หากเลือกน้อยกว่า ราคาที่ตั้งต้องต่ำกว่าราคาปัจจุบัน');
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
								throw new Error(payload.error || 'ไม่สามารถบันทึกการแจ้งเตือนได้');
							}

							setExistingAlertId(payload.alert.id);
							onSubmit({ ...toAlertRule(payload.alert), ticker: selectedStock.ticker });
							toast.success(mode === 'edit' || existingAlertId ? 'อัปเดตการแจ้งเตือนแล้ว' : 'สร้างการแจ้งเตือนแล้ว');
							onOpenChange(false);
						} catch (error) {
							const message = error instanceof Error ? error.message : 'ไม่สามารถบันทึกการแจ้งเตือนได้';
							toast.error(message);
						} finally {
							setSaving(false);
						}
					}}
				>
					<DialogTitle className="text-3xl font-bold text-gray-100">แจ้งเตือนราคา</DialogTitle>
					<DialogDescription className="mt-1 text-sm text-gray-500">
						{mode === 'edit'
							? `แก้ไขเงื่อนไขการแจ้งเตือนของ ${selectedStock.ticker}`
							: 'สร้างการแจ้งเตือนจากรายการเฝ้าดูของคุณ'}
					</DialogDescription>

					<div className="mt-6 space-y-4">
						<div>
							<Label className="text-gray-400">ชื่อการแจ้งเตือน</Label>
							<Input
								value={alertName}
								onChange={(event) => setAlertName(event.target.value)}
								className="mt-2 h-11 border-gray-600 bg-gray-700 text-gray-100"
								placeholder="ติดตามราคา AAPL"
							/>
						</div>

						<div>
							<Label className="text-gray-400">หุ้นที่ต้องการติดตาม</Label>
							{canSelectStock ? (
								<>
									<Select value={selectedTicker} onValueChange={setSelectedTicker}>
										<SelectTrigger className="mt-2 h-11 w-full border-gray-600 bg-gray-700 text-gray-100">
											<SelectValue placeholder="เลือกหุ้นจากรายการเฝ้าดู" />
										</SelectTrigger>
										<SelectContent className="border-gray-600 bg-gray-800 text-gray-100">
											{sortedStockOptions.map((option) => {
												const hasExisting = existingAlertTickers.includes(option.ticker.toUpperCase());
												return (
													<SelectItem key={option.ticker} value={option.ticker}>
															{option.company} ({option.ticker}){hasExisting ? ' · มีการแจ้งเตือนแล้ว' : ''}
													</SelectItem>
												);
											})}
										</SelectContent>
									</Select>
									{hasExistingAlertForSelected && (
										<div className="mt-2 inline-flex rounded-full border border-yellow-500/40 bg-yellow-500/10 px-2.5 py-1 text-[11px] font-medium text-yellow-300">
											มีการแจ้งเตือนอยู่แล้ว
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
							<Label className="text-gray-400">ประเภทการแจ้งเตือน</Label>
							<Select value={alertType} onValueChange={(value) => setAlertType(value as 'Price')}>
								<SelectTrigger className="mt-2 h-11 w-full border-gray-600 bg-gray-700 text-gray-100">
									<SelectValue placeholder="เลือกประเภท" />
								</SelectTrigger>
								<SelectContent className="border-gray-600 bg-gray-800 text-gray-100">
									<SelectItem value="Price">Price</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div>
							<Label className="text-gray-400">เงื่อนไข</Label>
							<Select value={condition} onValueChange={(value) => setCondition(value as AlertRuleCondition)}>
								<SelectTrigger className="mt-2 h-11 w-full border-gray-600 bg-gray-700 text-gray-100">
									<SelectValue placeholder="เลือกเงื่อนไข" />
								</SelectTrigger>
								<SelectContent className="border-gray-600 bg-gray-800 text-gray-100">
									<SelectItem value="GREATER">มากกว่า (&gt;)</SelectItem>
									<SelectItem value="LESS">น้อยกว่า (&lt;)</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div>
							<Label className="text-gray-400">ราคาที่ใช้แจ้งเตือน</Label>
							<Input
								value={triggerPrice}
								onChange={(event) => setTriggerPrice(event.target.value)}
								type="number"
								min="0"
								step="0.01"
								className="mt-2 h-11 border-gray-600 bg-gray-700 text-gray-100"
								placeholder="เช่น 240.60"
							/>
						</div>

						<div>
							<Label className="text-gray-400">ความถี่</Label>
							<Select
								value={frequency}
								onValueChange={(value) =>
									setFrequency(value as 'Once per day' | 'Once per hour' | 'Once per minute')
								}
							>
								<SelectTrigger className="mt-2 h-11 w-full border-gray-600 bg-gray-700 text-gray-100">
									<SelectValue placeholder="เลือกความถี่" />
								</SelectTrigger>
								<SelectContent className="border-gray-600 bg-gray-800 text-gray-100">
									<SelectItem value="Once per day">วันละครั้ง</SelectItem>
									<SelectItem value="Once per hour">ชั่วโมงละครั้ง</SelectItem>
									<SelectItem value="Once per minute">นาทีละครั้ง</SelectItem>
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
								? 'กำลังบันทึก...'
								: mode === 'edit'
									? 'อัปเดตการแจ้งเตือน'
									: hasExistingAlertForSelected
										? 'อัปเดตการแจ้งเตือนเดิม'
										: 'สร้างการแจ้งเตือน'}
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							className="h-11 w-full border-gray-600 bg-transparent text-gray-300 hover:bg-gray-700"
						>
							ยกเลิก
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
