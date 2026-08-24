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
          
          // Fallback: Enhanced trend detection using multiple EMAs
          const calculateEnhancedBias = (dataSlice: any[]) => {
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
            
            // Strong bullish: price above all EMAs and EMAs aligned bullish
            if (priceAboveLongEMA && emaBullishAlignment) {
              console.log('Strong BULLISH signal');
              return 'Bullish';
            }
            
            // Strong bearish: price below all EMAs and EMAs aligned bearish
            if (priceBelowLongEMA && emaBearishAlignment) {
              console.log('Strong BEARISH signal');
              return 'Bearish';
            }
            
            // Moderate bullish: price above medium EMA
            if (priceAboveMediumEMA) {
              console.log('Moderate BULLISH signal');
              return 'Bullish';
            }
            
            // Moderate bearish: price below medium EMA
            if (priceBelowMediumEMA) {
              console.log('Moderate BEARISH signal');
              return 'Bearish';
            }
            
            console.log('NEUTRAL signal - no conditions met');
            return 'Neutral';
          };
          
          // Helper function to calculate EMA
          const calculateEMA = (prices: number[], period: number): number => {
            if (prices.length < period) return prices[prices.length - 1];
            
            const multiplier = 2 / (period + 1);
            let ema = prices[0];
            
            for (let i = 1; i < prices.length; i++) {
              ema = (prices[i] - ema) * multiplier + ema;
            }
            
            return ema;
          };

          // Calculate bias for each timeframe using different data slices
          const newTrends = timeframes.map((tf, i) => {
            let dataSlice;
            
            // Simulate different timeframe data by using different slices
            switch (tf) {
              case '15m':
                dataSlice = marketData.slice(-30); // Last 30 candles
                break;
              case '1H':
                dataSlice = marketData.slice(-50); // Last 50 candles (simulating 1H)
                break;
              case '4H':
                dataSlice = marketData.slice(-70); // Last 70 candles (simulating 4H)
                break;
              case '1D':
                dataSlice = marketData.slice(-90); // Last 90 candles (simulating 1D)
                break;
              default:
                dataSlice = marketData.slice(-30);
            }
            
            console.log(`Timeframe ${tf}: data slice length ${dataSlice.length}`);
            
            return {
              timeframe: tf,
              bias: calculateEnhancedBias(dataSlice) as 'Bullish' | 'Bearish' | 'Neutral',
              weight: weights[i]
            };
          });
          
          setTrends(newTrends);
          
          // Calculate overall bias
          const weightedSum = newTrends.reduce((sum, trend) => {
            const biasValue = trend.bias === 'Bullish' ? 1 : trend.bias === 'Bearish' ? -1 : 0;
            return sum + (biasValue * trend.weight);
          }, 0);
          
          setOverallBias(weightedSum > 0 ? 'Bullish' : weightedSum < 0 ? 'Bearish' : 'Neutral');
        }
      } catch (error) {
        console.error('Error fetching trend data:', error);
      }
    };

    fetchTrendData();
    const interval = setInterval(fetchTrendData, 120000); // Update every 2 minutes instead of 30 seconds
    
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
        
        {trends.map((trend, index) => (
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