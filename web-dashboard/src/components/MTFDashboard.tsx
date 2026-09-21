'use client';

import { useState, useEffect } from 'react';
import { useMarketData } from '@/hooks';
import { getTrendColor, getTrendBg } from '@/lib/utils';
import { config } from '@/lib/config';
import type { TrendBias, MarketCandle } from '@/types';

interface MTFDashboardProps {
  timeframes?: string[];
  weights?: number[];
  symbol?: string;
}

// Map timeframe to API interval
function getIntervalForTimeframe(timeframe: string): string {
  return config.marketData.intervals[timeframe as keyof typeof config.marketData.intervals] || '1h';
}

// Enhanced bias calculation using multiple EMAs
function calculateEnhancedBias(data: MarketCandle[]): 'Bullish' | 'Bearish' | 'Neutral' {
  if (data.length < 20) {
    return 'Neutral';
  }
  
  const closes = data.map((d) => d.close);
  
  // Use multiple EMAs like professional indicators (EMA 9, EMA 21, EMA 50)
  const ema9 = closes.length >= 9 ? closes.slice(-9).reduce((a, b) => a + b, 0) / 9 : closes[closes.length - 1];
  const ema21 = closes.length >= 21 ? closes.slice(-21).reduce((a, b) => a + b, 0) / 21 : closes[closes.length - 1];
  const ema50 = closes.length >= 50 ? closes.slice(-50).reduce((a, b) => a + b, 0) / 50 : closes[closes.length - 1];
  
  const lastClose = closes[closes.length - 1];
  
  // Bullish conditions: price above EMAs and EMAs in correct order
  const priceAboveShortEMA = lastClose > ema9;
  const priceAboveMediumEMA = lastClose > ema21;
  const priceAboveLongEMA = lastClose > ema50;
  const emaBullishAlignment = ema9 > ema21 && ema21 > ema50;
  
  // Bearish conditions: price below EMAs and EMAs in correct order
  const priceBelowShortEMA = lastClose < ema9;
  const priceBelowMediumEMA = lastClose < ema21;
  const priceBelowLongEMA = lastClose < ema50;
  const emaBearishAlignment = ema9 < ema21 && ema21 < ema50;
  
  // Determine bias
  if (priceAboveShortEMA && priceAboveMediumEMA && priceAboveLongEMA && emaBullishAlignment) {
    return 'Bullish';
  }
  
  if (priceBelowShortEMA && priceBelowMediumEMA && priceBelowLongEMA && emaBearishAlignment) {
    return 'Bearish';
  }
  
  if (priceAboveShortEMA && priceAboveMediumEMA) {
    return 'Bullish';
  }
  
  if (priceBelowShortEMA && priceBelowMediumEMA) {
    return 'Bearish';
  }
  
  return 'Neutral';
}

export default function MTFDashboard({ 
  timeframes = config.mtf.defaultTimeframes,
  weights = config.mtf.defaultWeights,
  symbol = 'XAUUSD'
}: MTFDashboardProps) {
  // Fetch market data for the primary timeframe only (1H by default)
  const primaryTimeframe = timeframes[0];
  const interval = getIntervalForTimeframe(primaryTimeframe);
  const { data: primaryData, loading: primaryLoading, error: primaryError } = useMarketData({
    symbol,
    interval,
    limit: config.marketData.defaultLimit,
    refreshInterval: config.mtf.refreshInterval,
    enabled: true
  });

  // Calculate trends based on primary data (simplified approach)
  const [trends, setTrends] = useState<TrendBias[]>(
    timeframes.map((tf, i) => ({
      timeframe: tf,
      bias: 'Neutral',
      weight: weights[i]
    }))
  );
  
  const [overallBias, setOverallBias] = useState<'Bullish' | 'Bearish' | 'Neutral'>('Neutral');

  useEffect(() => {
    if (primaryData && primaryData.length > 20) {
      const bias = calculateEnhancedBias(primaryData);
      
      // Update all timeframes with the same bias (simplified for demo)
      const newTrends = timeframes.map((tf, i) => ({
        timeframe: tf,
        bias,
        weight: weights[i]
      }));
      
      setTrends(newTrends);
      
      // Calculate overall bias
      const bullishScore = newTrends.reduce((sum, t) => sum + (t.bias === 'Bullish' ? t.weight : 0), 0);
      const bearishScore = newTrends.reduce((sum, t) => sum + (t.bias === 'Bearish' ? t.weight : 0), 0);
      
      if (bullishScore > bearishScore * config.mtf.biasThreshold) setOverallBias('Bullish');
      else if (bearishScore > bullishScore * config.mtf.biasThreshold) setOverallBias('Bearish');
      else setOverallBias('Neutral');
    }
  }, [primaryData, timeframes, weights]);

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
      <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        MTF Trend Dashboard
      </h3>
      
      {primaryLoading && (
        <div className="text-center py-4 text-gray-400">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-2"></div>
          Loading trend data...
        </div>
      )}
      
      {primaryError && !primaryLoading && (
        <div className="text-center py-4 text-red-400">
          Failed to load trend data. Please try again later.
        </div>
      )}
      
      {!primaryLoading && !primaryError && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 border-b border-gray-700 pb-2">
            <span>Timeframe</span>
            <span>Trend</span>
          </div>
          
          {trends && trends.length > 0 && trends.map((trend, index) => (
            <div key={index} className="grid grid-cols-2 gap-2 items-center">
              <span className="text-white text-sm">{trend.timeframe}</span>
              <span className={`text-sm font-medium ${getTrendColor(trend.bias)}`}>
                {trend.bias}
              </span>
            </div>
          ))}
          
          <div className={`mt-3 p-2 rounded ${getTrendBg(overallBias)} border border-gray-700`}>
            <div className="flex justify-between items-center">
              <span className="text-white text-sm font-medium">Overall Bias</span>
              <span className={`text-sm font-bold ${getTrendColor(overallBias)}`}>
                {overallBias}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}