import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '100');
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

    const yahooSymbol = getYahooSymbol(symbol);
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=15m&range=1d`
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