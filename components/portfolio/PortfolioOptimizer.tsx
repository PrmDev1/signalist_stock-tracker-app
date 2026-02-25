"use client";

import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { startPortfolioOptimization, getPortfolioOptimizationStatus, savePortfolioToDatabase } from "@/lib/actions/cloudflare.actions";

// --- Types สำหรับ TypeScript ---
interface PortfolioResult {
  allocations: Record<string, { weight: number; allocatedAmount: number }>;
  expectedReturn: number;
  volatility: number;
}

interface ChartData {
  name: string;
  value: number;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#FF6666"];

export default function PortfolioOptimizer() {
  const [tickersInput, setTickersInput] = useState("AAPL, MSFT, GOOGL");
  const [capital, setCapital] = useState<number>(10000);
  const [lookbackYears, setLookbackYears] = useState<number>(3);
  const [brokerMinOrder, setBrokerMinOrder] = useState<number>(5);
  const [riskLevel, setRiskLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [requireDiversification, setRequireDiversification] = useState<boolean>(true);
  const [modelName, setModelName] = useState<'mvo' | 'semi'>('mvo');
  const [portfolioName, setPortfolioName] = useState("My Optimized Portfolio");
  const [reqId, setReqId] = useState<string | null>(null);
  const [status, setStatus] = useState<"IDLE" | "PROCESSING" | "READY" | "FAILED">("IDLE");
  const [result, setResult] = useState<PortfolioResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [modelUsed, setModelUsed] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Load selected stocks from sessionStorage on mount
  useEffect(() => {
    const selectedStocks = sessionStorage.getItem('selectedStocks');
    if (selectedStocks) {
      try {
        const tickers = JSON.parse(selectedStocks) as string[];
        if (Array.isArray(tickers) && tickers.length > 0) {
          setTickersInput(tickers.join(', '));
          // Clear the sessionStorage after loading
          sessionStorage.removeItem('selectedStocks');
        }
      } catch (error) {
        console.error('Failed to parse selected stocks', error);
      }
    }
  }, []);

  // 1. ฟังก์ชันส่งคำขอจัดพอร์ต (ใช้ Server Action)
  const handleOptimize = async () => {
    setStatus("PROCESSING");
    setResult(null);
    setReqId(null);
    setErrorMsg(null);
    setModelUsed(null);
    setStatusMessage(null);

    const tickers = tickersInput.split(",").map((t) => t.trim().toUpperCase());

    try {
      // เรียก Server Action เพื่อเริ่ม optimization
      const response = await startPortfolioOptimization(
        tickers,
        lookbackYears,
        riskLevel,
        capital,
        brokerMinOrder,
        requireDiversification,
        modelName
      );

      if (!response.success) {
        setErrorMsg(response.error || "Failed to start optimization");
        setStatus("FAILED");
        return;
      }

      // ได้ reqId มาแล้ว ทำให้ useEffect เริ่มทำ polling
      setReqId(response.reqId || null);
    } catch (error) {
      console.error("Failed to start optimization", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setErrorMsg("Error: Failed to start optimization. " + errorMessage);
      setStatus("FAILED");
    }
  };

  // 2. ฟังก์ชันติดตามสถานะ (ใช้ Server Action) จะทำงานอัตโนมัติเมื่อ status = PROCESSING
  useEffect(() => {
    let interval: NodeJS.Timeout;

    const checkStatus = async () => {
      if (!reqId) return;

      try {
        // เรียก Server Action เพื่อ check status
        const response = await getPortfolioOptimizationStatus(reqId, capital, brokerMinOrder);

        if (!response.success) {
          console.error("Error checking status:", response.error);
          setErrorMsg("Error checking status: " + response.error);
          setStatus("FAILED");
          return;
        }

        if (response.status === "PORTFOLIO_READY" && response.portfolio) {
          setResult(response.portfolio);
          setModelUsed(response.modelUsed || null);
          setStatusMessage(response.message || null);
          setStatus("READY");
        } else if (response.status === "FAILED") {
          setStatus("FAILED");
          setStatusMessage(response.message || "Portfolio optimization failed");
          setErrorMsg(response.message || "Portfolio optimization failed");
        } else if (response.status === "PROCESSING") {
          setStatusMessage(response.message || "Optimizing...");
        }
        // ถ้าเป็น PROCESSING ก็ปล่อยให้มันวนลูปเช็คต่อไป
      } catch (error) {
        console.error("Error checking status", error);
        const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
        setErrorMsg("Error checking status: " + errorMessage);
      }
    };

    if (status === "PROCESSING" && reqId) {
      // ตั้งเวลาเช็คทุกๆ 3 วินาที (3000 ms)
      interval = setInterval(checkStatus, 3000);
    }

    return () => clearInterval(interval); // ล้าง interval เมื่อ Component ถูกทำลายหรือสถานะเปลี่ยน
  }, [reqId, status, capital, brokerMinOrder]);

  // 3. ฟังก์ชันบันทึก Portfolio ลงฐานข้อมูล
  const handleSavePortfolio = async () => {
    if (!result) return;

    setIsSaving(true);
    try {
      const tickers = tickersInput.split(",").map((t) => t.trim().toUpperCase());
      
      const response = await savePortfolioToDatabase(
        portfolioName,
        tickers,
        result.allocations,
        result.expectedReturn,
        result.volatility
      );

      if (response.success) {
        setErrorMsg(null);
        alert("Portfolio saved successfully!");
        // รีเซ็ต form
        setStatus("IDLE");
        setReqId(null);
        setResult(null);
        setTickersInput("AAPL, MSFT, GOOGL");
        setModelUsed(null);
        setStatusMessage(null);
      } else {
        setErrorMsg("Failed to save portfolio: " + response.error);
      }
    } catch (error) {
      console.error("Error saving portfolio", error);
      const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
      setErrorMsg("Error: Failed to save portfolio. " + errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  // 4. แปลงข้อมูล Object { AAPL: 50000 } ให้เป็น Array ของ Recharts
  const formatChartData = (allocations: Record<string, { weight: number; allocatedAmount: number }>): ChartData[] => {
    return Object.keys(allocations).map((ticker) => ({
      name: ticker,
      value: allocations[ticker].allocatedAmount, // จำนวนเงินที่ Backend คำนวณมาให้
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-purple-800 py-12">
      <div className="p-8 max-w-4xl mx-auto font-sans bg-white/5 backdrop-blur-md rounded-xl shadow-xl border border-white/10">
        <h1 className="text-4xl font-extrabold mb-6 text-white">AI Portfolio Optimizer</h1>

      {/* ฟอร์มกรอกข้อมูล */}
      <div className="bg-white/6 p-6 rounded-xl mb-8 shadow-lg border border-white/10 backdrop-blur-sm">
        {/* Row 1: Tickers, Lookback Years, Risk Level, Model */}
        <div className="grid grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-white/90">Tickers (comma separated)</label>
            <input
              type="text"
              value={tickersInput}
              onChange={(e) => setTickersInput(e.target.value)}
              className="w-full border p-2 rounded bg-white/10 text-white placeholder-white/60 border-white/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-white/90">Lookback Years</label>
            <input
              type="number"
              min="3"
              max="20"
              value={lookbackYears}
              onChange={(e) => setLookbackYears(Number(e.target.value))}
              className="w-full border p-2 rounded bg-white/10 text-white placeholder-white/60 border-white/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-white/90">Risk Level</label>
            <select
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value as 'low' | 'medium' | 'high')}
              className="w-full border p-2 rounded bg-white/10 text-white placeholder-white/60 border-white/20"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-white/90">Optimization Model</label>
            <select
              value={modelName}
              onChange={(e) => setModelName(e.target.value as 'mvo' | 'semi')}
              className="w-full border p-2 rounded bg-white/10 text-white placeholder-white/60 border-white/20"
            >
              <option value="mvo">MVO (Mean-Variance)</option>
              <option value="semi">Semi-Variance</option>
            </select>
          </div>
        </div>

        {/* Row 2: Initial Capital, Broker Min Order, Diversification */}
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-white/90">Initial Capital (USD)</label>
            <input
              type="number"
              value={capital}
              onChange={(e) => setCapital(Number(e.target.value))}
              className="w-full border p-2 rounded bg-white/10 text-white placeholder-white/60 border-white/20"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-white/90">Broker Min. Order (USD)</label>
            <input
              type="number"
              step="0.01"
              value={brokerMinOrder}
              onChange={(e) => setBrokerMinOrder(Number(e.target.value))}
              className="w-full border p-2 rounded bg-white/10 text-white placeholder-white/60 border-white/20"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center text-white/90 cursor-pointer">
              <input
                type="checkbox"
                checked={requireDiversification}
                onChange={(e) => setRequireDiversification(e.target.checked)}
                className="mr-2 w-4 h-4"
              />
              <span className="text-sm">Require Diversification</span>
            </label>
          </div>
        </div>

        <button
          onClick={handleOptimize}
          disabled={status === "PROCESSING"}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:bg-blue-300"
        >
          {status === "PROCESSING" ? "🚀 Optimizing..." : "🚀 Optimize Portfolio"}
        </button>
      </div>

      {/* แสดงข้อความ Error */}
      {status === "FAILED" && errorMsg && (
        <div className="bg-red-600/20 border border-red-400/30 text-red-200 px-4 py-3 rounded mb-8">
          <p className="font-semibold">Error</p>
          <p className="text-sm">{errorMsg}</p>
        </div>
      )}

      {/* แสดงสถานะกำลังคำนวณ */}
      {status === "PROCESSING" && (
        <div className="text-center p-8 animate-pulse text-white">
          <p className="text-xl font-semibold">� Quant Engine is crunching numbers...</p>
          <p className="text-sm text-white/80 mt-2">{statusMessage || "Processing..."}</p>
          {reqId && (
            <p className="text-xs text-white/60 mt-2 font-mono break-all">
              Full ID: {reqId}
            </p>
          )}
        </div>
      )}

      {/* แสดงผลลัพธ์กราฟและสถิติ */}
      {status === "READY" && result && (
        <div className="bg-white/6 border rounded-xl p-6 shadow-2xl border-white/10">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-2xl font-bold mb-4">Optimization Results</h2>
              {modelUsed && (
                <p className="text-sm text-gray-400">Model: <span className="text-white font-semibold">{modelUsed.toUpperCase()}</span></p>
              )}
              {statusMessage && (
                <p className="text-sm text-gray-300 mt-2">💬 {statusMessage}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 mb-8 bg-blue-50 p-4 rounded text-center">
            <div>
              <p className="text-sm text-gray-500">Expected Annual Return</p>
              <p className="text-2xl font-bold text-green-600">
                {(result.expectedReturn * 100).toFixed(2)}%
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Volatility (Risk)</p>
              <p className="text-2xl font-bold text-red-500">
                {(result.volatility * 100).toFixed(2)}%
              </p>
            </div>
          </div>

          <h3 className="text-xl font-semibold text-center mb-4">
            Capital Allocation (USD)
          </h3>
            <div className="h-80 w-full rounded-lg overflow-hidden bg-gradient-to-br from-white/3 to-white/5 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={formatChartData(result.allocations)}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${percent ? (percent * 100).toFixed(0) : 0}%`
                  }
                >
                  {formatChartData(result.allocations).map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                {/* Custom Tooltip เพื่อแสดงสัญลักษณ์ $ เวลาเอาเมาส์ชี้ */}
                <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Allocation details: weight and allocatedAmount */}
          <div className="mt-6">
            <h4 className="text-lg font-medium mb-3 text-white">Allocation Details</h4>
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="px-3 py-2 text-sm text-white/80 uppercase tracking-wider">Ticker</th>
                    <th className="px-3 py-2 text-sm text-white/80 uppercase tracking-wider">Weight</th>
                    <th className="px-3 py-2 text-sm text-white/80 uppercase tracking-wider">Allocated Amount (USD)</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.keys(result.allocations).map((ticker) => (
                    <tr key={ticker} className="border-b border-white/6">
                      <td className="px-3 py-2 font-medium text-white">{ticker}</td>
                      <td className="px-3 py-2 text-white/90">{(result.allocations[ticker].weight * 100).toFixed(2)}%</td>
                      <td className="px-3 py-2 text-white/90">${result.allocations[ticker].allocatedAmount.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Save Portfolio Section */}
          <div className="mt-8 pt-6 border-t">
            <h3 className="text-lg font-semibold mb-4">Save Portfolio</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-white/90">Portfolio Name</label>
                <input
                  type="text"
                  value={portfolioName}
                  onChange={(e) => setPortfolioName(e.target.value)}
                  placeholder="e.g., My Optimized Portfolio"
                  className="w-full border p-2 rounded bg-white/10 text-white placeholder-white/60 border-white/20"
                />
              </div>
            </div>
            <button
              onClick={handleSavePortfolio}
              disabled={isSaving}
              className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 disabled:bg-green-300"
            >
              {isSaving ? "Saving..." : "Save Portfolio"}
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
  );
}
