'use client';

import React, { useState, useEffect } from 'react';

interface ScanResult {
  symbol: string;
  enabled: boolean;
  currentPrice: number;
  priceChange: string;
  trend: string;
  nearOBZone: boolean;
  obZoneCount: number;
  signal: string;
}

export default function MarketScanner() {
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<string | null>(null);

  const runMarketScan = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/market-scan');
      const data = await response.json();
      if (data.success) {
        setScanResults(data.results);
        setLastScanTime(data.timestamp);
      }
    } catch (error) {
      console.error('Error running market scan:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    runMarketScan();
    const interval = setInterval(runMarketScan, 300000); // Scan every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const getSignalColor = (signal: string) => {
    switch (signal) {
      case 'STRONG BUY': return 'text-green-400 bg-green-900/30 border-green-700';
      case 'BUY': return 'text-green-300 bg-green-800/30 border-green-600';
      case 'STRONG SELL': return 'text-red-400 bg-red-900/30 border-red-700';
      case 'SELL': return 'text-red-300 bg-red-800/30 border-red-600';
      case 'WATCH': return 'text-yellow-400 bg-yellow-900/30 border-yellow-700';
      default: return 'text-gray-400 bg-gray-800/30 border-gray-600';
    }
  };

  const getTrendIcon = (trend: string) => {
    return trend === 'bullish' ? '📈' : '📉';
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          Market Scanner
        </h3>
        <button
          onClick={runMarketScan}
          disabled={isLoading}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-xs transition-colors"
        >
          {isLoading ? 'Scanning...' : 'Scan Now'}
        </button>
      </div>

      {lastScanTime && (
        <div className="text-xs text-gray-500 mb-3">
          Last scan: {new Date(lastScanTime).toLocaleTimeString()}
        </div>
      )}

      <div className="space-y-2">
        {scanResults.map((result) => (
          <div 
            key={result.symbol} 
            className={`bg-gray-800 rounded p-3 border ${result.enabled ? 'border-gray-700' : 'border-gray-800 opacity-60'}`}
          >
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-gray-300">{result.symbol}</span>
                  <span className="text-lg">{getTrendIcon(result.trend)}</span>
                </div>
                <div className="text-xs text-gray-400">
                  ${result.currentPrice?.toFixed(2) || 'N/A'}
                  <span className={`ml-2 ${parseFloat(result.priceChange || '0') >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {parseFloat(result.priceChange || '0') >= 0 ? '+' : ''}{result.priceChange || '0'}%
                  </span>
                </div>
              </div>
              <div className={`px-2 py-1 rounded text-xs font-semibold border ${getSignalColor(result.signal)}`}>
                {result.signal}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-gray-400">
                Trend: <span className={result.trend === 'bullish' ? 'text-green-400' : 'text-red-400'}>
                  {result.trend.toUpperCase()}
                </span>
              </div>
              <div className="text-gray-400">
                OB Zones: <span className="text-blue-400">{result.obZoneCount}</span>
              </div>
              {result.nearOBZone && (
                <div className="col-span-2 text-yellow-400 flex items-center gap-1">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  Near OB Zone
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {scanResults.length === 0 && !isLoading && (
        <div className="text-xs text-gray-500 text-center py-4">
          No scan results available
        </div>
      )}
    </div>
  );
}
