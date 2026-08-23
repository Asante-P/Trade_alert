import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

// Simple EMA calculation (Pine Script: ta.ema)
function calculateEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  // Start with SMA for first value
  let sum = 0;
  for (let i = 0; i < period && i < data.length; i++) {
    sum += data[i];
  }
  ema.push(sum / Math.min(period, data.length));
  
  // Calculate EMA for remaining values
  for (let i = period; i < data.length; i++) {
    const currentEMA = (data[i] - ema[ema.length - 1]) * multiplier + ema[ema.length - 1];
    ema.push(currentEMA);
  }
  
  return ema;
}

// Calculate PDH/PDL (Previous Day High/Low)
function calculateDailyLevels(candles: any[]) {
  if (candles.length < 24) return { pdh: null, pdl: null };
  
  // Get last 24 candles (assuming hourly data)
  const dailyCandles = candles.slice(-24);
  const highs = dailyCandles.map(c => c.high);
  const lows = dailyCandles.map(c => c.low);
  
  return {
    pdh: Math.max(...highs),
    pdl: Math.min(...lows)
  };
}

// Calculate PWH/PWL (Previous Week High/Low)
function calculateWeeklyLevels(candles: any[]) {
  if (candles.length < 100) return { pwh: null, pwl: null };
  
  // Get last 100 candles (assuming hourly data for ~1 week)
  const weeklyCandles = candles.slice(-100);
  const highs = weeklyCandles.map(c => c.high);
  const lows = weeklyCandles.map(c => c.low);
  
  return {
    pwh: Math.max(...highs),
    pwl: Math.min(...lows)
  };
}

// Determine trend based on EMA (Pine Script simple trend logic)
function determineTrend(closes: number[], emaPeriod: number = 50): 'bullish' | 'bearish' | 'neutral' {
  if (closes.length < emaPeriod) return 'neutral';
  
  const ema = calculateEMA(closes, emaPeriod);
  const lastClose = closes[closes.length - 1];
  const lastEMA = ema[ema.length - 1];
  
  // Pine Script: bullish if close > EMA, bearish if close < EMA
  if (lastClose > lastEMA) return 'bullish';
  if (lastClose < lastEMA) return 'bearish';
  return 'neutral';
}

// MTF trend calculation for different timeframes
function calculateMTFTrends(candles: any[], timeframes: string[]) {
  const trends: any[] = [];
  
  for (const tf of timeframes) {
    // For simplicity, we'll use the same candles but with different EMA periods
    // In production, you'd aggregate candles by timeframe
    const closes = candles.map(c => c.close);
    const emaPeriod = tf === '1m' ? 10 : tf === '5m' ? 20 : tf === '15m' ? 30 : tf === '1h' ? 50 : 100;
    
    const trend = determineTrend(closes, emaPeriod);
    const bias = trend; // Simple bias = trend in this implementation
    
    trends.push({
      timeframe: tf,
      trend,
      bias
    });
  }
  
  return trends;
}

serve(async (req) => {
  try {
    const { symbol, candles } = await req.json();
    
    if (!symbol || !candles || !Array.isArray(candles)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: symbol and candles array required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const closes = candles.map(c => c.close);
    const currentPrice = closes[closes.length - 1];
    
    // Calculate Pine Script equivalent indicators
    const trend = determineTrend(closes, 50); // 50-period EMA (Pine Script: trendEmaLen = 50)
    const dailyLevels = calculateDailyLevels(candles);
    const weeklyLevels = calculateWeeklyLevels(candles);
    
    // MTF trends for different timeframes
    const timeframes = ['1m', '5m', '15m', '1h', '4h', '1D'];
    const mtfTrends = calculateMTFTrends(candles, timeframes);
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Update market state using the upsert function
    const { error: stateError } = await supabase.rpc('upsert_market_state', {
      p_symbol: symbol,
      p_current_price: currentPrice,
      p_trend: trend,
      p_pdh: dailyLevels.pdh,
      p_pdl: dailyLevels.pdl,
      p_pwh: weeklyLevels.pwh,
      p_pwl: weeklyLevels.pwl
    });
    
    if (stateError) {
      console.error('Error upserting market state:', stateError);
    }
    
    // Update MTF trends
    for (const mtf of mtfTrends) {
      const { error: mtfError } = await supabase.rpc('upsert_mtf_trend', {
        p_symbol: symbol,
        p_timeframe: mtf.timeframe,
        p_trend: mtf.trend,
        p_bias: mtf.bias
      });
      
      if (mtfError) {
        console.error('Error upserting MTF trend:', mtfError);
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        symbol,
        currentPrice,
        trend,
        dailyLevels,
        weeklyLevels,
        mtfTrends,
        timestamp: new Date().toISOString()
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Market data processing error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});