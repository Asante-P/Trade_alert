import { NextRequest, NextResponse } from 'next/server';

// Simple ML predictor class (simplified from backend)
class MLPredictor {
  analyzeTrend(marketData: any[]) {
    if (marketData.length < 20) {
      return {
        prediction: 'NEUTRAL',
        confidence: 0,
        trend: 'NEUTRAL',
        signal: 'HOLD'
      };
    }

    const closes = marketData.map((d: any) => d.close);
    const sma20 = closes.slice(-20).reduce((a: number, b: number) => a + b, 0) / 20;
    const currentPrice = closes[closes.length - 1];
    
    let bullishSignals = 0;
    let bearishSignals = 0;

    // Trend analysis
    if (currentPrice > sma20) bullishSignals++;
    else bearishSignals++;

    // Momentum
    const recentChange = (closes[closes.length - 1] - closes[closes.length - 5]) / closes[closes.length - 5];
    if (recentChange > 0.01) bullishSignals++;
    else if (recentChange < -0.01) bearishSignals++;

    // Volatility
    const highs = marketData.slice(-10).map((d: any) => d.high);
    const lows = marketData.slice(-10).map((d: any) => d.low);
    const volatility = (Math.max(...highs) - Math.min(...lows)) / currentPrice;
    
    const prediction = bullishSignals > bearishSignals ? 'BULLISH' : 
                      bearishSignals > bullishSignals ? 'BEARISH' : 'NEUTRAL';
    const confidence = Math.min(85, Math.abs(bullishSignals - bearishSignals) * 25 + 40);

    return {
      prediction,
      confidence,
      trend: prediction,
      signal: prediction === 'BULLISH' ? 'BUY' : prediction === 'BEARISH' ? 'SELL' : 'HOLD',
      currentPrice,
      sma20,
      volatility
    };
  }
}

const mlPredictor = new MLPredictor();

// Market data fetching
async function fetchMarketData(symbol: string, limit: number = 100) {
  const getYahooSymbol = (sym: string) => {
    switch (sym.toUpperCase()) {
      case 'XAUUSD': return 'GC=F';
      case 'EURUSD': return 'EURUSD=X';
      case 'BTCUSD': return 'BTC-USD';
      case 'NAS100': return '^NDX';
      default: return sym;
    }
  };

  try {
    const yahooSymbol = getYahooSymbol(symbol);
    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=15m&range=1d`
    );
    
    const data = await response.json();
    const result = data.chart?.result?.[0];
    if (!result) throw new Error('No data from Yahoo Finance');
    
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
    
    return candles;
  } catch (error) {
    console.error('Market data fetch error:', error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol') || 'XAUUSD';
    
    const marketData = await fetchMarketData(symbol, 100);
    if (marketData.length === 0) {
      return NextResponse.json({ 
        success: false, 
        message: 'No market data available' 
      }, { status: 404 });
    }
    
    const prediction = mlPredictor.analyzeTrend(marketData);
    
    return NextResponse.json({
      success: true,
      symbol,
      timestamp: new Date().toISOString(),
      prediction
    });
  } catch (error) {
    console.error('ML prediction error:', error);
    return NextResponse.json({ 
      success: false, 
      message: 'ML prediction failed' 
    }, { status: 500 });
  }
}
