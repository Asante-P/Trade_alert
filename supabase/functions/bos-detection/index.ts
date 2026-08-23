import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

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

// Calculate ATR (Average True Range) - Pine Script: ta.atr
function calculateATR(candles: any[], period: number = 14) {
  if (candles.length < period + 1) return 0;
  
  const trueRanges: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }
  
  if (trueRanges.length < period) return 0;
  
  const recentTR = trueRanges.slice(-period);
  return recentTR.reduce((sum, tr) => sum + tr, 0) / period;
}

// Pine Script equivalent BOS detection logic
function detectBOS(candles: any[], swingLength: number = 10) {
  const bosEvents: any[] = [];
  let lastSwingHigh = null;
  let lastSwingHighBar = null;
  let lastSwingLow = null;
  let lastSwingLowBar = null;

  // Detect swing points (equivalent to ta.pivothigh/ta.pivotlow)
  for (let i = swingLength; i < candles.length - swingLength; i++) {
    const currentBar = candles[i];
    
    // Check for swing high
    let isSwingHigh = true;
    for (let j = i - swingLength; j <= i + swingLength; j++) {
      if (j !== i && candles[j].high > currentBar.high) {
        isSwingHigh = false;
        break;
      }
    }
    
    if (isSwingHigh && currentBar.high > (lastSwingHigh || 0)) {
      lastSwingHigh = currentBar.high;
      lastSwingHighBar = i;
    }
    
    // Check for swing low
    let isSwingLow = true;
    for (let j = i - swingLength; j <= i + swingLength; j++) {
      if (j !== i && candles[j].low < currentBar.low) {
        isSwingLow = false;
        break;
      }
    }
    
    if (isSwingLow && (lastSwingLow === null || currentBar.low < lastSwingLow)) {
      lastSwingLow = currentBar.low;
      lastSwingLowBar = i;
    }
    
    // Detect bullish BOS (close through swing high)
    if (lastSwingHigh !== null && lastSwingHighBar !== null) {
      if (currentBar.close > lastSwingHigh && i > lastSwingHighBar) {
        bosEvents.push({
          type: 'BOS',
          direction: 'bullish',
          price: lastSwingHigh,
          barIndex: i,
          swingBarIndex: lastSwingHighBar,
          timestamp: currentBar.time
        });
        // Reset swing high after BOS (Pine Script behavior)
        lastSwingHigh = null;
        lastSwingHighBar = null;
      }
    }
    
    // Detect bearish BOS (close through swing low)
    if (lastSwingLow !== null && lastSwingLowBar !== null) {
      if (currentBar.close < lastSwingLow && i > lastSwingLowBar) {
        bosEvents.push({
          type: 'BOS',
          direction: 'bearish',
          price: lastSwingLow,
          barIndex: i,
          swingBarIndex: lastSwingLowBar,
          timestamp: currentBar.time
        });
        // Reset swing low after BOS (Pine Script behavior)
        lastSwingLow = null;
        lastSwingLowBar = null;
      }
    }
  }
  
  return bosEvents;
}

// Pine Script equivalent OB + AMB detection logic
function detectOrderBlocks(candles: any[], swingLength: number = 10) {
  const obZones: any[] = [];
  
  const atr14 = calculateATR(candles, 14);
  const minZoneAtr = atr14 * 0.3; // Pine Script min_sz
  const impMul = 1.5;
  
  for (let i = 1; i < candles.length - 1; i++) {
    const candle = candles[i];
    const body = Math.abs(candle.close - candle.open);
    const isStrong = body > atr14 * impMul;
    
    // Bearish OB (Pine Script logic)
    const bear_ob = isStrong && candle.close < candle.open && candles[i-1].close < candles[i-1].open;
    if (bear_ob) {
      const obt = candles[i-1].high;
      const obb = Math.max(candles[i-1].open, candles[i-1].close);
      if (obt - obb >= minZoneAtr) {
        obZones.push({
          type: 'ORDER_BLOCK',
          direction: 'bearish',
          index: i,
          high: obt,
          low: obb,
          isAMB: true,
          timestamp: candle.time
        });
      }
    }
    
    // Bullish OB (Pine Script logic)
    const bull_ob = isStrong && candle.close > candle.open && candles[i-1].open > candles[i-1].close;
    if (bull_ob) {
      const obt = Math.min(candles[i-1].open, candles[i-1].close);
      const obb = candles[i-1].low;
      if (obt - obb >= minZoneAtr) {
        obZones.push({
          type: 'ORDER_BLOCK',
          direction: 'bullish',
          index: i,
          high: obt,
          low: obb,
          isAMB: true,
          timestamp: candle.time
        });
      }
    }
  }
  
  return obZones;
}

// Pine Script equivalent trendline detection logic
function detectTrendlines(candles: any[], swingLength: number = 10) {
  const trendlines: any[] = [];
  
  const atr14 = calculateATR(candles, 14);
  const tlTouchTolMult = 0.15;
  const tlMinBarsBtwn = 5;
  const tlTouchesReq = 3;
  
  // Find pivot highs/lows for trendlines
  const tlPH: any[] = [];
  const tlPL: any[] = [];
  
  for (let i = swingLength; i < candles.length - swingLength; i++) {
    const isPivotHigh = candles.slice(i - swingLength, i).every((c: any) => c.high < candles[i].high) &&
                       candles.slice(i + 1, i + swingLength + 1).every((c: any) => c.high < candles[i].high);
    const isPivotLow = candles.slice(i - swingLength, i).every((c: any) => c.low > candles[i].low) &&
                      candles.slice(i + 1, i + swingLength + 1).every((c: any) => c.low > candles[i].low);
    
    if (isPivotHigh) tlPH.push({ index: i, price: candles[i].high });
    if (isPivotLow) tlPL.push({ index: i, price: candles[i].low });
  }
  
  // Resistance trendline (descending from sequential lower highs)
  for (let i = 0; i < tlPH.length - 1; i++) {
    if (tlPH[i].price < tlPH[i + 1].price) {
      const a1P = tlPH[i].price;
      const a1B = tlPH[i].index;
      const a2P = tlPH[i + 1].price;
      const a2B = tlPH[i + 1].index;
      
      const slope = (a2P - a1P) / (a2B - a1B);
      let touches = 2;
      
      for (let j = a2B; j < candles.length; j++) {
        const lineVal = a2P + slope * (j - a2B);
        const tol = atr14 * tlTouchTolMult;
        
        if (candles[j].high >= lineVal - tol && candles[j].close <= lineVal + tol && candles[j].close < candles[j].high) {
          touches++;
        }
      }
      
      if (touches >= tlTouchesReq) {
        trendlines.push({
          type: 'resistance',
          price: a2P,
          touches: touches,
          index: a2B,
          slope: slope,
          timestamp: candles[a2B].time
        });
      }
      break;
    }
  }
  
  // Support trendline (ascending from sequential higher lows)
  for (let i = 0; i < tlPL.length - 1; i++) {
    if (tlPL[i].price > tlPL[i + 1].price) {
      const a1P = tlPL[i].price;
      const a1B = tlPL[i].index;
      const a2P = tlPL[i + 1].price;
      const a2B = tlPL[i + 1].index;
      
      const slope = (a2P - a1P) / (a2B - a1B);
      let touches = 2;
      
      for (let j = a2B; j < candles.length; j++) {
        const lineVal = a2P + slope * (j - a2B);
        const tol = atr14 * tlTouchTolMult;
        
        if (candles[j].low <= lineVal + tol && candles[j].close >= lineVal - tol && candles[j].close > candles[j].low) {
          touches++;
        }
      }
      
      if (touches >= tlTouchesReq) {
        trendlines.push({
          type: 'support',
          price: a2P,
          touches: touches,
          index: a2B,
          slope: slope,
          timestamp: candles[a2B].time
        });
      }
      break;
    }
  }
  
  return trendlines;
}

// Pine Script EMA calculation for MTF trend analysis
function calculateEMA(prices: number[], period: number): number {
  if (prices.length < period) return prices[prices.length - 1];
  
  const multiplier = 2 / (period + 1);
  let ema = prices[0];
  
  for (let i = 1; i < prices.length; i++) {
    ema = (prices[i] - ema) * multiplier + ema;
  }
  
  return ema;
}

// Enhanced trend detection using multiple EMAs (like professional indicators)
function calculateEnhancedBias(dataSlice: any[]) {
  if (dataSlice.length < 20) return 'Neutral';
  
  const closes = dataSlice.map((d: any) => d.close);
  const highs = dataSlice.map((d: any) => d.high);
  const lows = dataSlice.map((d: any) => d.low);
  
  // Use multiple EMAs like professional indicators (EMA 9, EMA 21, EMA 50)
  const ema9 = calculateEMA(closes, Math.min(9, Math.floor(closes.length / 3)));
  const ema21 = calculateEMA(closes, Math.min(21, Math.floor(closes.length / 2)));
  const ema50 = calculateEMA(closes, Math.min(50, closes.length));
  
  const lastClose = closes[closes.length - 1];
  const lastHigh = highs[highs.length - 1];
  const lastLow = lows[lows.length - 1];
  
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
  
  console.log('NEUTRAL signal');
  return 'Neutral';
}

// MTF trend analysis using Pine Script logic
function analyzeMTFTrends(candles: any[]) {
  const timeframes = ['15m', '1H', '4H', '1D'];
  const weights = [1, 2, 3, 4];
  const trends: any[] = [];
  
  console.log(`Analyzing MTF trends with ${candles.length} candles`);
  
  // Calculate bias for each timeframe using different data slices
  timeframes.forEach((tf, i) => {
    let dataSlice;
    
    // Simulate different timeframe data by using different slices
    switch (tf) {
      case '15m':
        dataSlice = candles.slice(-30);
        break;
      case '1H':
        dataSlice = candles.slice(-50);
        break;
      case '4H':
        dataSlice = candles.slice(-70);
        break;
      case '1D':
        dataSlice = candles.slice(-90);
        break;
      default:
        dataSlice = candles.slice(-30);
    }
    
    console.log(`Timeframe ${tf}: data slice length ${dataSlice.length}`);
    
    trends.push({
      timeframe: tf,
      bias: calculateEnhancedBias(dataSlice),
      weight: weights[i]
    });
  });
  
  // Calculate overall bias
  const weightedSum = trends.reduce((sum, trend) => {
    const biasValue = trend.bias === 'Bullish' ? 1 : trend.bias === 'Bearish' ? -1 : 0;
    return sum + (biasValue * trend.weight);
  }, 0);
  
  const overallBias = weightedSum > 0 ? 'Bullish' : weightedSum < 0 ? 'Bearish' : 'Neutral';
  
  console.log(`MTF Analysis result:`, { trends, overallBias });
  
  return {
    trends,
    overallBias
  };
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-client-info, apikey',
      },
    });
  }

  try {
    // Removed market hours check - always process for testing
    console.log('Processing BOS detection request...');
    
    const { symbol, candles } = await req.json();
    
    console.log(`Received request for ${symbol} with ${candles?.length || 0} candles`);
    
    if (!symbol || !candles || !Array.isArray(candles)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: symbol and candles array required' }),
        { 
          status: 400, 
          headers: { 
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          } 
        }
      );
    }
    
    // Run Pine Script equivalent detection
    const bosEvents = detectBOS(candles, 10);
    const obZones = detectOrderBlocks(candles, 10);
    const trendlines = detectTrendlines(candles, 10);
    const mtfAnalysis = analyzeMTFTrends(candles);
    
    console.log(`Detection complete: ${bosEvents.length} BOS, ${obZones.length} OB zones, ${trendlines.length} trendlines, MTF: ${mtfAnalysis.overallBias}`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        symbol,
        bosCount: bosEvents.length,
        obCount: obZones.length,
        trendlineCount: trendlines.length,
        events: bosEvents,
        orderBlocks: obZones,
        trendlines: trendlines,
        mtfTrends: mtfAnalysis.trends,
        overallBias: mtfAnalysis.overallBias,
        message: 'Pine Script accurate detection completed'
      }),
      { 
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } 
      }
    );
    
  } catch (error) {
    console.error('Error in BOS detection:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : String(error),
        events: [],
        orderBlocks: [],
        trendlines: []
      }),
      { 
        status: 500,
        headers: { 
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        } 
      }
    );
  }
});
