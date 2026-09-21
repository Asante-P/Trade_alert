'use client';

import React, { useState, useEffect } from 'react';
import TradingViewChart from '@/components/TradingViewChart';

export default function TradingViewPage() {
  const [symbol, setSymbol] = useState('XAUUSD');
  const [timeframe, setTimeframe] = useState('15');
  const [keyLevels, setKeyLevels] = useState({
    pdh: null as number | null,
    pdl: null as number | null,
    pwh: null as number | null,
    pwl: null as number | null,
  });

  const symbols = ['XAUUSD', 'EURUSD', 'BTCUSD', 'NAS100', 'GBPUSD', 'USDJPY', 'ETHUSD', 'SPX500'];

  // Fetch key levels when symbol changes
  useEffect(() => {
    const fetchKeyLevels = async () => {
      try {
        console.log('Fetching key levels for symbol:', symbol);
        const response = await fetch(`/api/market-data/${symbol}?interval=15min&limit=700`);
        const data = await response.json();
        
        console.log('Market data response:', data);
        
        if (data.success && data.data && data.data.length > 0) {
          const candles = data.data;
          
          // Previous Day High/Low (last 96 candles = 24 hours for 15m)
          const lastDay = candles.slice(-96);
          const pdh = Math.max(...lastDay.map((c: any) => c.high));
          const pdl = Math.min(...lastDay.map((c: any) => c.low));
          
          // Previous Week High/Low (last 672 candles = 7 days for 15m)
          const lastWeek = candles.slice(-672);
          const pwh = Math.max(...lastWeek.map((c: any) => c.high));
          const pwl = Math.min(...lastWeek.map((c: any) => c.low));
          
          console.log('Key levels calculated:', { pdh, pdl, pwh, pwl });
          setKeyLevels({ pdh, pdl, pwh, pwl });
        } else {
          console.error('Failed to fetch market data:', data);
          setKeyLevels({ pdh: null, pdl: null, pwh: null, pwl: null });
        }
      } catch (error) {
        console.error('Error fetching key levels:', error);
        setKeyLevels({ pdh: null, pdl: null, pwh: null, pwl: null });
      }
    };

    fetchKeyLevels();
  }, [symbol]);

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-white">TradingView Chart</h1>
            <span className="text-xs text-gray-400">Full Trading Tools Enabled</span>
          </div>

          <div className="flex items-center gap-3">
            {/* Symbol Selector */}
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {symbols.map((sym) => (
                <option key={sym} value={sym}>
                  {sym}
                </option>
              ))}
            </select>

            {/* Current Timeframe Display */}
            <div className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-gray-400">
              Timeframe: <span className="text-white font-semibold">{timeframe}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Key Levels Panel */}
      <div className="px-4 py-3 bg-gray-900 border-b border-gray-800">
        <div className="flex flex-wrap items-center gap-4">
          <div className="text-sm font-semibold text-white">Key Levels:</div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">PDH:</span>
            <span className="text-sm font-bold text-green-400">
              {keyLevels.pdh ? keyLevels.pdh.toFixed(2) : 'Loading...'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">PDL:</span>
            <span className="text-sm font-bold text-red-400">
              {keyLevels.pdl ? keyLevels.pdl.toFixed(2) : 'Loading...'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">PWH:</span>
            <span className="text-sm font-bold text-blue-400">
              {keyLevels.pwh ? keyLevels.pwh.toFixed(2) : 'Loading...'}
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400">PWL:</span>
            <span className="text-sm font-bold text-purple-400">
              {keyLevels.pwl ? keyLevels.pwl.toFixed(2) : 'Loading...'}
            </span>
          </div>

          <span className="text-xs text-gray-500 ml-2">| Use Horizontal Line tool to draw these on chart</span>
        </div>
      </div>

      {/* Chart Container */}
      <div className="p-4">
        <TradingViewChart
          symbol={symbol}
          height={650}
          onSymbolChange={setSymbol}
          onTimeframeChange={setTimeframe}
        />
      </div>

      {/* Features Info */}
      <div className="px-4 pb-4">
        <div className="bg-gray-900 rounded-lg border border-gray-800 p-4">
          <h2 className="text-white font-semibold mb-3">Available Features</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="text-gray-400">
              <div className="text-green-400 font-semibold mb-1">Drawing Tools</div>
              <ul className="space-y-1 text-xs">
                <li>• Trend Lines</li>
                <li>• Horizontal Lines</li>
                <li>• Fibonacci Tools</li>
                <li>• Support/Resistance</li>
                <li>• Pitchfork</li>
                <li>• Rectangles</li>
              </ul>
            </div>
            <div className="text-gray-400">
              <div className="text-blue-400 font-semibold mb-1">Indicators</div>
              <ul className="space-y-1 text-xs">
                <li>• Add from toolbar as needed</li>
                <li>• Moving Average (MA)</li>
                <li>• Exponential MA (EMA)</li>
                <li>• RSI</li>
                <li>• MACD</li>
                <li>• Bollinger Bands</li>
                <li>• + 100 more</li>
              </ul>
            </div>
            <div className="text-gray-400">
              <div className="text-purple-400 font-semibold mb-1">Chart Tools</div>
              <ul className="space-y-1 text-xs">
                <li>• Multiple Timeframes</li>
                <li>• Chart Types</li>
                <li>• Zoom & Pan</li>
                <li>• Screenshot</li>
                <li>• Save Layouts</li>
                <li>• Compare Symbols</li>
              </ul>
            </div>
            <div className="text-gray-400">
              <div className="text-yellow-400 font-semibold mb-1">Analysis</div>
              <ul className="space-y-1 text-xs">
                <li>• Volume Analysis</li>
                <li>• Pattern Recognition</li>
                <li>• Alert System</li>
                <li>• News Feed</li>
                <li>• Economic Calendar</li>
                <li>• Social Sentiment</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
