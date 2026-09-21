import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'XAUUSD';
    const limit = parseInt(searchParams.get('limit') || '100');
    const interval = searchParams.get('interval') || '15m';
    
    console.log(`Test market data request: symbol=${symbol}, interval=${interval}, limit=${limit}`);
    
    // Return mock data
    const mockCandles = Array.from({ length: Math.min(limit, 50) }, (_, i) => ({
      time: Date.now() / 1000 - (Math.min(limit, 50) - i) * 900,
      open: 2300 + Math.random() * 100,
      high: 2310 + Math.random() * 100,
      low: 2290 + Math.random() * 100,
      close: 2300 + Math.random() * 100,
      currentPrice: 2300 + Math.random() * 100
    }));
    
    const responseData = {
      success: true,
      symbol,
      data: mockCandles,
      currentPrice: mockCandles[mockCandles.length - 1].close,
      timestamp: new Date().toISOString()
    };
    
    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('Test market data error:', error);
    return NextResponse.json({ 
      success: false, 
      message: error instanceof Error ? error.message : 'Error fetching market data',
      data: []
    }, { status: 200 });
  }
}