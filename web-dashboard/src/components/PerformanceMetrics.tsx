'use client';

import React, { useState, useEffect } from 'react';

interface PerformanceMetrics {
  totalAlerts: number;
  bullishAlerts: number;
  bearishAlerts: number;
  winRate: string;
  profitFactor: string;
  avgDuration: string;
  totalProfit: string;
  totalLoss: string;
}

interface PerformanceData {
  success: boolean;
  period: string;
  symbol: string;
  metrics: PerformanceMetrics;
  breakdown: {
    alertTypes: Record<string, number>;
    symbolBreakdown: Record<string, number>;
  };
}

export default function PerformanceMetrics() {
  const [performanceData, setPerformanceData] = useState<PerformanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('30');
  const [selectedSymbol, setSelectedSymbol] = useState('all');

  useEffect(() => {
    fetchPerformanceMetrics();
  }, [selectedPeriod, selectedSymbol]);

  const fetchPerformanceMetrics = async () => {
    setIsLoading(true);
    try {
      const url = `${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://web-production-014c4.up.railway.app'}/performance-metrics?days=${selectedPeriod}&symbol=${selectedSymbol === 'all' ? '' : selectedSymbol}`;
      const response = await fetch(url);
      const data = await response.json();
      if (data.success) {
        setPerformanceData(data);
      }
    } catch (error) {
      console.error('Error fetching performance metrics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getWinRateColor = (winRate: string) => {
    const rate = parseFloat(winRate);
    if (rate >= 60) return 'text-green-400';
    if (rate >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getProfitFactorColor = (profitFactor: string) => {
    if (profitFactor === '∞') return 'text-green-400';
    const factor = parseFloat(profitFactor);
    if (factor >= 2) return 'text-green-400';
    if (factor >= 1) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
        <h3 className="text-white font-semibold mb-3">Performance Metrics</h3>
        <div className="text-xs text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!performanceData) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
        <h3 className="text-white font-semibold mb-3">Performance Metrics</h3>
        <div className="text-xs text-gray-400">No data available</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
          Performance Metrics
        </h3>
        <div className="flex items-center gap-2">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300"
          >
            <option value="7">7 Days</option>
            <option value="30">30 Days</option>
            <option value="90">90 Days</option>
          </select>
          <select
            value={selectedSymbol}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-gray-300"
          >
            <option value="all">All Symbols</option>
            <option value="XAUUSD">XAUUSD</option>
            <option value="EURUSD">EURUSD</option>
            <option value="BTCUSD">BTCUSD</option>
            <option value="NAS100">NAS100</option>
          </select>
        </div>
      </div>

      <div className="text-xs text-gray-500 mb-3">
        Period: {performanceData.period} | Symbol: {performanceData.symbol}
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-gray-800 rounded p-3 border border-gray-700">
          <div className="text-xs text-gray-400 mb-1">Win Rate</div>
          <div className={`text-xl font-bold ${getWinRateColor(performanceData.metrics.winRate)}`}>
            {performanceData.metrics.winRate}%
          </div>
        </div>
        <div className="bg-gray-800 rounded p-3 border border-gray-700">
          <div className="text-xs text-gray-400 mb-1">Profit Factor</div>
          <div className={`text-xl font-bold ${getProfitFactorColor(performanceData.metrics.profitFactor)}`}>
            {performanceData.metrics.profitFactor}
          </div>
        </div>
        <div className="bg-gray-800 rounded p-3 border border-gray-700">
          <div className="text-xs text-gray-400 mb-1">Total Alerts</div>
          <div className="text-xl font-bold text-blue-400">
            {performanceData.metrics.totalAlerts}
          </div>
        </div>
        <div className="bg-gray-800 rounded p-3 border border-gray-700">
          <div className="text-xs text-gray-400 mb-1">Avg Duration</div>
          <div className="text-xl font-bold text-purple-400">
            {performanceData.metrics.avgDuration}h
          </div>
        </div>
      </div>

      {/* Detailed Metrics */}
      <div className="space-y-2 mb-4">
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Bullish Alerts:</span>
          <span className="text-green-400">{performanceData.metrics.bullishAlerts}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Bearish Alerts:</span>
          <span className="text-red-400">{performanceData.metrics.bearishAlerts}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Total Profit:</span>
          <span className="text-green-400">${performanceData.metrics.totalProfit}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-gray-400">Total Loss:</span>
          <span className="text-red-400">${performanceData.metrics.totalLoss}</span>
        </div>
      </div>

      {/* Alert Types Breakdown */}
      {Object.keys(performanceData.breakdown.alertTypes).length > 0 && (
        <div className="border-t border-gray-700 pt-3">
          <div className="text-xs text-gray-400 mb-2">Alert Types</div>
          <div className="space-y-1">
            {Object.entries(performanceData.breakdown.alertTypes).map(([type, count]) => (
              <div key={type} className="flex justify-between text-xs">
                <span className="text-gray-300">{type}</span>
                <span className="text-blue-400">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Symbol Breakdown */}
      {Object.keys(performanceData.breakdown.symbolBreakdown).length > 1 && (
        <div className="border-t border-gray-700 pt-3 mt-3">
          <div className="text-xs text-gray-400 mb-2">Symbol Breakdown</div>
          <div className="space-y-1">
            {Object.entries(performanceData.breakdown.symbolBreakdown).map(([symbol, count]) => (
              <div key={symbol} className="flex justify-between text-xs">
                <span className="text-gray-300">{symbol}</span>
                <span className="text-purple-400">{count}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
