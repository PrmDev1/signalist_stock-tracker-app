"use client";

import React, { useMemo, useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { startPortfolioOptimization, getPortfolioOptimizationStatus, savePortfolioToDatabase } from '@/lib/actions/cloudflare.actions';
import {
  type FilteredStock,
  getFilteredStocksFromSession,
  setFilteredStocksInSession,
} from '@/lib/portfolio-filtered-stocks';
import ParameterPanel from '@/components/portfolio/optimizer/ParameterPanel';
import PreviewPanel from '@/components/portfolio/optimizer/PreviewPanel';
import ResultsPanel from '@/components/portfolio/optimizer/ResultsPanel';
import type {
  InvestmentHorizon,
  PortfolioResult,
  RebalancingFrequency,
  RiskTolerance,
} from '@/components/portfolio/optimizer/types';

export default function PortfolioOptimizer() {
  const router = useRouter();
  const [selectedStocks, setSelectedStocks] = useState<FilteredStock[]>([]);
  const [isSelectionReady, setIsSelectionReady] = useState(false);
  const [investmentAmount, setInvestmentAmount] = useState<number>(10000);
  const [investmentHorizon, setInvestmentHorizon] = useState<InvestmentHorizon>('medium');
  const [maxAllocationPerStock, setMaxAllocationPerStock] = useState<number>(35);
  const [returnPriority, setReturnPriority] = useState<number>(55);
  const [rebalancingFrequency, setRebalancingFrequency] = useState<RebalancingFrequency>('quarterly');
  const [brokerMinOrder, setBrokerMinOrder] = useState<number>(5);
  const [riskTolerance, setRiskTolerance] = useState<RiskTolerance>('medium');
  const optimizedRiskLevelRef = useRef<RiskTolerance>('medium');
  const [requireDiversification, setRequireDiversification] = useState<boolean>(true);
  const [modelName, setModelName] = useState<'mvo' | 'semi'>('mvo');
  const [portfolioName, setPortfolioName] = useState('My Optimized Portfolio');
  const [reqId, setReqId] = useState<string | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'PROCESSING' | 'READY' | 'FAILED'>('IDLE');
  const [result, setResult] = useState<PortfolioResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const canCreatePortfolio = selectedStocks.length >= 2;

  const lookbackYears = useMemo(() => {
    if (investmentHorizon === 'short') return 3;
    if (investmentHorizon === 'long') return 10;
    return 5;
  }, [investmentHorizon]);

  const canRunOptimization =
    canCreatePortfolio &&
    Number.isFinite(investmentAmount) &&
    investmentAmount > 0 &&
    Number.isFinite(maxAllocationPerStock) &&
    maxAllocationPerStock > 0 &&
    maxAllocationPerStock <= 100;

  useEffect(() => {
    const stocksFromFilter = getFilteredStocksFromSession();

    if (stocksFromFilter.length === 0) {
      router.replace('/portfolio/select-stocks');
      return;
    }

    setSelectedStocks(stocksFromFilter);
    setIsSelectionReady(true);
  }, [router]);

  const handleOptimize = async () => {
    if (selectedStocks.length === 0) {
      router.replace('/portfolio/select-stocks');
      return;
    }

    if (!canCreatePortfolio) {
      setErrorMsg('Please select at least 2 stocks before running optimization.');
      setStatus('FAILED');
      return;
    }

    if (!canRunOptimization) {
      setErrorMsg('Please review parameters before running optimization.');
      setStatus('FAILED');
      return;
    }

    setStatus('PROCESSING');
    setResult(null);
    setReqId(null);
    setErrorMsg(null);
    setModelUsed(null);
    setStatusMessage(`Preparing ${selectedStocks.length} assets • ${rebalancingFrequency} rebalance • max ${maxAllocationPerStock}% per stock`);

    const tickers = selectedStocks.map((stock) => stock.symbol.toUpperCase());
    const selectedRiskLevel = riskTolerance;
    optimizedRiskLevelRef.current = selectedRiskLevel;

    try {
      const response = await startPortfolioOptimization(
        tickers,
        lookbackYears,
        selectedRiskLevel,
        investmentAmount,
        brokerMinOrder,
        requireDiversification,
        modelName
      );

      if (!response.success) {
        setErrorMsg(response.error || 'Failed to start optimization');
        setStatus('FAILED');
        return;
      }

      setReqId(response.reqId || null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setErrorMsg('Error: Failed to start optimization. ' + errorMessage);
      setStatus('FAILED');
    }
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;

    const checkStatus = async () => {
      if (!reqId) return;

      try {
        const response = await getPortfolioOptimizationStatus(reqId, investmentAmount, brokerMinOrder);

        if (!response.success) {
          setErrorMsg('Error checking status: ' + response.error);
          setStatus('FAILED');
          return;
        }

        if (response.status === 'PORTFOLIO_READY' && response.portfolio) {
          setResult(response.portfolio);
          setModelUsed(response.modelUsed || null);
          setStatusMessage(response.message || null);
          setStatus('READY');
        } else if (response.status === 'FAILED') {
          setStatus('FAILED');
          setStatusMessage(response.message || 'Portfolio optimization failed');
          setErrorMsg(response.message || 'Portfolio optimization failed');
        } else if (response.status === 'PROCESSING') {
          setStatusMessage(response.message || 'Optimizing...');
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        setErrorMsg('Error checking status: ' + errorMessage);
      }
    };

    if (status === 'PROCESSING' && reqId) {
      interval = setInterval(checkStatus, 3000);
    }

    return () => clearInterval(interval);
  }, [reqId, status, investmentAmount, brokerMinOrder]);

  const handleResetParameters = () => {
    setInvestmentAmount(10000);
    setInvestmentHorizon('medium');
    setMaxAllocationPerStock(35);
    setReturnPriority(55);
    setRebalancingFrequency('quarterly');
    setBrokerMinOrder(5);
    setRiskTolerance('medium');
    setRequireDiversification(true);
    setModelName('mvo');
    setErrorMsg(null);
    setStatus('IDLE');
    setStatusMessage(null);
    setResult(null);
    setReqId(null);
  };

  const handleSavePortfolio = async () => {
    if (!result || selectedStocks.length === 0) return;

    if (!canCreatePortfolio) {
      setErrorMsg('Cannot create portfolio with fewer than 2 stocks. Please go back and select more stocks.');
      setStatus('FAILED');
      return;
    }

    setIsSaving(true);
    try {
      const tickers = Object.keys(result.allocations)
        .map((ticker) => ticker.trim().toUpperCase())
        .filter(Boolean);

      const response = await savePortfolioToDatabase(
        portfolioName,
        tickers,
        result.allocations,
        result.expectedReturn,
        result.volatility,
        optimizedRiskLevelRef.current,
        modelName
      );

      if (response.success) {
        setErrorMsg(null);
        router.push('/portfolio');
        setStatus('IDLE');
        setReqId(null);
        setResult(null);
        setModelUsed(null);
        setStatusMessage(null);
      } else {
        setErrorMsg('Failed to save portfolio: ' + response.error);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setErrorMsg('Error: Failed to save portfolio. ' + errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemoveStock = (symbol: string) => {
    const nextStocks = selectedStocks.filter((stock) => stock.symbol !== symbol);
    setSelectedStocks(nextStocks);
    setFilteredStocksInSession(nextStocks);

    if (nextStocks.length === 0) {
      router.replace('/portfolio/select-stocks');
      return;
    }

    if (nextStocks.length < 2) {
      setStatus('FAILED');
      setErrorMsg('At least 2 stocks are required to create and optimize a portfolio.');
    }
  };

  if (!isSelectionReady) {
    return <div className="min-h-screen flex items-center justify-center text-gray-300">Loading filtered stocks...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-900 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-7xl space-y-6 px-4 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-gray-700 bg-gray-800 p-5 sm:p-6">
          <button
            type="button"
            onClick={() => router.push('/portfolio/select-stocks')}
            className="mb-4 inline-flex items-center gap-1 rounded-lg border border-gray-600 bg-gray-700 px-3 py-1.5 text-sm text-gray-300 transition-colors hover:bg-gray-600"
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Stock Filter
          </button>
          <h1 className="text-3xl font-bold text-white sm:text-4xl">AI Portfolio Optimizer</h1>
          <p className="mt-2 text-sm text-gray-400 sm:text-base">
            Configure inputs, review selected assets, and generate an AI-optimized portfolio allocation.
          </p>
          <div className="mt-4 inline-flex items-center rounded-full border border-teal-400/30 bg-teal-400/10 px-3 py-1 text-xs font-medium text-teal-400 sm:text-sm">
            {selectedStocks.length} selected stock{selectedStocks.length !== 1 ? 's' : ''}
          </div>
        </section>

        {!canCreatePortfolio && (
          <section className="rounded-xl border border-yellow-400/40 bg-yellow-400/10 px-4 py-3 text-yellow-300">
            <p className="font-semibold">At least 2 stocks are required</p>
            <p className="text-sm">You currently have {selectedStocks.length} selected stock. Please add at least one more stock.</p>
          </section>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.45fr_1fr]">
          <ParameterPanel
            investmentAmount={investmentAmount}
            setInvestmentAmount={setInvestmentAmount}
            riskTolerance={riskTolerance}
            setRiskTolerance={setRiskTolerance}
            investmentHorizon={investmentHorizon}
            setInvestmentHorizon={setInvestmentHorizon}
            rebalancingFrequency={rebalancingFrequency}
            setRebalancingFrequency={setRebalancingFrequency}
            modelName={modelName}
            setModelName={setModelName}
            brokerMinOrder={brokerMinOrder}
            setBrokerMinOrder={setBrokerMinOrder}
            maxAllocationPerStock={maxAllocationPerStock}
            setMaxAllocationPerStock={setMaxAllocationPerStock}
            returnPriority={returnPriority}
            setReturnPriority={setReturnPriority}
            requireDiversification={requireDiversification}
            setRequireDiversification={setRequireDiversification}
            lookbackYears={lookbackYears}
            status={status}
            statusMessage={statusMessage}
            canRunOptimization={canRunOptimization}
            onOptimize={handleOptimize}
            onReset={handleResetParameters}
            onBack={() => router.push('/portfolio/select-stocks')}
          />

          <PreviewPanel
            selectedStocks={selectedStocks}
            riskTolerance={riskTolerance}
            investmentHorizon={investmentHorizon}
            returnPriority={returnPriority}
            rebalancingFrequency={rebalancingFrequency}
            maxAllocationPerStock={maxAllocationPerStock}
            onRemoveStock={handleRemoveStock}
          />
        </div>

        <ResultsPanel
          status={status}
          errorMsg={errorMsg}
          reqId={reqId}
          result={result}
          modelUsed={modelUsed}
          portfolioName={portfolioName}
          setPortfolioName={setPortfolioName}
          onSavePortfolio={handleSavePortfolio}
          isSaving={isSaving}
          canCreatePortfolio={canCreatePortfolio}
        />
      </div>
    </div>
  );
}
