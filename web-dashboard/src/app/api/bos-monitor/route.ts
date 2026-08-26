import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Twelve Data API
const TWELVE_DATA_API_KEY = process.env.TWELVE_DATA_API_KEY;

// Symbol mapping for Twelve Data
const getTwelveDataSymbol = (sym: string) => {
  switch (sym.toUpperCase()) {
    case 'XAUUSD': return 'XAU/USD';
    case 'EURUSD': return 'EUR/USD';
    case 'BTCUSD': return 'BTC/USD';
    case 'NAS100': return 'US100';
    default: return sym;
  }
};

// Fetch market data from Twelve Data
async function fetchMarketData(symbol: string, interval: string = '15min', limit: number = 200) {
  if (!TWELVE_DATA_API_KEY) {
    throw new Error('TWELVE_DATA_API_KEY not configured');
  }

  const tdSymbol = getTwelveDataSymbol(symbol);
  
  const response = await fetch(
    `https://api.twelvedata.com/time_series?symbol=${tdSymbol}&interval=${interval}&outputsize=${limit}&apikey=${TWELVE_DATA_API_KEY}`
  );
  
  const data = await response.json();
  
  if (data.status === 'error') {
    throw new Error(`Twelve Data error: ${data.message}`);
  }
  
  if (!data.values || data.values.length === 0) {
    throw new Error('No data from Twelve Data');
  }
  
  // Convert to candle format (oldest first)
  const candles = data.values.map((v: any) => ({
    time: new Date(v.datetime).getTime() / 1000,
    open: parseFloat(v.open),
    high: parseFloat(v.high),
    low: parseFloat(v.low),
    close: parseFloat(v.close)
  })).reverse();
  
  return candles;
}

// Calculate pivot highs and lows (similar to TradingView's ta.pivothigh/pivotlow)
function calculatePivots(candles: any[], swingLen: number = 10) {
  const pivots: { index: number; type: 'high' | 'low'; price: number }[] = [];
  
  for (let i = swingLen; i < candles.length - swingLen; i++) {
    const current = candles[i];
    
    // Check for pivot high
    let isHigh = true;
    for (let j = i - swingLen; j <= i + swingLen; j++) {
      if (j !== i && candles[j].high >= current.high) {
        isHigh = false;
        break;
      }
    }
    if (isHigh) {
      pivots.push({ index: i, type: 'high', price: current.high });
    }
    
    // Check for pivot low
    let isLow = true;
    for (let j = i - swingLen; j <= i + swingLen; j++) {
      if (j !== i && candles[j].low <= current.low) {
        isLow = false;
        break;
      }
    }
    if (isLow) {
      pivots.push({ index: i, type: 'low', price: current.low });
    }
  }
  
  return pivots;
}

// Detect BOS (Break of Structure)
function detectBOS(candles: any[], pivots: any[], swingLen: number = 10, bosLen: number = 10) {
  const signals: { type: 'bullish' | 'bearish'; price: number; index: number; pivotPrice: number }[] = [];
  
  let lastPivotHigh: { price: number; index: number } | null = null;
  let lastPivotLow: { price: number; index: number } | null = null;
  
  // Get the most recent pivots
  for (let i = pivots.length - 1; i >= 0; i--) {
    if (pivots[i].type === 'high' && !lastPivotHigh) {
      lastPivotHigh = { price: pivots[i].price, index: pivots[i].index };
    }
    if (pivots[i].type === 'low' && !lastPivotLow) {
      lastPivotLow = { price: pivots[i].price, index: pivots[i].index };
    }
    if (lastPivotHigh && lastPivotLow) break;
  }
  
  if (!lastPivotHigh || !lastPivotLow) return signals;
  
  // Check for BOS in recent candles
  for (let i = Math.max(lastPivotHigh.index, lastPivotLow.index) + 1; i < candles.length; i++) {
    const candle = candles[i];
    
    // Bullish BOS: price crosses above last pivot high
    if (lastPivotHigh && candle.close > lastPivotHigh.price) {
      // Check if this is within the confirmation window
      if (i - lastPivotHigh.index <= bosLen) {
        signals.push({
          type: 'bullish',
          price: candle.close,
          index: i,
          pivotPrice: lastPivotHigh.price
        });
      }
    }
    
    // Bearish BOS: price crosses below last pivot low
    if (lastPivotLow && candle.close < lastPivotLow.price) {
      // Check if this is within the confirmation window
      if (i - lastPivotLow.index <= bosLen) {
        signals.push({
          type: 'bearish',
          price: candle.close,
          index: i,
          pivotPrice: lastPivotLow.price
        });
      }
    }
  }
  
  return signals;
}

// Send ntfy notification
async function sendNtfyNotification(symbol: string, type: string, direction: string, price: number) {
  try {
    const ntfyTopic = process.env.NTFY_TOPIC || 'trade-alerts';
    const ntfyUrl = process.env.NTFY_URL || 'https://ntfy.sh';
    const notificationTitle = `BOS Alert - ${symbol}`;
    const notificationBody = `${direction.toUpperCase()} BOS at ${price}`;
    
    await fetch(`${ntfyUrl}/${ntfyTopic}`, {
      method: 'POST',
      headers: {
        'Title': notificationTitle,
        'Priority': 'high',
        'Tags': 'bos',
        'Content-Type': 'text/plain'
      },
      body: notificationBody
    });
    
    console.log(`ntfy notification sent for ${symbol} ${direction} BOS at ${price}`);
  } catch (error) {
    console.error('Error sending ntfy notification:', error);
  }
}

// Store alert in Supabase
async function storeAlertInSupabase(symbol: string, type: string, direction: string, price: number) {
  try {
    const { error } = await supabase
      .from('alerts')
      .insert({
        symbol,
        type: 'BOS',
        direction,
        price,
        timestamp: new Date().toISOString(),
        status: 'active',
        details: { detectionMethod: 'automated' }
      });
    
    if (error) {
      console.error('Error storing alert in Supabase:', error);
    }
  } catch (error) {
    console.error('Error storing alert in Supabase:', error);
  }
}

// Check for recent alerts to avoid duplicates
async function isRecentAlert(symbol: string, direction: string, price: number, minutes: number = 30) {
  try {
    const cutoffTime = new Date(Date.now() - minutes * 60 * 1000).toISOString();
    
    const { data, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('symbol', symbol)
      .eq('type', 'BOS')
      .eq('direction', direction)
      .gte('timestamp', cutoffTime);
    
    if (error) {
      console.error('Error checking recent alerts:', error);
      return false;
    }
    
    // Check if there's an alert with similar price (within 0.5%)
    if (data && data.length > 0) {
      for (const alert of data) {
        const priceDiff = Math.abs(alert.price - price) / price;
        if (priceDiff < 0.005) {
          return true; // Recent similar alert exists
        }
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking recent alerts:', error);
    return false;
  }
}

// Main monitoring function
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get('symbols') || 'XAUUSD,EURUSD,BTCUSD,NAS100';
    const symbols = symbolsParam.split(',');
    const swingLen = parseInt(searchParams.get('swingLen') || '10');
    const bosLen = parseInt(searchParams.get('bosLen') || '10');
    const testOnly = searchParams.get('testOnly') === 'true'; // If true, only detect but don't store/notify
    
    console.log(`Starting BOS monitor for symbols: ${symbols.join(', ')}`);
    
    const results = [];
    
    for (const symbol of symbols) {
      try {
        // Fetch market data
        const candles = await fetchMarketData(symbol, '15min', 200);
        
        // Calculate pivots
        const pivots = calculatePivots(candles, swingLen);
        console.log(`${symbol}: Found ${pivots.length} pivots`);
        
        // Detect BOS
        const signals = detectBOS(candles, pivots, swingLen, bosLen);
        console.log(`${symbol}: Found ${signals.length} BOS signals`);
        
        // Get the most recent signal
        const lastSignal = signals.length > 0 ? signals[signals.length - 1] : null;
        
        // Process signals (unless test only mode)
        if (!testOnly) {
          for (const signal of signals) {
            // Check if this is a recent alert (avoid duplicates)
            const isRecent = await isRecentAlert(symbol, signal.type, signal.price, 30);
            
            if (!isRecent) {
              // Store in Supabase
              await storeAlertInSupabase(symbol, 'BOS', signal.type, signal.price);
              
              // Send ntfy notification
              await sendNtfyNotification(symbol, 'BOS', signal.type, signal.price);
              
              results.push({
                symbol,
                type: 'BOS',
                direction: signal.type,
                price: signal.price,
                pivotPrice: signal.pivotPrice,
                timestamp: new Date().toISOString()
              });
            }
          }
        } else {
          // Test mode: return the last detected BOS
          if (lastSignal) {
            results.push({
              symbol,
              type: 'BOS',
              direction: lastSignal.type,
              price: lastSignal.price,
              pivotPrice: lastSignal.pivotPrice,
              timestamp: new Date().toISOString(),
              testMode: true
            });
          }
        }
      } catch (error) {
        console.error(`Error processing ${symbol}:`, error);
        results.push({
          symbol,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results
    });
  } catch (error) {
    console.error('BOS monitor error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
