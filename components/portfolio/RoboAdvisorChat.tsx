'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Bot, CheckCircle2, Loader2, PieChart, RefreshCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { setRoboChatStocksInSession, type FilteredStock } from '@/lib/portfolio-filtered-stocks';
import { getFactorLabel, getScoreLevel, getTotalRatingLabel, type FactorType } from '@/lib/score-utils';
import { cn } from '@/lib/utils';

type MessageRole = 'user' | 'bot';
type ChatStep = 'menu' | 'config' | 'loading' | 'done';
type ScreenMode = 'global' | 'sector';
type ChatMessageKind = 'text' | 'config';

interface ChatMessage {
	id: number;
	role: MessageRole;
	content: string | ReactNode;
	kind?: ChatMessageKind;
	mode?: ScreenMode;
}

interface SmartScreenStock {
	symbol?: string;
	ticker?: string;
	companyName?: string;
	dynamicScore?: number;
	finalScore?: number;
	factors?: Record<string, number | null | undefined>;
	Quality?: number;
	Value?: number;
	Growth?: number;
	Risk?: number;
	quality?: number;
	value?: number;
	growth?: number;
	risk?: number;
}

interface SmartScreenResponse {
	status: string;
	strategyApplied: {
		message: string;
		evaluatedRegime?: string;
		userOverrideRegime?: string;
	};
	marketReading?: {
		systemEvaluatedRegime?: string;
		userOverrideRegime?: string;
	};
	recommendedStocks: {
		count: number;
		data: SmartScreenStock[];
	};
}

interface ApiErrorResponse {
	error?: string;
	detail?: string;
}

interface RegimeOption {
	value: string;
	title: string;
	desc: string;
}

interface SubmittedConfig {
	limit: number;
	regime: string;
	mode?: ScreenMode;
}

interface MacroMetric {
	icon: string;
	label: string;
	value: string;
	helpText: string;
}

const SYSTEM_DEFAULT_VALUE = 'system-default';
const ROBO_WELCOME_STORAGE_KEY = 'roboWelcomeSeen';
const INITIAL_REGIME = 'Recovery / Moderate Growth';
const INITIAL_REGIME_THAI = 'สภาวะฟื้นตัว / เติบโตปานกลาง';
const INITIAL_REGIME_DURATION = 25;
const INITIAL_MACRO_METRICS: MacroMetric[] = [
	{ icon: '📉', label: 'VIX', value: '14.95', helpText: 'ตลาดสงบ' },
	{ icon: '📊', label: 'Yield Spread', value: '0.71%', helpText: 'ปกติ' },
	{ icon: '🍎', label: 'CPI (Inflation)', value: '2.94%', helpText: 'Z-Score -0.78' },
	{ icon: '🏭', label: 'IndPro (Production)', value: '1.47%', helpText: 'Z-Score -0.03' },
	{ icon: '🛢️', label: 'Oil (3M)', value: '-9.36%', helpText: 'แรงกดดันพลังงานลดลง' },
];

const REGIMES: RegimeOption[] = [
	{
		value: '1. Extreme Market Stress',
		title: 'Extreme Stress',
		desc: 'วิกฤตตื่นตระหนก เน้น Quality & Risk ต่ำ',
	},
	{
		value: '2. Stagflation',
		title: 'Stagflation',
		desc: 'ถดถอยแต่ของแพง เน้น Quality',
	},
	{
		value: '3. Deflationary Bust',
		title: 'Deflationary Bust',
		desc: 'เศรษฐกิจตกต่ำเงินฝืด ช้อน Value',
	},
	{
		value: '4. Economic Contraction',
		title: 'Economic Contraction',
		desc: 'เศรษฐกิจหดตัว เน้นความปลอดภัย',
	},
	{
		value: '5. High Inflationary Pressure',
		title: 'High Inflation',
		desc: 'เงินเฟ้อพุ่ง ต้นทุนแพง',
	},
	{
		value: '6. Goldilocks',
		title: 'Goldilocks',
		desc: 'เศรษฐกิจสมบูรณ์แบบ ลุย Growth',
	},
	{
		value: '7. Strong Expansion',
		title: 'Strong Expansion',
		desc: 'ขยายตัวแข็งแกร่ง โหมด Risk-on',
	},
	{
		value: '8. Recovery / Moderate Growth',
		title: 'Recovery',
		desc: 'ฟื้นตัวปกติ กระจายความเสี่ยง',
	},
];

const MODE_LABELS: Record<ScreenMode, string> = {
	global: 'เปรียบเทียบหุ้นทั้งตลาด (Global Screen)',
	sector: 'เปรียบเทียบหุ้นรายอุตสาหกรรม (Best per Sector)',
};

function normalizeRegimeLabel(value: string): string {
	if (value === SYSTEM_DEFAULT_VALUE) return 'ใช้ค่าเริ่มต้นของระบบ';
	return value.includes('. ') ? value.split('. ')[1] ?? value : value;
}

function getStockLabel(stock: SmartScreenStock): string {
	return stock.symbol || stock.ticker || stock.companyName || 'Unknown';
}

function getNumericScore(value: unknown): number | undefined {
	return Number.isFinite(value) ? Number(value) : undefined;
}

function normalizeFactorKey(value: string): string {
	return value.replace(/[^a-z]/gi, '').toLowerCase();
}

function getFactorScore(stock: SmartScreenStock, factor: FactorType): number | undefined {
	const upperKey = factor as keyof SmartScreenStock;
	const lowerKey = factor.toLowerCase() as keyof SmartScreenStock;
	const directScore = getNumericScore(stock[upperKey]) ?? getNumericScore(stock[lowerKey]);
	if (directScore !== undefined) return directScore;

	if (!stock.factors) return undefined;

	const targetKey = normalizeFactorKey(factor);
	const matchedEntry = Object.entries(stock.factors).find(([key]) => normalizeFactorKey(key).includes(targetKey));
	return getNumericScore(matchedEntry?.[1]);
}

function getTotalScore(stock: SmartScreenStock): number | undefined {
	return getNumericScore(stock.dynamicScore) ?? getNumericScore(stock.finalScore);
}

function getBadgeClassName(level: number): string {
	if (level >= 4) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
	if (level === 3) return 'bg-amber-100 text-amber-800 border-amber-200';
	if (level > 0) return 'bg-rose-100 text-rose-800 border-rose-200';
	return 'bg-slate-100 text-slate-600 border-slate-200';
}

function formatNumericScore(value?: number): string {
	if (!Number.isFinite(value)) return 'N/A';
	return Number(value).toFixed(2);
}

function toOptimizerHandoffStocks(stocks: SmartScreenStock[]): FilteredStock[] {
	const dedupedStocks = new Map<string, FilteredStock>();

	for (const stock of stocks) {
		const symbol = String(stock.symbol || stock.ticker || '').trim().toUpperCase();
		if (!symbol) continue;

		dedupedStocks.set(symbol, {
			symbol,
			name: String(stock.companyName || symbol).trim(),
			sector: 'RoboChat Selection',
			marketCap: 0,
		});
	}

	return Array.from(dedupedStocks.values());
}

function OptimizePortfolioHandoff({ stocks }: { stocks: SmartScreenStock[] }) {
	const router = useRouter();
	const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [handoffStatus, setHandoffStatus] = useState<'idle' | 'loading' | 'success'>('idle');
	const handoffStocks = toOptimizerHandoffStocks(stocks);

	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	if (handoffStocks.length < 2) {
		return null;
	}

	const handleOptimizePortfolio = () => {
		if (handoffStatus !== 'idle') return;

		setHandoffStatus('loading');
		setRoboChatStocksInSession(handoffStocks);
		setHandoffStatus('success');

		timeoutRef.current = setTimeout(() => {
			router.push('/portfolio/optimizer?preset=custom');
			setHandoffStatus('idle');
			timeoutRef.current = null;
		}, 800);
	};

	const buttonClassName = cn(
		'mt-4 h-12 w-full rounded-xl text-sm font-semibold text-white shadow-md transition-all duration-200',
		handoffStatus === 'idle' &&
			'bg-[linear-gradient(90deg,#38bdf8_0%,#4f46e5_100%)] hover:scale-[1.02] hover:brightness-110',
		handoffStatus === 'loading' && 'bg-slate-400 cursor-not-allowed opacity-80 pointer-events-none',
		handoffStatus === 'success' && 'bg-emerald-600 cursor-not-allowed pointer-events-none'
	);

	return (
		<div className="rounded-xl border border-cyan-200 bg-[linear-gradient(180deg,#eff6ff_0%,#eef2ff_100%)] p-4 shadow-sm">
			<p className="text-sm leading-7 text-slate-700">
				คุณสามารถนำหุ้นชุดนี้ไปคำนวณสัดส่วนการลงทุน (Portfolio Optimization) เพื่อหาน้ำหนักที่เหมาะสมที่สุดตามหลักทฤษฎี MVO ได้ทันทีครับ
			</p>
			<Button
				type="button"
				onClick={handleOptimizePortfolio}
				disabled={handoffStatus !== 'idle'}
				className={buttonClassName}
			>
				{handoffStatus === 'idle' ? <PieChart className="mr-2 h-4 w-4" /> : null}
				{handoffStatus === 'loading' ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
				{handoffStatus === 'success' ? <CheckCircle2 className="mr-2 h-4 w-4" /> : null}
				{handoffStatus === 'idle' ? '🚀 นำหุ้นชุดนี้ไปจัดพอร์ต (Optimize Portfolio)' : null}
				{handoffStatus === 'loading' ? '⏳ กำลังเตรียมข้อมูล...' : null}
				{handoffStatus === 'success' ? '✅ ส่งข้อมูลเรียบร้อย!' : null}
			</Button>
		</div>
	);
}

function buildResultsNode(payload: SmartScreenResponse, fallbackRegime: string): ReactNode {
	const evaluatedRegime =
		payload.marketReading?.systemEvaluatedRegime ||
		payload.marketReading?.userOverrideRegime ||
		payload.strategyApplied.evaluatedRegime ||
		payload.strategyApplied.userOverrideRegime ||
		fallbackRegime;

	return (
		<div className="space-y-4">
			<div className="rounded-xl border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-700 shadow-sm">
				{payload.strategyApplied.message}
			</div>
			<div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
				<div className="mb-3 flex items-center justify-between text-xs text-slate-500">
					<span>ผลลัพธ์ที่คัดกรองได้</span>
					<span>{payload.recommendedStocks.count} รายการ</span>
				</div>
				<div className="scrollbar-slim max-h-64 space-y-2 overflow-y-auto pr-2">
					{payload.recommendedStocks.data.map((stock, index) => (
						(() => {
							const totalScore = getTotalScore(stock);
							const totalLevel = getScoreLevel(totalScore);
							const factorEntries: Array<{ key: FactorType; label: string; score?: number }> = [
								{ key: 'Quality', label: 'Quality', score: getFactorScore(stock, 'Quality') },
								{ key: 'Value', label: 'Value', score: getFactorScore(stock, 'Value') },
								{ key: 'Growth', label: 'Growth', score: getFactorScore(stock, 'Growth') },
								{ key: 'Risk', label: 'Risk', score: getFactorScore(stock, 'Risk') },
							];

							return (
								<div
									key={`${getStockLabel(stock)}-${index}`}
									className="rounded-lg border border-slate-200 bg-white p-3 text-slate-900 shadow-sm"
								>
									<div className="flex items-start justify-between gap-3">
										<div className="min-w-0">
											<p className="truncate text-base font-bold text-slate-900">{getStockLabel(stock)}</p>
											{stock.companyName && stock.companyName !== getStockLabel(stock) ? (
												<p className="truncate text-xs text-slate-500">{stock.companyName}</p>
											) : null}
										</div>
										<div
											className={cn(
												'ml-2 inline-flex shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-medium',
												getBadgeClassName(totalLevel)
											)}
										>
											{getTotalRatingLabel(totalScore, evaluatedRegime)} ({formatNumericScore(totalScore)})
										</div>
									</div>

									<div className="mt-2 rounded-md bg-slate-50 p-2">
										<div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
											{factorEntries.map((factor) => (
												<div key={factor.key} className="rounded-md bg-white/80 px-2 py-1.5">
													<p className="font-medium text-slate-600">{factor.label}</p>
													<p className="mt-1 text-slate-800">
														<span className="font-medium">{getFactorLabel(factor.score, factor.key)}</span>{' '}
														({formatNumericScore(factor.score)})
													</p>
												</div>
											))}
										</div>
									</div>
								</div>
							);
						})()
					))}
				</div>
			</div>
			<OptimizePortfolioHandoff stocks={payload.recommendedStocks.data} />
		</div>
	);
}

function buildInitialGreetingNode(): ReactNode {
	return (
		<div className="space-y-4">
			<p className="text-sm leading-7 text-slate-800">
				สวัสดีครับ ผม RoboAdvisor ผู้ช่วยส่วนตัวของคุณ ปัจจุบันระบบได้วิเคราะห์ข้อมูล Macro ล่าสุดจากสหรัฐฯ และพบว่าเรายังคงอยู่ในสภาวะเศรษฐกิจแบบ...
			</p>

			<div className="rounded-xl border border-[#243048] bg-white p-4 shadow-sm">
				<div className="flex flex-col gap-2">
					<p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Current Regime</p>
					<p className="text-base font-semibold text-slate-900">
						{INITIAL_REGIME} <span className="text-slate-600">({INITIAL_REGIME_THAI})</span>
					</p>
					<p className="text-sm text-slate-600">ต่อเนื่องมาแล้ว {INITIAL_REGIME_DURATION} เดือน</p>
					<p className="text-sm leading-6 text-slate-700">
						สภาวะปกติที่ตัวเลขเศรษฐกิจไม่ได้โดดเด่นไปทางใดทางหนึ่ง เป็นช่วงที่ตลาดค่อยๆ ไต่ระดับขึ้นอย่างมั่นคง
					</p>
				</div>
			</div>

			<div className="rounded-xl border border-[#243048] bg-white p-4 shadow-sm">
				<p className="mb-3 text-xs font-medium uppercase tracking-[0.18em] text-slate-500">Macro Dashboard</p>
				<div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
					{INITIAL_MACRO_METRICS.map((metric) => (
						<div key={metric.label} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
							<p className="text-xs font-medium text-slate-500">
								<span className="mr-1">{metric.icon}</span>
								{metric.label}
							</p>
							<p className="mt-2 text-sm font-semibold text-slate-900">{metric.value}</p>
							<p className="mt-1 text-xs text-slate-600">{metric.helpText}</p>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

export default function RoboAdvisorChat() {
	const scrollContainerRef = useRef<HTMLDivElement | null>(null);
	const messageIdRef = useRef(1);
	const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const welcomeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const [isMounted, setIsMounted] = useState(false);
	const [open, setOpen] = useState(false);
	const [isRendered, setIsRendered] = useState(false);
	const [isClosing, setIsClosing] = useState(false);
	const [showWelcomeBubble, setShowWelcomeBubble] = useState(false);
	const [messages, setMessages] = useState<ChatMessage[]>([
		{
			id: 1,
			role: 'bot',
			content: buildInitialGreetingNode(),
		},
	]);
	const [step, setStep] = useState<ChatStep>('menu');
	const [selectedMode, setSelectedMode] = useState<ScreenMode | null>(null);
	const [limit, setLimit] = useState(10);
	const [selectedRegime, setSelectedRegime] = useState<string>(SYSTEM_DEFAULT_VALUE);
	const [activeConfigMessageId, setActiveConfigMessageId] = useState<number | null>(null);
	const [submittedConfigs, setSubmittedConfigs] = useState<Record<number, SubmittedConfig>>({});
	const [isLoading, setIsLoading] = useState(false);

	const nextMessageId = () => {
		messageIdRef.current += 1;
		return messageIdRef.current;
	};

	const appendChatMessage = (message: Omit<ChatMessage, 'id'>) => {
		const id = nextMessageId();
		setMessages((current) => [...current, { id, ...message }]);
		return id;
	};

	const appendMessage = (role: MessageRole, content: string | ReactNode) => {
		return appendChatMessage({ role, content, kind: 'text' });
	};

	useEffect(() => {
		setIsMounted(true);

		if (typeof window !== 'undefined' && !window.localStorage.getItem(ROBO_WELCOME_STORAGE_KEY)) {
			welcomeTimerRef.current = setTimeout(() => {
				setShowWelcomeBubble(true);
				welcomeTimerRef.current = null;
			}, 2000);
		}

		return () => {
			if (closeTimerRef.current) {
				clearTimeout(closeTimerRef.current);
			}

			if (welcomeTimerRef.current) {
				clearTimeout(welcomeTimerRef.current);
			}
		};
	}, []);

	useEffect(() => {
		if (!scrollContainerRef.current) return;

		if (step === 'menu' && messages.length === 1) {
			scrollContainerRef.current.scrollTop = 0;
			return;
		}

		scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
	}, [messages, isLoading, isRendered, step]);

	const dismissWelcome = () => {
		setShowWelcomeBubble(false);

		if (typeof window !== 'undefined') {
			window.localStorage.setItem(ROBO_WELCOME_STORAGE_KEY, 'true');
		}

		if (welcomeTimerRef.current) {
			clearTimeout(welcomeTimerRef.current);
			welcomeTimerRef.current = null;
		}
	};

	const resetConversation = () => {
		messageIdRef.current = 1;
		setMessages([
			{
				id: 1,
				role: 'bot',
				content: buildInitialGreetingNode(),
			},
		]);
		setStep('menu');
		setSelectedMode(null);
		setLimit(10);
		setSelectedRegime(SYSTEM_DEFAULT_VALUE);
		setActiveConfigMessageId(null);
		setSubmittedConfigs({});
		setIsLoading(false);
	};

	const handleSelectMode = (mode: ScreenMode) => {
		setSelectedMode(mode);
		setStep('config');
		appendMessage('user', MODE_LABELS[mode]);
		const configId = appendChatMessage({
			role: 'bot',
			kind: 'config',
			mode,
			content: 'รับทราบครับ กรุณาตั้งค่าจำนวนหุ้นและสภาวะตลาดที่คุณคาดการณ์ เพื่อให้ผมคัดกรองได้แม่นยำขึ้นครับ',
		});
		setActiveConfigMessageId(configId);
	};

	const openChat = () => {
		dismissWelcome();

		if (closeTimerRef.current) {
			clearTimeout(closeTimerRef.current);
			closeTimerRef.current = null;
		}

		setIsClosing(false);
		setIsRendered(true);
		setOpen(true);
	};

	const closeChat = () => {
		if (!isRendered) return;

		setOpen(false);
		setIsClosing(true);

		if (closeTimerRef.current) {
			clearTimeout(closeTimerRef.current);
		}

		closeTimerRef.current = setTimeout(() => {
			setIsClosing(false);
			setIsRendered(false);
			closeTimerRef.current = null;
		}, 180);
	};

	const toggleChat = () => {
		if (open && !isClosing) {
			closeChat();
			return;
		}

		openChat();
	};

	const runSmartScreen = async () => {
		if (!selectedMode) return;

		if (activeConfigMessageId !== null) {
			setSubmittedConfigs((current) => ({
				...current,
				[activeConfigMessageId]: {
					limit,
					regime: selectedRegime,
					mode: selectedMode,
				},
			}));
		}

		setActiveConfigMessageId(null);
		appendMessage('user', `ต้องการ ${limit} ตัว | ${normalizeRegimeLabel(selectedRegime)}`);
		appendMessage('bot', 'รับทราบครับ กำลังคัดกรองหุ้นตามเงื่อนไขที่คุณเลือกให้ครับ');
		setStep('loading');
		setIsLoading(true);

		try {
			const params = new URLSearchParams({
				limit: String(limit),
				isSectorQuota: selectedMode === 'sector' ? 'true' : 'false',
			});

			if (selectedMode === 'sector') {
				params.set('quotaPerSector', '2');
			}

			if (selectedRegime !== SYSTEM_DEFAULT_VALUE) {
				params.set('userExpectedRegime', selectedRegime);
			}

			const response = await fetch(`/api/v1/portfolio/smart-screen?${params.toString()}`, {
				method: 'GET',
				cache: 'no-store',
			});

			const payload = (await response.json().catch(() => ({}))) as SmartScreenResponse & ApiErrorResponse;

			if (!response.ok) {
				throw new Error(payload.error || payload.detail || 'ไม่สามารถดึงข้อมูล Smart Screening ได้');
			}

			appendMessage('bot', buildResultsNode(payload, selectedRegime));
			setStep('done');
		} catch (error) {
			const message = error instanceof Error ? error.message : 'ไม่สามารถดึงข้อมูล Smart Screening ได้';
			appendMessage('bot', message);
			const configId = appendChatMessage({
				role: 'bot',
				kind: 'config',
				mode: selectedMode,
				content: 'ลองปรับจำนวนหุ้นหรือสภาวะตลาดอีกครั้ง แล้วให้ผมคัดกรองใหม่ได้เลยครับ',
			});
			setActiveConfigMessageId(configId);
			setStep('config');
		} finally {
			setIsLoading(false);
		}
	};

	const renderConfigSummary = (messageId: number, mode?: ScreenMode) => {
		const submittedConfig = submittedConfigs[messageId];
		const summaryMode = submittedConfig?.mode ?? mode;
		const summaryLimit = submittedConfig?.limit ?? limit;
		const summaryRegime = submittedConfig?.regime ?? selectedRegime;

		return (
			<div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-600 shadow-sm">
				<p className="font-medium text-slate-900">{summaryMode ? MODE_LABELS[summaryMode] : 'Smart Screening'}</p>
				<p className="mt-1">จำนวนหุ้น {summaryLimit} ตัว</p>
				<p className="mt-1">สภาวะตลาด: {normalizeRegimeLabel(summaryRegime)}</p>
			</div>
		);
	};

	const renderConfigForm = (mode?: ScreenMode) => (
		<div className="mt-3 flex w-full flex-col gap-5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm text-slate-900">
			<div className="flex items-center justify-between gap-3">
				<label htmlFor="smart-screen-limit" className="text-sm font-medium text-slate-700">
					จำนวนหุ้น (5-20)
				</label>
				<input
					id="smart-screen-limit"
					type="number"
					min={5}
					max={20}
					value={limit}
					onChange={(event) => {
						const parsed = Number(event.target.value);
						if (!Number.isFinite(parsed)) return;
						setLimit(Math.min(20, Math.max(5, parsed)));
					}}
					className="w-20 rounded-md border border-slate-300 p-2 text-right text-sm text-slate-900 outline-none transition focus:border-blue-500"
				/>
			</div>

			<div className="space-y-3">
				<p className="text-sm font-medium text-slate-700">เลือกสภาวะตลาด</p>
				<div className="scrollbar-slim flex snap-x gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible">
					<button
						type="button"
						onClick={() => setSelectedRegime(SYSTEM_DEFAULT_VALUE)}
						className={[
							'min-w-[220px] snap-start cursor-pointer rounded-lg border p-3 text-left transition hover:border-blue-500 sm:min-w-0 sm:col-span-2',
							selectedRegime === SYSTEM_DEFAULT_VALUE
								? 'border-blue-500 bg-blue-50'
								: 'border-slate-200 bg-white',
						].join(' ')}
					>
						<p className="text-sm font-semibold text-slate-900">ใช้ค่าเริ่มต้นของระบบ</p>
						<p className="mt-1 line-clamp-2 text-xs text-slate-500">ให้ backend เลือกสภาวะตลาดล่าสุดโดยอัตโนมัติ ไม่ต้อง override เอง</p>
					</button>

					{REGIMES.map((regime) => {
						const active = selectedRegime === regime.value;

						return (
							<button
								key={regime.value}
								type="button"
								onClick={() => setSelectedRegime(regime.value)}
								className={[
									'min-w-[190px] snap-start cursor-pointer rounded-lg border p-3 text-left transition hover:border-blue-500 sm:min-w-0',
									active ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white',
								].join(' ')}
							>
								<p className="text-sm font-semibold text-slate-900">{regime.title}</p>
								<p className="mt-1 line-clamp-2 text-xs text-slate-500">{regime.desc}</p>
							</button>
						);
					})}
				</div>
			</div>

			<Button
				type="button"
				onClick={runSmartScreen}
				disabled={!mode || isLoading}
				className="h-11 w-full rounded-lg bg-blue-600 text-sm font-medium text-white hover:bg-blue-500 disabled:bg-slate-300"
			>
				ยืนยันการตั้งค่า (Confirm)
			</Button>
		</div>
	);

	const renderMessageContent = (message: ChatMessage) => {
		if (message.kind === 'config') {
			const isActiveForm = message.id === activeConfigMessageId && step === 'config';

			return (
				<>
					<p>{message.content}</p>
					{isActiveForm ? renderConfigForm(message.mode) : renderConfigSummary(message.id, message.mode)}
				</>
			);
		}

		return message.content;
	};

	const floatingWindow = isRendered && isMounted
		? createPortal(
			<>
				<button
					type="button"
					aria-label="Close RoboChat backdrop"
					className="fixed inset-0 z-[90] bg-black/35 backdrop-blur-[2px]"
					style={{ animation: isClosing ? 'robochat-backdrop-out 180ms ease-in forwards' : 'robochat-backdrop-in 220ms ease-out forwards' }}
					onClick={closeChat}
				/>

				<div className="fixed bottom-6 left-1/2 z-[100] w-[95vw] max-w-[800px] -translate-x-1/2 md:bottom-6 md:left-auto md:right-6 md:w-[50vw] md:translate-x-0">
					<div
						className="z-50 flex h-[85vh] min-h-[600px] max-h-[900px] w-full flex-col overflow-hidden rounded-2xl border border-[#243048] bg-[radial-gradient(circle_at_top_left,rgba(88,98,255,0.12),transparent_28%),linear-gradient(180deg,#0f1724_0%,#0a1220_100%)] shadow-2xl"
						style={{ animation: isClosing ? 'robochat-window-out 180ms ease-in forwards' : 'robochat-window-in 240ms ease-out forwards' }}
					>
					<div className="z-10 flex h-16 flex-shrink-0 items-center justify-between border-b border-white/10 bg-[#101522]/95 px-4 backdrop-blur">
						<div className="flex items-center gap-3">
							<div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#7db8ff]/30 bg-[#7db8ff]/12 text-[#bcd8ff]">
								<Bot className="h-5 w-5" />
							</div>
							<div>
								<p className="text-base font-semibold text-white">RoboChat</p>
								<p className="text-sm text-slate-400">Smart screen assistant</p>
							</div>
						</div>

						<div className="flex items-center gap-2">
							<Button
								type="button"
								variant="ghost"
								onClick={resetConversation}
								className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-slate-300 hover:bg-white/[0.08] hover:text-white"
							>
								<RefreshCcw className="h-4 w-4" />
							</Button>
							<Button
								type="button"
								variant="ghost"
								onClick={closeChat}
								className="h-10 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-slate-300 hover:bg-white/[0.08] hover:text-white"
							>
								<X className="h-4 w-4" />
							</Button>
						</div>
					</div>

					<div ref={scrollContainerRef} className="scrollbar-slim flex-1 overflow-y-auto bg-[#111827] p-4 pr-2">
						<div className="space-y-4">
							{messages.map((message) => (
								<div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
									<div
										style={{ animation: 'robochat-message-in 220ms ease-out' }}
										className={cn(
											'text-sm shadow-[0_12px_30px_rgba(0,0,0,0.16)]',
											message.role === 'user'
												? 'bg-blue-600 text-white self-end rounded-2xl rounded-br-sm max-w-[85%] px-4 py-3'
												: message.kind === 'config'
													? 'bg-slate-100 text-slate-800 border border-slate-200 self-start rounded-2xl rounded-bl-sm w-full max-w-[95%] px-4 py-3 md:max-w-full'
													: 'bg-slate-100 text-slate-800 border border-slate-200 self-start rounded-2xl rounded-bl-sm w-full max-w-[95%] px-4 py-3 md:max-w-[96%]'
										)}
									>
										<div className={message.role === 'user' ? 'text-white' : 'text-slate-800'}>{renderMessageContent(message)}</div>
									</div>
								</div>
							))}

							{step === 'menu' ? (
								<div className="flex justify-start">
									<div className="w-full max-w-[95%] self-start rounded-2xl rounded-bl-sm border border-slate-200 bg-slate-100 p-4 text-slate-800 shadow-[0_12px_30px_rgba(0,0,0,0.16)] md:max-w-[96%]">
										<div className="grid gap-3">
											<p className="text-sm text-slate-700">ต้องการให้ผมช่วยคัดกรองหุ้นแบบไหนดีครับ?</p>
											<Button
												type="button"
												onClick={() => handleSelectMode('global')}
												className="h-auto justify-start rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-800 shadow-sm hover:bg-slate-50"
											>
												เปรียบเทียบหุ้นทั้งตลาด (Global Screen)
											</Button>
											<Button
												type="button"
												onClick={() => handleSelectMode('sector')}
												className="h-auto justify-start rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-800 shadow-sm hover:bg-slate-50"
											>
												เปรียบเทียบหุ้นรายอุตสาหกรรม (Best per Sector)
											</Button>
										</div>
									</div>
								</div>
							) : null}

							{isLoading ? (
								<div className="flex justify-start">
									<div className="inline-flex items-center gap-2 self-start rounded-2xl rounded-bl-sm border border-slate-200 bg-slate-100 px-4 py-3 text-sm text-slate-800">
										<Loader2 className="h-4 w-4 animate-spin" />
										RoboChat กำลังวิเคราะห์ข้อมูลให้คุณ...
									</div>
								</div>
							) : null}
						</div>
					</div>
					</div>
				</div>
			</>,
			document.body
		)
		: null;

	return (
		<>
			<style jsx global>{`
				@keyframes robochat-welcome-in {
					from {
						opacity: 0;
						transform: translateY(10px) scale(0.98);
					}
					to {
						opacity: 1;
						transform: translateY(0) scale(1);
					}
				}

				@keyframes robochat-welcome-float {
					0%,
					100% {
						transform: translateY(0);
					}
					50% {
						transform: translateY(-4px);
					}
				}

				@keyframes robochat-backdrop-in {
					from {
						opacity: 0;
					}
					to {
						opacity: 1;
					}
				}

				@keyframes robochat-backdrop-out {
					from {
						opacity: 1;
					}
					to {
						opacity: 0;
					}
				}

				@keyframes robochat-window-in {
					from {
						opacity: 0;
						transform: translateY(18px) scale(0.97);
					}
					to {
						opacity: 1;
						transform: translateY(0) scale(1);
					}
				}

				@keyframes robochat-window-out {
					from {
						opacity: 1;
						transform: translateY(0) scale(1);
					}
					to {
						opacity: 0;
						transform: translateY(12px) scale(0.985);
					}
				}

				@keyframes robochat-message-in {
					from {
						opacity: 0;
						transform: translateY(10px);
					}
					to {
						opacity: 1;
						transform: translateY(0);
					}
				}
			`}</style>

			<div className="relative z-[95]">
				{showWelcomeBubble ? (
					<div className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+5.6rem)] left-4 z-[96] w-64 md:bottom-[calc(env(safe-area-inset-bottom,0px)+5.85rem)] md:left-auto md:right-5">
						<div
							role="button"
							tabIndex={0}
							onClick={openChat}
							onKeyDown={(event) => {
								if (event.key === 'Enter' || event.key === ' ') {
									event.preventDefault();
									openChat();
								}
							}}
							className="relative cursor-pointer rounded-xl border border-blue-100 bg-white p-4 shadow-xl outline-none"
							style={{ animation: 'robochat-welcome-in 500ms ease-out forwards, robochat-welcome-float 3.2s ease-in-out 600ms infinite' }}
						>
							<button
								type="button"
								onClick={(event) => {
									event.stopPropagation();
									dismissWelcome();
								}}
								className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
								aria-label="Dismiss RoboChat welcome"
							>
								<X className="h-3.5 w-3.5" />
							</button>
							<p className="pr-6 text-sm font-semibold text-blue-600">ผู้ช่วยส่วนตัวของคุณ 🤖</p>
							<p className="mt-2 text-xs leading-6 text-slate-600">
								ให้ RoboAdvisor ช่วยวิเคราะห์สภาวะตลาด และคัดกรองหุ้นเด่นเข้าพอร์ตของคุณได้ที่นี่ครับ!
							</p>
							<div className="absolute -bottom-2 right-6 h-4 w-4 rotate-45 border-b border-r border-blue-100 bg-white" />
						</div>
					</div>
				) : null}

				<Button
					type="button"
					variant="ghost"
					onClick={toggleChat}
					className="fixed bottom-[calc(env(safe-area-inset-bottom,0px)+1rem)] left-4 z-[95] h-14 w-14 rounded-full border border-[#7db8ff]/25 bg-[linear-gradient(180deg,#1c2340_0%,#121726_100%)] text-[#d6e4ff] shadow-[0_16px_40px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.05)] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#3b82f6]/55 hover:bg-[#171d2e] hover:text-white md:bottom-[calc(env(safe-area-inset-bottom,0px)+1.25rem)] md:left-auto md:right-5"
					aria-expanded={open}
					aria-label={open ? 'Close RoboChat' : 'Open RoboChat'}
				>
					<Bot className="h-5 w-5" />
				</Button>
			</div>

			{floatingWindow}
		</>
	);
}