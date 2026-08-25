'use client';

import React, { useState, useEffect } from 'react';
import { TrendBias } from '@/types';
import { supabase } from '@/lib/supabase';

interface MTFDashboardProps {
  timeframes?: string[];
  weights?: number[];
  symbol?: string;
}

const defaultTimeframes = ['15m', '1H', '4H', '1D'];
const defaultWeights = [1, 2, 3, 4];

// Check if market is open (XAUUSD 24/5 market: Sunday 5pm EST to Friday 5pm EST)
function isMarketOpen() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday
  const hours = now.getUTCHours();
  
  // XAUUSD market hours: Sunday 21:00 UTC to Friday 21:00 UTC (5pm EST)
  // Closed: Friday 21:00 UTC to Sunday 21:00 UTC
  if (day === 5 && hours >= 21) return false; // Friday after 9pm UTC
  if (day === 6) return false; // Saturday
  if (day === 0 && hours < 21) return false; // Sunday before 9pm UTC
  
  return true;
}

// EMA calculation helper
function calculateEMA(data: number[], period: number): number {
  if (data.length < period) return data[data.length - 1] || 0;
  
  const k = 2 / (period + 1);
  let ema = data[0];
  
  for (let i = 1; i < data.length; i++) {
    ema = data[i] * k + ema * (1 - k);
  }
  
  return ema;
}

// Enhanced bias calculation using multiple EMAs
function calculateEnhancedBias(dataSlice: any[]): 'Bullish' | 'Bearish' | 'Neutral' {
  console.log(`calculateEnhancedBias called with ${dataSlice.length} candles`);
  
  if (dataSlice.length < 20) {
    console.log('Data slice too small, returning Neutral');
    return 'Neutral';
  }
  
  const closes = dataSlice.map((d: any) => d.close);
  
  // Use multiple EMAs like professional indicators (EMA 9, EMA 21, EMA 50)
  const ema9 = calculateEMA(closes, Math.min(9, Math.floor(closes.length / 3)));
  const ema21 = calculateEMA(closes, Math.min(21, Math.floor(closes.length / 2)));
  const ema50 = calculateEMA(closes, Math.min(50, closes.length));
  
  const lastClose = closes[closes.length - 1];
  
  console.log(`Enhanced bias calculation: Close=${lastClose}, EMA9=${ema9}, EMA21=${ema21}, EMA50=${ema50}`);
  
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
  
  console.log(`Conditions:`, {
    priceAboveShortEMA,
    priceAboveMediumEMA,
    priceAboveLongEMA,
    emaBullishAlignment,
    priceBelowShortEMA,
    priceBelowMediumEMA,
    priceBelowLongEMA,
    emaBearishAlignment
  });
  
  // Determine bias
  if (priceAboveShortEMA && priceAboveMediumEMA && priceAboveLongEMA && emaBullishAlignment) {
    console.log('Strong BULLISH signal');
    return 'Bullish';
  }
  
  if (priceBelowShortEMA && priceBelowMediumEMA && priceBelowLongEMA && emaBearishAlignment) {
    console.log('Strong BEARISH signal');
    return 'Bearish';
  }
  
  if (priceAboveShortEMA && priceAboveMediumEMA) {
    console.log('Moderate BULLISH signal');
    return 'Bullish';
  }
  
  if (priceBelowShortEMA && priceBelowMediumEMA) {
    console.log('Moderate BEARISH signal');
    return 'Bearish';
  }
  
  console.log('NEUTRAL signal');
  return 'Neutral';
}

export default function MTFDashboard({ 
  timeframes = defaultTimeframes,
  weights = defaultWeights,
  symbol = 'XAUUSD'
}: MTFDashboardProps) {
  const [trends, setTrends] = useState<TrendBias[]>(
    timeframes.map((tf, i) => ({
      timeframe: tf,
      bias: 'Neutral',
      weight: weights[i]
    }))
  );
  const [overallBias, setOverallBias] = useState<'Bullish' | 'Bearish' | 'Neutral'>('Neutral');
  const [lastTrends, setLastTrends] = useState<TrendBias[]>([]); // Store previous trends for comparison

  // Fetch real market data and calculate trends using Supabase Pine Script
  useEffect(() => {
    const fetchTrendData = async () => {
      try {
        // Removed market hours check for testing - always process
        // if (!isMarketOpen()) {
        //   console.log('Market is closed, skipping MTF trend update');
        //   return;
        // }
        
        // Fetch data for each timeframe with correct interval
        const timeframeData: any = {};
        
        for (const tf of timeframes) {
          const interval = tf === '15m' ? '15m' : tf === '1H' ? '1h' : tf === '4H' ? '1d' : '1d';
          const response = await fetch(`/api/market-data/${symbol}?interval=${interval}`);
          const data = await response.json();
          
          if (data.success && data.data && data.data.length > 20) {
            timeframeData[tf] = data.data;
          }
        }
        
        // If we have data for all timeframes, calculate trends
        if (Object.keys(timeframeData).length === timeframes.length) {
          const newTrends = timeframes.map((tf) => {
            const data = timeframeData[tf];
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
          
          if (bullishScore > bearishScore * 1.5) setOverallBias('Bullish');
          else if (bearishScore > bullishScore * 1.5) setOverallBias('Bearish');
          else setOverallBias('Neutral');
          
          return;
        }
        
        // Fallback: Use single 15m data if multi-timeframe fails
        const response = await fetch(`/api/market-data/${symbol}`);
        const data = await response.json();
        
        if (data.success && data.data && data.data.length > 20) {
          const marketData = data.data;
          
          // Call Supabase Edge Function for MTF trend analysis
          try {
            console.log('Calling Supabase bos-detection for MTF trends with', marketData.length, 'candles');
            const { data: bosData, error } = await supabase.functions.invoke('bos-detection', {
              body: {
                symbol: symbol,
                candles: marketData
              }
            });
            
            console.log('Supabase response:', { error, bosData });
            
            if (!error && bosData && bosData.success && bosData.mtfTrends && Array.isArray(bosData.mtfTrends)) {
              // Use MTF trends from Supabase Pine Script
              console.log('Using Supabase MTF trends:', bosData.mtfTrends);
              const newTrends = bosData.mtfTrends.map((trend: any) => ({
                timeframe: trend.timeframe || 'Unknown',
                bias: (trend.bias || 'Neutral') as 'Bullish' | 'Bearish' | 'Neutral',
                weight: typeof trend.weight === 'number' ? trend.weight : 1
              }));
              setTrends(newTrends);
              setOverallBias((bosData.overallBias || 'Neutral') as 'Bullish' | 'Bearish' | 'Neutral');
              return; // Exit early if we got Supabase data
            } else {
              console.log('Supabase data not available or error, using fallback calculation');
            }
          } catch (supabaseError) {
            console.error('Error calling Supabase for MTF:', supabaseError);
          }
          
          // Fallback: Use the same multi-timeframe calculation
          const newTrends = timeframes.map((tf) => {
            const interval = tf === '15m' ? '15m' : tf === '1H' ? '1h' : tf === '4H' ? '1d' : '1d';
            const dataSlice = timeframeData[tf] || marketData.slice(0, 30);
            const bias = calculateEnhancedBias(dataSlice);
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
          
          if (bullishScore > bearishScore * 1.5) setOverallBias('Bullish');
          else if (bearishScore > bullishScore * 1.5) setOverallBias('Bearish');
          else setOverallBias('Neutral');
        }
      } catch (error) {
        console.error('Error fetching trend data:', error);
      }
    };

    fetchTrendData();
    const interval = setInterval(fetchTrendData, 120000); // Update every 2 minutes
    
    return () => clearInterval(interval);
  }, [symbol, timeframes, weights]);

  const getBiasColor = (bias: string) => {
    switch (bias) {
      case 'Bullish': return 'text-green-500';
      case 'Bearish': return 'text-red-500';
      default: return 'text-gray-400';
    }
  };

  const getBiasBg = (bias: string) => {
    switch (bias) {
      case 'Bullish': return 'bg-green-500/20';
      case 'Bearish': return 'bg-red-500/20';
      default: return 'bg-gray-500/20';
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
      <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        MTF Trend Dashboard
      </h3>
      
      <div className="space-y-2">
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 border-b border-gray-700 pb-2">
          <span>Timeframe</span>
          <span>Trend</span>
        </div>
        
        {trends && trends.length > 0 && trends.map((trend, index) => (
          <div key={index} className="grid grid-cols-2 gap-2 items-center">
            <span className="text-white text-sm">{trend.timeframe}</span>
            <span className={`text-sm font-medium ${getBiasColor(trend.bias)}`}>
              {trend.bias}
            </span>
          </div>
        ))}
        
        <div className={`mt-3 p-2 rounded ${getBiasBg(overallBias)} border border-gray-700`}>
          <div className="flex justify-between items-center">
            <span className="text-white text-sm font-medium">Overall Bias</span>
            <span className={`text-sm font-bold ${getBiasColor(overallBias)}`}>
              {overallBias}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}