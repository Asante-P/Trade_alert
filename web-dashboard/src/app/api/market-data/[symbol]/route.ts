import { NextResponse } from 'next/server';

// Simple in-memory cache
const cache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 5000; // 5 seconds for live prices

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

// Map interval to Twelve Data format
const getTwelveDataInterval = (intv: string) => {
  switch (intv) {
    case '1m': return '1min';
    case '5m': return '5min';
    case '15m': return '15min';
    case '30m': return '30min';
    case '1h':
    case '1H': return '1h';
    case '4h':
    case '4H': return '4h';
    case '1d':
    case '1D': return '1day';
    case '1w':
    case '1W': return '1week';
    default: return '15min';
  }
};

// Fetch from Twelve Data API
async function fetchFromTwelveData(symbol: string, interval: string, limit: number) {
  if (!TWELVE_DATA_API_KEY) {
    throw new Error('TWELVE_DATA_API_KEY not configured');
  }

  const tdSymbol = getTwelveDataSymbol(symbol);
  const tdInterval = getTwelveDataInterval(interval);
  
  console.log(`Fetching from Twelve Data: ${symbol} -> ${tdSymbol}, interval: ${tdInterval}`);
  
  const response = await fetch(
    `https://api.twelvedata.com/time_series?symbol=${tdSymbol}&interval=${tdInterval}&outputsize=${limit}&apikey=${TWELVE_DATA_API_KEY}`
  );
  
  const data = await response.json();
  
  if (data.status === 'error') {
    throw new Error(`Twelve Data error: ${data.message}`);
  }
  
  if (!data.values || data.values.length === 0) {
    throw new Error('No data from Twelve Data');
  }
  
  // Convert Twelve Data format to our candle format
  const candles = data.values.map((v: any) => ({
    time: new Date(v.datetime).getTime() / 1000,
    open: parseFloat(v.open),
    high: parseFloat(v.high),
    low: parseFloat(v.low),
    close: parseFloat(v.close),
    currentPrice: parseFloat(v.close)
  })).reverse(); // Twelve Data returns newest first, we want oldest first
  
  const latestPrice = candles[candles.length - 1].currentPrice;
  console.log(`Twelve Data latest price for ${symbol}: ${latestPrice}`);
  
  return { candles, latestPrice };
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
    const interval = searchParams.get('interval') || '15m';
    const { symbol } = await params;
    
    const cacheKey = `${symbol}_${interval}`;
    const cached = cache.get(cacheKey);
    
    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log(`Returning cached data for ${symbol}`);
      return NextResponse.json(cached.data);
    }
    
    // Try Twelve Data first
    try {
      const { candles, latestPrice } = await fetchFromTwelveData(symbol, interval, limit);
      
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
    } catch (twelveDataError) {
      console.error('Twelve Data error, falling back to Yahoo Finance:', twelveDataError);
      
      // Fallback to Yahoo Finance
      const getYahooSymbol = (sym: string) => {
        switch (sym.toUpperCase()) {
          case 'XAUUSD': return 'XAUUSD=X';
          case 'EURUSD': return 'EURUSD=X';
          case 'BTCUSD': return 'BTC-USD';
          case 'NAS100': return '^NDX';
          default: return sym;
        }
      };

      const getAlternativeSymbol = (sym: string) => {
        switch (sym.toUpperCase()) {
          case 'XAUUSD': return 'XAUUSD=X';
          case 'BTCUSD': return 'BTCUSD=X';
          default: return null;
        }
      };

      const getYahooInterval = (intv: string) => {
        switch (intv) {
          case '1m': return '1m';
          case '5m': return '5m';
          case '15m': return '15m';
          case '30m': return '30m';
          case '1h':
          case '1H': return '1h';
          case '4h': return '1d';
          case '4H': return '1d';
          case '1d':
          case '1D': return '1d';
          case '1w':
          case '1W': return '1wk';
          default: return '15m';
        }
      };

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
      
      console.log(`Fetching from Yahoo Finance (fallback): ${symbol} -> ${yahooSymbol}, interval: ${yahooInterval}, range: ${range}`);
      
      let response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=${yahooInterval}&range=${range}`
      );
      
      let data = await response.json();
      let result = data.chart?.result?.[0];
      
      if (!result || 
          (symbol.toUpperCase() === 'XAUUSD' && result.meta?.lastClose < 4000) ||
          (symbol.toUpperCase() === 'BTCUSD' && result.meta?.lastClose < 70000)) {
        const altSymbol = getAlternativeSymbol(symbol);
        if (altSymbol) {
          console.log(`Yahoo Finance primary failed/stale, trying alternative: ${altSymbol}`);
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
          message: 'No data available from any data source' 
        }, { status: 404 });
      }
      
      const latestPrice = result.meta?.regularPrice || result.meta?.lastClose;
      console.log(`Yahoo Finance latest price for ${symbol}: ${latestPrice}`);
      
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
            close: close[i],
            currentPrice: i === timestamp.length - 1 ? latestPrice : close[i]
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
    }
  } catch (error) {
    console.error('Market data fetch error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error fetching market data' 
    }, { status: 500 });
  }
}