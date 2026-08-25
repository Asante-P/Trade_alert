import { NextResponse } from 'next/server';

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
        case 'XAUUSD': return 'GC=F';
        case 'EURUSD': return 'EURUSD=X';
        case 'BTCUSD': return 'BTC-USD';
        case 'NAS100': return '^NDX';
        default: return sym;
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
    
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=${yahooInterval}&range=${range}`
    );
    
    const data = await response.json();
    const result = data.chart?.result?.[0];
    
    if (!result) {
      return NextResponse.json({ 
        success: false, 
        message: 'No data available from Yahoo Finance' 
      }, { status: 404 });
    }
    
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
    
    return NextResponse.json({
      success: true,
      symbol,
      data: candles,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Market data fetch error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'Error fetching market data from Yahoo Finance' 
    }, { status: 500 });
  }
}