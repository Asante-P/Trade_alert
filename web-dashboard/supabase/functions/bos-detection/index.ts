import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

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

// Calculate ATR (Average True Range)
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

// Detect Order Blocks using Pine Script logic
function detectOrderBlocks(candles: any[], atr: number) {
  const orderBlocks: any[] = [];
  const minZoneAtr = atr * 0.3; // Pine Script: min_sz = 0.3 ATR
  const impMul = 1.5; // Pine Script: imp_mul = 1.5 ATR
  
  for (let i = 1; i < candles.length; i++) {
    const current = candles[i];
    const prev = candles[i - 1];
    
    const body = Math.abs(current.close - current.open);
    const prevBody = Math.abs(prev.close - prev.open);
    
    // Check for strong impulse candle
    const isStrongCandle = body > atr * impMul;
    
    // Bearish Order Block (bearish candle followed by bullish move)
    if (prevBody > 0 && prev.close < prev.open && current.close > current.open) {
      if (isStrongCandle) {
        orderBlocks.push({
          type: 'ORDER_BLOCK',
          direction: 'bearish',
          high: prev.high,
          low: prev.low,
          timestamp: prev.time,
          isAMB: true // AMB = All Moving Blocks (strong candles)
        });
      }
    }
    
    // Bullish Order Block (bullish candle followed by bearish move)
    if (prevBody > 0 && prev.close > prev.open && current.close < current.open) {
      if (isStrongCandle) {
        orderBlocks.push({
          type: 'ORDER_BLOCK',
          direction: 'bullish',
          high: prev.high,
          low: prev.low,
          timestamp: prev.time,
          isAMB: true
        });
      }
    }
  }
  
  return orderBlocks;
}

// Detect supply/demand zones
function detectSupplyDemandZones(candles: any[], atr: number) {
  const zones: any[] = [];
  const minZoneAtr = atr * 0.3;
  
  for (let i = 2; i < candles.length; i++) {
    const current = candles[i];
    const prev = candles[i - 1];
    const prev2 = candles[i - 2];
    
    // Supply zone (price drop after consolidation/rise)
    if (prev2.close > prev2.open && prev.close < prev.open && current.close < current.open) {
      const zoneSize = prev2.high - prev2.low;
      if (zoneSize >= minZoneAtr) {
        zones.push({
          type: 'SUPPLY_DEMAND',
          direction: 'bearish',
          high: prev2.high,
          low: prev2.low,
          timestamp: prev2.time
        });
      }
    }
    
    // Demand zone (price rise after consolidation/drop)
    if (prev2.close < prev2.open && prev.close > prev.open && current.close > current.open) {
      const zoneSize = prev2.high - prev2.low;
      if (zoneSize >= minZoneAtr) {
        zones.push({
          type: 'SUPPLY_DEMAND',
          direction: 'bullish',
          high: prev2.high,
          low: prev2.low,
          timestamp: prev2.time
        });
      }
    }
  }
  
  return zones;
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
    
    const atr = calculateATR(candles);
    
    // Run Pine Script equivalent detection
    const bosEvents = detectBOS(candles);
    const orderBlocks = detectOrderBlocks(candles, atr);
    const supplyDemandZones = detectSupplyDemandZones(candles, atr);
    
    // Combine all events
    const allEvents = [
      ...bosEvents.map(e => ({ ...e, symbol })),
      ...orderBlocks.map(e => ({ ...e, symbol })),
      ...supplyDemandZones.map(e => ({ ...e, symbol }))
    ];
    
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // Store new alerts in database
    for (const event of allEvents) {
      const { error } = await supabase
        .from('alerts')
        .insert({
          symbol: event.symbol,
          type: event.type,
          direction: event.direction,
          price: event.price || event.high,
          timestamp: event.timestamp,
          details: {
            barIndex: event.barIndex,
            swingBarIndex: event.swingBarIndex,
            isAMB: event.isAMB,
            atr: atr
          }
        });
      
      if (error) {
        console.error('Error inserting alert:', error);
      }
    }
    
    return new Response(
      JSON.stringify({
        success: true,
        events: allEvents,
        atr: atr,
        bosCount: bosEvents.length,
        obCount: orderBlocks.length,
        zoneCount: supplyDemandZones.length
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('BOS detection error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});