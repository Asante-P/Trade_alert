import { NextResponse } from 'next/server';

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 30000; // 30 seconds

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const interval = searchParams.get('interval') || '15m';
    const { symbol } = await params;
    
    // Symbol mapping for Yahoo Finance
    const getYahooSymbol = (sym: string) => {
      switch (sym.toUpperCase()) {
        case 'XAUUSD': return 'GC=F'; // Gold Futures - may differ from spot
        case 'EURUSD': return 'EURUSD=X';
        case 'BTCUSD': return 'BTC-USD';
        case 'NAS100': return '^NDX';
        default: return sym;
      }
    };

    // Alternative symbol mapping for more accurate spot prices
    const getAlternativeSymbol = (sym: string) => {
      switch (sym.toUpperCase()) {
        case 'XAUUSD': return 'XAUUSD=X'; // Try spot gold if available
        default: return null;
      }
    };

    // Map interval to Yahoo Finance format
    const getYahooInterval = (intv: string) => {
      switch (intv) {
        case '1m': return '1m';
        case '5m': return '5m';
        case '15m': return '15m';
        case '30m': return '30m';
        case '1h': return '1h';
        case '1H': return '1h';
        case '4h': return '1d'; // Yahoo doesn't have 4h, use daily
        case '4H': return '1d';
        case '1d': return '1d';
        case '1D': return '1d';
        case '1w': return '1wk';
        case '1W': return '1wk';
        default: return '15m';
      }
    };

    // Map range based on interval to get enough data
    const getRange = (intv: string) => {
      switch (intv) {
        case '1m': return '5d';
        case '5m': return '1mo';
        case '15m': return '1mo';
        case '30m': return '3mo';
        case '1h':
        case '1H': return '3mo';
        case '4h':
        case '4H': return '1y';
        case '1d':
        case '1D': return '2y';
        case '1w':
        case '1W': return '5y';
        default: return '1mo';
      }
    };

    const yahooSymbol = getYahooSymbol(symbol);
    const yahooInterval = getYahooInterval(interval);
    const range = getRange(interval);
    
    const cacheKey = `${symbol}_${interval}_${range}`;
    const cached = cache.get(cacheKey);
    
    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`Returning cached data for ${symbol}`);
      return NextResponse.json(cached.data);
    }
    
    console.log(`Fetching market data for ${symbol} -> ${yahooSymbol}, interval: ${yahooInterval}, range: ${range}`);
    
    let response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=${yahooInterval}&range=${range}`
    );
    
    let data = await response.json();
    let result = data.chart?.result?.[0];
    
    // If primary symbol fails or returns stale data, try alternative for XAUUSD
    if (!result || (symbol.toUpperCase() === 'XAUUSD' && result.meta?.lastClose < 4000)) {
      const altSymbol = getAlternativeSymbol(symbol);
      if (altSymbol) {
        console.log(`Primary symbol failed or returned stale data, trying alternative: ${altSymbol}`);
        response = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${altSymbol}?interval=${yahooInterval}&range=${range}`
        );
        data = await response.json();
        result = data.chart?.result?.[0];
      }
    }
    
    if (!result) {
      console.error(`No data from Yahoo Finance for ${yahooSymbol}`, data);
      return NextResponse.json({ 
        success: false, 
        message: 'No data available from Yahoo Finance' 
      }, { status: 404 });
    }
    
    // Log the latest price for debugging
    const meta = result.meta;
    const latestPrice = meta?.regularPrice || meta?.lastClose;
    console.log(`Latest price for ${symbol} (${yahooSymbol}): ${latestPrice}, currency: ${meta?.currency}`);
    
    const timestamp = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};
    const open = quotes.open || [];
    const high = quotes.high || [];
    const low = quotes.low || [];
    const close = quotes.close || [];
    
    const candles = [];
    for (let i = 0; i < timestamp.length && i < limit; i++) {
      if (open[i] != null && high[i] != null && low[i] != null && close[i] != null) {
        candles.push({
          time: timestamp[i],
          open: open[i],
          high: high[i],
          low: low[i],
          close: close[i]
        });
      }
    }
    
    const responseData = {
      success: true,
      symbol,
      data: candles,
      currentPrice: latestPrice,
      timestamp: new Date().toISOString()
    };
    
    // Cache the response
    cache.set(cacheKey, { data: responseData, timestamp: Date.now() });
    
    return NextResponse.json(responseData);
  } catch (error) {
    console.error('Market data fetch error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error fetching market data from Yahoo Finance' 
    }, { status: 500 });
  }
}