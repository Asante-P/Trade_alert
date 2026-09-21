import { useState, useEffect, useCallback, useMemo } from 'react';
import { calculateEMA } from '@/lib/utils';
import { config } from '@/lib/config';
import type { MarketCandle, TrendBias } from '@/types';

interface UseTrendAnalysisResult {
  trends: TrendBias[];
  overallBias: 'Bullish' | 'Bearish' | 'Neutral';
  loading: boolean;
  error: string | null;
  recalculate: () => void;
}

interface UseTrendAnalysisOptions {
  timeframes: string[];
  weights: number[];
  symbol: string;
  dataByTimeframe: Record<string, MarketCandle[]>;
}

/**
 * Enhanced bias calculation using multiple EMAs
 */
function calculateEnhancedBias(data: MarketCandle[]): 'Bullish' | 'Bearish' | 'Neutral' {
  if (data.length < 20) {
    return 'Neutral';
  }
  
  const closes = data.map((d) => d.close);
  
  // Use multiple EMAs like professional indicators (EMA 9, EMA 21, EMA 50)
  const ema9 = calculateEMA(closes, Math.min(9, Math.floor(closes.length / 3)));
  const ema21 = calculateEMA(closes, Math.min(21, Math.floor(closes.length / 2)));
  const ema50 = calculateEMA(closes, Math.min(50, closes.length));
  
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

/**
 * Custom hook for trend analysis
 */
export function useTrendAnalysis({
  timeframes,
  weights,
  symbol,
  dataByTimeframe,
}: UseTrendAnalysisOptions): UseTrendAnalysisResult {
  const [trends, setTrends] = useState<TrendBias[]>(
    timeframes.map((tf, i) => ({
      timeframe: tf,
      bias: 'Neutral',
      weight: weights[i]
    }))
  );
  const [overallBias, setOverallBias] = useState<'Bullish' | 'Bearish' | 'Neutral'>('Neutral');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Create a stable version of dataByTimeframe for comparison
  const dataByTimeframeStable = useMemo(() => {
    return timeframes.map(tf => ({
      timeframe: tf,
      data: dataByTimeframe[tf] || [],
      length: dataByTimeframe[tf]?.length || 0
    }));
  }, [timeframes, dataByTimeframe]);

  const recalculate = useCallback(() => {
    setLoading(true);
    setError(null);

    try {
      // Check if we have data for all timeframes
      const hasAllData = dataByTimeframeStable.every(({ data }) => 
        data && data.length > 20
      );

      if (!hasAllData) {
        setError('Insufficient data for trend analysis');
        setLoading(false);
        return;
      }

      const newTrends = timeframes.map((tf) => {
        const data = dataByTimeframe[tf];
        const bias = calculateEnhancedBias(data);
        return {
          timeframe: tf,
          bias,
          weight: weights[timeframes.indexOf(tf)]
        };
      });

      setTrends(newTrends);

      // Calculate overall bias
      const bullishScore = newTrends.reduce((sum, t) => sum + (t.bias === 'Bullish' ? t.weight : 0), 0);
      const bearishScore = newTrends.reduce((sum, t) => sum + (t.bias === 'Bearish' ? t.weight : 0), 0);
      
      if (bullishScore > bearishScore * config.mtf.biasThreshold) setOverallBias('Bullish');
      else if (bearishScore > bullishScore * config.mtf.biasThreshold) setOverallBias('Bearish');
      else setOverallBias('Neutral');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to calculate trends');
    } finally {
      setLoading(false);
    }
  }, [timeframes, weights, symbol, dataByTimeframe, dataByTimeframeStable]);

  useEffect(() => {
    recalculate();
  }, [recalculate]);

  return { trends, overallBias, loading, error, recalculate };
}
