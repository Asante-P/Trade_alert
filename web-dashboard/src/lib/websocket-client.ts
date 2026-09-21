// WebSocket Client for Real-time Price Updates
// Provides live market data streaming

export interface PriceUpdate {
  symbol: string;
  price: number;
  timestamp: number;
  volume?: number;
  bid?: number;
  ask?: number;
}

export interface WebSocketConfig {
  url: string;
  symbols: string[];
  reconnectInterval: number;
  maxReconnectAttempts: number;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private subscribers: Map<string, Set<(update: PriceUpdate) => void>> = new Map();
  private isConnected = false;

  constructor(config: WebSocketConfig) {
    this.config = config;
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.config.url);
        
        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          
          // Subscribe to symbols
          this.subscribeToSymbols();
          
          resolve();
        };
        
        this.ws.onmessage = (event) => {
          this.handleMessage(event.data);
        };
        
        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };
        
        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.isConnected = false;
          this.attemptReconnect();
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  private subscribeToSymbols() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    
    // Subscribe to multiple symbols
    const subscribeMessage = {
      type: 'subscribe',
      symbols: this.config.symbols
    };
    
    this.ws.send(JSON.stringify(subscribeMessage));
  }

  private handleMessage(data: string) {
    try {
      const message = JSON.parse(data);
      
      if (message.type === 'price_update') {
        const update: PriceUpdate = {
          symbol: message.symbol,
          price: message.price,
          timestamp: message.timestamp || Date.now(),
          volume: message.volume,
          bid: message.bid,
          ask: message.ask
        };
        
        this.notifySubscribers(update);
      }
    } catch (error) {
      console.error('Error parsing WebSocket message:', error);
    }
  }

  private notifySubscribers(update: PriceUpdate) {
    const symbolSubscribers = this.subscribers.get(update.symbol);
    if (symbolSubscribers) {
      symbolSubscribers.forEach(callback => callback(update));
    }
    
    // Also notify all subscribers if they're subscribed to all symbols
    const allSubscribers = this.subscribers.get('*');
    if (allSubscribers) {
      allSubscribers.forEach(callback => callback(update));
    }
  }

  subscribe(symbol: string, callback: (update: PriceUpdate) => void): () => void {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set());
    }
    
    this.subscribers.get(symbol)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const symbolSubscribers = this.subscribers.get(symbol);
      if (symbolSubscribers) {
        symbolSubscribers.delete(callback);
        if (symbolSubscribers.size === 0) {
          this.subscribers.delete(symbol);
        }
      }
    };
  }

  private attemptReconnect() {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }
    
    this.reconnectAttempts++;
    const delay = this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect().catch(error => {
        console.error('Reconnection failed:', error);
      });
    }, delay);
  }

  disconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    this.isConnected = false;
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// Factory function to create WebSocket client for different providers
export function createWebSocketClient(provider: 'binance' | 'forex' | 'custom', symbols: string[]): WebSocketClient {
  let url: string;
  
  switch (provider) {
    case 'binance':
      // Binance WebSocket API (for crypto)
      url = 'wss://stream.binance.com:9443/ws';
      break;
    case 'forex':
      // Example forex WebSocket endpoint (would need actual implementation)
      url = 'wss://api.forexexample.com/stream';
      break;
    case 'custom':
      // Custom WebSocket endpoint
      url = process.env.WEBSOCKET_URL || 'ws://localhost:8080';
      break;
    default:
      url = 'ws://localhost:8080';
  }
  
  return new WebSocketClient({
    url,
    symbols,
    reconnectInterval: 5000,
    maxReconnectAttempts: 10
  });
}

// Fallback polling mechanism for when WebSocket is not available
export class PricePoller {
  private interval: NodeJS.Timeout | null = null;
  private subscribers: Map<string, Set<(update: PriceUpdate) => void>> = new Map();

  constructor(private symbols: string[], private pollInterval: number = 5000) {}

  start(fetchFn: (symbol: string) => Promise<PriceUpdate>) {
    this.interval = setInterval(async () => {
      for (const symbol of this.symbols) {
        try {
          const update = await fetchFn(symbol);
          this.notifySubscribers(update);
        } catch (error) {
          console.error(`Error polling ${symbol}:`, error);
        }
      }
    }, this.pollInterval);
  }

  private notifySubscribers(update: PriceUpdate) {
    const symbolSubscribers = this.subscribers.get(update.symbol);
    if (symbolSubscribers) {
      symbolSubscribers.forEach(callback => callback(update));
    }
  }

  subscribe(symbol: string, callback: (update: PriceUpdate) => void): () => void {
    if (!this.subscribers.has(symbol)) {
      this.subscribers.set(symbol, new Set());
    }
    
    this.subscribers.get(symbol)!.add(callback);
    
    return () => {
      const symbolSubscribers = this.subscribers.get(symbol);
      if (symbolSubscribers) {
        symbolSubscribers.delete(callback);
      }
    };
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}