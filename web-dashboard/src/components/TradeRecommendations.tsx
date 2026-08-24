'use client';

import React, { useState, useEffect } from 'react';

interface TradeRecommendation {
  symbol: string;
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reason: string;
  entryPrice: number | null;
  stopLoss: number | null;
  takeProfit: number | null;
  orderType: 'MARKET' | 'BUY_LIMIT' | 'SELL_LIMIT' | 'BUY_STOP' | 'SELL_STOP' | 'NONE';
  riskRewardRatio: number;
  currentPrice: number;
  indicators: {
    rsi: number;
    atr: number;
    emaShort: number;
    emaMedium: number;
    emaLong: number;
    support: number;
    resistance: number;
    pivot: number;
  };
  marketStructure: {
    trend: string;
    strength: number;
  };
}

interface TradeRecommendationsProps {
  symbol?: string;
  multiSymbol?: boolean;
  timeframe?: string;
  activeSymbol?: string;
}

export default function TradeRecommendations({ symbol = 'XAUUSD', multiSymbol = false, timeframe = '15', activeSymbol = 'XAUUSD' }: TradeRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<TradeRecommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = async () => {
    setIsLoading(true);
    setError(null);
    try {
      let url;
      if (multiSymbol) {
        url = `${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://web-production-014c4.up.railway.app'}/trade-recommendations?symbols=XAUUSD,EURUSD,BTCUSD,NAS100&timeframe=${timeframe}&activeSymbol=${activeSymbol}`;
      } else {
        url = `${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://web-production-014c4.up.railway.app'}/trade-recommendation?symbol=${symbol}&timeframe=${timeframe}`;
      }
      
      const response = await fetch(url);
      if (!response.ok) {
        if (response.status === 404) {
          setError('No market data available - market may be closed');
          return;
        }
        throw new Error(`HTTP ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        if (multiSymbol) {
          setRecommendations(data.recommendations);
        } else {
          setRecommendations([data.recommendation]);
        }
      } else {
        setError(data.message || 'Failed to fetch recommendations');
      }
    } catch (err) {
      setError('Failed to connect to trade recommendation service');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
    const interval = setInterval(fetchRecommendations, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [symbol, multiSymbol, timeframe, activeSymbol]);

  const getRecommendationColor = (rec: string) => {
    switch (rec) {
      case 'BUY': return 'text-green-400 bg-green-900/30 border-green-700';
      case 'SELL': return 'text-red-400 bg-red-900/30 border-red-700';
      case 'HOLD': return 'text-yellow-400 bg-yellow-900/30 border-yellow-700';
      default: return 'text-gray-400 bg-gray-900/30 border-gray-700';
    }
  };

  const getOrderTypeColor = (orderType: string) => {
    switch (orderType) {
      case 'BUY_LIMIT': return 'text-blue-400';
      case 'SELL_LIMIT': return 'text-purple-400';
      case 'BUY_STOP': return 'text-cyan-400';
      case 'SELL_STOP': return 'text-orange-400';
      case 'MARKET': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 80) return 'text-green-400';
    if (confidence >= 60) return 'text-yellow-400';
    if (confidence >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Trade Recommendations</h3>
        <div className="text-xs text-gray-500 text-center py-4">Loading recommendations...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Trade Recommendations</h3>
        <div className="text-xs text-red-400 text-center py-4">{error}</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
      <h3 className="text-sm font-semibold text-gray-300 mb-3">
        {multiSymbol ? `Multi-Symbol Trade Recommendations (${timeframe} timeframe)` : `Trade Recommendations - ${symbol} (${timeframe} timeframe)`}
      </h3>
      
      <div className="space-y-3">
        {recommendations.map((rec, index) => (
          <div key={`${rec.symbol}-${index}`} className="bg-gray-800 rounded p-3 border border-gray-700">
            <div className="flex justify-between items-start mb-2">
              <div>
                <span className="text-sm font-bold text-white">{rec.symbol}</span>
                <span className={`ml-2 px-2 py-0.5 rounded text-xs font-semibold border ${getRecommendationColor(rec.recommendation)}`}>
                  {rec.recommendation}
                </span>
              </div>
              <div className={`text-sm font-semibold ${getConfidenceColor(rec.confidence)}`}>
                {rec.confidence}% confidence
              </div>
            </div>

            <div className="text-xs text-gray-400 mb-2">{rec.reason}</div>

            <div className="grid grid-cols-2 gap-2 mb-2">
              <div className="bg-gray-900 rounded p-2">
                <div className="text-xs text-gray-500">Order Type</div>
                <div className={`text-sm font-semibold ${getOrderTypeColor(rec.orderType)}`}>
                  {rec.orderType}
                </div>
              </div>
              <div className="bg-gray-900 rounded p-2">
                <div className="text-xs text-gray-500">Risk/Reward</div>
                <div className="text-sm font-semibold text-white">
                  {rec.riskRewardRatio > 0 ? `1:${rec.riskRewardRatio.toFixed(1)}` : 'N/A'}
                </div>
              </div>
            </div>

            {rec.orderType !== 'NONE' && (
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div className="bg-gray-900 rounded p-2">
                  <div className="text-xs text-gray-500">Entry</div>
                  <div className="text-sm font-semibold text-white">
                    {rec.entryPrice ? rec.entryPrice.toFixed(2) : 'N/A'}
                  </div>
                </div>
                <div className="bg-gray-900 rounded p-2">
                  <div className="text-xs text-gray-500">Stop Loss</div>
                  <div className="text-sm font-semibold text-red-400">
                    {rec.stopLoss ? rec.stopLoss.toFixed(2) : 'N/A'}
                  </div>
                </div>
                <div className="bg-gray-900 rounded p-2">
                  <div className="text-xs text-gray-500">Take Profit</div>
                  <div className="text-sm font-semibold text-green-400">
                    {rec.takeProfit ? rec.takeProfit.toFixed(2) : 'N/A'}
                  </div>
                </div>
              </div>
            )}

            <div className="text-xs text-gray-500 mb-1">
              Current Price: <span className="text-white">{rec.currentPrice.toFixed(2)}</span>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <span className="text-gray-500">RSI:</span>{' '}
                <span className={rec.indicators.rsi < 30 ? 'text-green-400' : rec.indicators.rsi > 70 ? 'text-red-400' : 'text-white'}>
                  {rec.indicators.rsi.toFixed(1)}
                </span>
              </div>
              <div>
                <span className="text-gray-500">ATR:</span>{' '}
                <span className="text-white">{rec.indicators.atr.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-500">Trend:</span>{' '}
                <span className={rec.marketStructure.trend.includes('BULLISH') ? 'text-green-400' : rec.marketStructure.trend.includes('BEARISH') ? 'text-red-400' : 'text-yellow-400'}>
                  {rec.marketStructure.trend}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs mt-1">
              <div>
                <span className="text-gray-500">EMA Short:</span>{' '}
                <span className="text-cyan-400">{rec.indicators.emaShort.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-500">EMA Medium:</span>{' '}
                <span className="text-purple-400">{rec.indicators.emaMedium.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-500">EMA Long:</span>{' '}
                <span className="text-pink-400">{rec.indicators.emaLong.toFixed(2)}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 text-xs mt-1">
              <div>
                <span className="text-gray-500">Support:</span>{' '}
                <span className="text-blue-400">{rec.indicators.support.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-500">Pivot:</span>{' '}
                <span className="text-purple-400">{rec.indicators.pivot.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-gray-500">Resistance:</span>{' '}
                <span className="text-orange-400">{rec.indicators.resistance.toFixed(2)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
