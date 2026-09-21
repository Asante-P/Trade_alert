import { NextRequest, NextResponse } from 'next/server';
import { createWebSocketClient, PricePoller } from '@/lib/websocket-client';

// Global WebSocket client instance
let wsClient: any = null;
let pricePoller: PricePoller | null = null;

// Initialize real-time price connection
function initializePriceConnection(symbols: string[]) {
  // Try WebSocket first, fall back to polling
  try {
    wsClient = createWebSocketClient('custom', symbols);
    wsClient.connect().catch(() => {
      console.log('WebSocket connection failed, using polling fallback');
      initializePolling(symbols);
    });
  } catch (error) {
    console.log('WebSocket initialization failed, using polling fallback');
    initializePolling(symbols);
  }
}

function initializePolling(symbols: string[]) {
  pricePoller = new PricePoller(symbols, 5000);
  
  // Fetch function for polling (using Twelve Data API)
  const fetchPrice = async (symbol: string) => {
    const apiKey = process.env.TWELVE_DATA_API_KEY;
    if (!apiKey) {
      throw new Error('TWELVE_DATA_API_KEY not configured');
    }
    
    const tdSymbol = symbol === 'XAUUSD' ? 'XAU/USD' : 
                     symbol === 'EURUSD' ? 'EUR/USD' : 
                     symbol === 'BTCUSD' ? 'BTC/USD' : 
                     symbol === 'NAS100' ? 'US100' : symbol;
    
    const response = await fetch(
      `https://api.twelvedata.com/price?symbol=${tdSymbol}&apikey=${apiKey}`
    );
    
    const data = await response.json();
    
    if (data.status === 'error') {
      throw new Error(data.message);
    }
    
    return {
      symbol,
      price: parseFloat(data.price),
      timestamp: Date.now()
    };
  };
  
  pricePoller.start(fetchPrice);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbolsParam = searchParams.get('symbols') || 'XAUUSD,EURUSD,BTCUSD,NAS100';
    const symbols = symbolsParam.split(',');
    const action = searchParams.get('action') || 'status';
    
    if (action === 'connect') {
      // Initialize real-time connection
      if (!wsClient && !pricePoller) {
        initializePriceConnection(symbols);
      }
      
      return NextResponse.json({
        success: true,
        message: 'Real-time price connection initialized',
        method: wsClient ? 'websocket' : 'polling',
        symbols
      });
    }
    
    if (action === 'disconnect') {
      // Disconnect real-time connection
      if (wsClient) {
        wsClient.disconnect();
        wsClient = null;
      }
      if (pricePoller) {
        pricePoller.stop();
        pricePoller = null;
      }
      
      return NextResponse.json({
        success: true,
        message: 'Real-time price connection disconnected'
      });
    }
    
    if (action === 'status') {
      // Check connection status
      const isConnected = wsClient ? wsClient.getConnectionStatus() : pricePoller !== null;
      
      return NextResponse.json({
        success: true,
        connected: isConnected,
        method: wsClient ? 'websocket' : pricePoller ? 'polling' : 'none',
        symbols
      });
    }
    
    // Default: fetch current prices
    const prices = await Promise.all(
      symbols.map(async (symbol) => {
        try {
          const apiKey = process.env.TWELVE_DATA_API_KEY;
          if (!apiKey) {
            return {
              symbol,
              error: 'API key not configured',
              price: null
            };
          }
          
          const tdSymbol = symbol === 'XAUUSD' ? 'XAU/USD' : 
                           symbol === 'EURUSD' ? 'EUR/USD' : 
                           symbol === 'BTCUSD' ? 'BTC/USD' : 
                           symbol === 'NAS100' ? 'US100' : symbol;
          
          const response = await fetch(
            `https://api.twelvedata.com/price?symbol=${tdSymbol}&apikey=${apiKey}`
          );
          
          const data = await response.json();
          
          if (data.status === 'error') {
            return {
              symbol,
              error: data.message,
              price: null
            };
          }
          
          return {
            symbol,
            price: parseFloat(data.price),
            timestamp: Date.now()
          };
        } catch (error) {
          return {
            symbol,
            error: error instanceof Error ? error.message : 'Unknown error',
            price: null
          };
        }
      })
    );
    
    return NextResponse.json({
      success: true,
      timestamp: Date.now(),
      prices
    });
    
  } catch (error) {
    console.error('Error in realtime prices API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}