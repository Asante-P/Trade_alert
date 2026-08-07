require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 3000;

// ntfy.sh configuration
const NTFY_TOPIC = process.env.NTFY_TOPIC || 'trade_alerts';
const NTFY_BASE_URL = 'https://ntfy.sh';

// Finnhub API configuration for live market data
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const FINNHUB_BASE_URL = 'https://finnhub.io/api/v1';

// Send ntfy.sh notification
async function sendNtfyMessage(title, message) {
  try {
    const response = await axios.post(`${NTFY_BASE_URL}/${NTFY_TOPIC}`, message, {
      headers: {
        'Title': title,
        'Priority': 'high',
        'Tags': 'warning,fire'
      }
    });
    console.log('ntfy.sh notification sent successfully');
    return response.data;
  } catch (error) {
    console.error('Error sending ntfy.sh notification:', error.message);
    // Don't throw error, just log it - notification failure shouldn't break the alert system
  }
}

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Firebase Admin initialization - try to load from service account JSON file first
let serviceAccount;
const serviceAccountPath = path.join(__dirname, 'firebase-service-account.json');

if (fs.existsSync(serviceAccountPath)) {
  serviceAccount = require(serviceAccountPath);
  console.log('Loaded Firebase credentials from firebase-service-account.json');
} else {
  serviceAccount = {
    type: process.env.FIREBASE_TYPE,
    project_id: process.env.FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: process.env.FIREBASE_PRIVATE_KEY ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') : '',
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: process.env.FIREBASE_AUTH_URI,
    token_uri: process.env.FIREBASE_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FIREBASE_CLIENT_X509_CERT_URL,
  };
  console.log('Loaded Firebase credentials from environment variables');
}

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// In-memory storage for FCM tokens (in production, use a database)
const fcmTokens = new Set();

// Store alert history
const alertHistory = [];

// Register FCM token
app.post('/register-token', (req, res) => {
  const { token } = req.body;
  if (token) {
    fcmTokens.add(token);
    console.log('Token registered:', token);
    res.json({ success: true, message: 'Token registered' });
  } else {
    res.status(400).json({ success: false, message: 'Token is required' });
  }
});

// Unregister FCM token
app.post('/unregister-token', (req, res) => {
  const { token } = req.body;
  if (token) {
    fcmTokens.delete(token);
    console.log('Token unregistered:', token);
    res.json({ success: true, message: 'Token unregistered' });
  } else {
    res.status(400).json({ success: false, message: 'Token is required' });
  }
});

// TradingView webhook endpoint
app.post('/webhook', async (req, res) => {
  try {
    const alertData = req.body;
    
    console.log('Received TradingView alert:', alertData);

    // Store alert in history
    const alert = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      type: alertData.type || 'UNKNOWN',
      price: alertData.price || 0,
      symbol: alertData.symbol || 'N/A',
      timeframe: alertData.timeframe || 'N/A',
      message: alertData.message || alertData.text || ''
    };
    alertHistory.unshift(alert);
    
    // Keep only last 100 alerts
    if (alertHistory.length > 100) {
      alertHistory.pop();
    }

    // Send push notification to all registered devices
    const message = {
      notification: {
        title: `Trade Alert: ${alert.type}`,
        body: alert.message || `${alert.symbol} - ${alert.type} @ ${alert.price}`
      },
      data: {
        type: alert.type,
        price: alert.price?.toString() || '0',
        symbol: alert.symbol || 'N/A',
        timeframe: alert.timeframe || 'N/A',
        timestamp: alert.timestamp
      }
    };

    const tokens = Array.from(fcmTokens);
    if (tokens.length > 0) {
      const response = await admin.messaging().sendEachForMulticast({
        tokens: tokens,
        notification: message.notification,
        data: message.data
      });
      
      console.log('Push notification sent:', response);
    }

    res.json({ success: true, message: 'Alert processed' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ success: false, message: 'Error processing alert' });
  }
});

// Get alert history
app.get('/alerts', (req, res) => {
  res.json({ alerts: alertHistory });
});

// Market data proxy endpoints
app.get('/api/market-data/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { limit = 100 } = req.query;
    
    const data = await fetchMarketData(symbol, parseInt(limit));
    res.json({ success: true, data, timeframe: '15-minute' });
  } catch (error) {
    console.error('Error fetching market data:', error);
    res.status(500).json({ success: false, message: 'Error fetching market data' });
  }
});

// Helper function to fetch market data
async function fetchMarketData(symbol, limit = 100) {
  const yahooSymbol = getYahooSymbol(symbol);
  
  try {
    // Try Yahoo Finance with 15-minute interval
    const response = await axios.get(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=15m&range=1d`
    );
    
    const data = response.data;
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
    
    console.log(`Fetched ${candles.length} candles from Yahoo Finance for ${symbol}`);
    return candles;
  } catch (error) {
    console.error('Yahoo Finance failed:', error.message);
    console.log('Trying Finnhub API as fallback...');
    return fetchFinnhubData(symbol, limit);
  }
}

// Fallback to Finnhub API
async function fetchFinnhubData(symbol, limit = 100) {
  const finnhubSymbol = getFinnhubSymbol(symbol);
  
  if (!FINNHUB_API_KEY) {
    console.error('FINNHUB_API_KEY not set in environment variables');
    return generateMockData(symbol, limit);
  }
  
  try {
    const response = await axios.get(
      `${FINNHUB_BASE_URL}/stock/candle?symbol=${finnhubSymbol}&resolution=15&count=${limit}&token=${FINNHUB_API_KEY}`
    );
    
    const data = response.data;
    if (!data || data.s !== 'ok') {
      throw new Error(`Finnhub API error: ${data?.s || 'Unknown error'}`);
    }
    
    const candles = [];
    for (let i = 0; i < data.t.length && i < limit; i++) {
      candles.push({
        time: data.t[i],
        open: data.o[i],
        high: data.h[i],
        low: data.l[i],
        close: data.c[i]
      });
    }
    
    console.log(`Fetched ${candles.length} candles from Finnhub for ${symbol}`);
    return candles;
  } catch (error) {
    console.error('Finnhub API failed:', error.message);
    return generateMockData(symbol, limit);
  }
}

function getYahooSymbol(symbol) {
  switch (symbol.toUpperCase()) {
    case 'XAUUSD': return 'GC=F'; // Gold Futures (XAUUSD)
    case 'EURUSD': return 'EURUSD=X';
    case 'BTCUSD': return 'BTC-USD';
    case 'NAS100': return 'NDX'; // NASDAQ 100
    default: return symbol;
  }
}

function getFinnhubSymbol(symbol) {
  switch (symbol.toUpperCase()) {
    case 'XAUUSD': return 'GC=F'; // Gold Futures (XAUUSD)
    case 'EURUSD': return 'EURUSD=X';
    case 'BTCUSD': return 'BINANCE:BTCUSDT'; // Bitcoin on Binance
    case 'NAS100': return 'NDX'; // NASDAQ 100
    default: return symbol;
  }
}

function generateMockData(symbol, limit) {
  const candles = [];
  const now = Date.now();
  const basePrice = getBasePrice(symbol);
  const priceScale = getPriceScale(symbol);
  
  for (let i = 0; i < limit; i++) {
    const time = Math.floor((now - (limit - i) * 15 * 60 * 1000) / 1000); // 15-minute intervals
    const open = basePrice + (Math.random() - 0.5) * priceScale * 2;
    const change = (Math.random() - 0.5) * priceScale * 0.02;
    const close = open + change;
    const high = Math.max(open, close) + Math.random() * priceScale * 0.01;
    const low = Math.min(open, close) - Math.random() * priceScale * 0.01;
    
    candles.push({ time, open, high, low, close });
  }
  
  return candles;
}

function getBasePrice(symbol) {
  switch (symbol.toUpperCase()) {
    case 'XAUUSD': return 4355.67; // Updated to current real price
    case 'EURUSD': return 1.0850;
    case 'BTCUSD': return 65000.0;
    case 'NAS100': return 18500.0;
    default: return 100.0;
  }
}

function getPriceScale(symbol) {
  switch (symbol.toUpperCase()) {
    case 'XAUUSD': return 20.0; // 15min timeframe - smaller price movements
    case 'EURUSD': return 0.005; // Forex moves in smaller increments on 15min
    case 'BTCUSD': return 50.0;
    case 'NAS100': return 25.0;
    default: return 1.0;
  }
}

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    registeredTokens: fcmTokens.size,
    alertCount: alertHistory.length 
  });
});

// BOS Detection System
let priceHistory = [];
const BOS_CONFIG = {
  symbol: 'XAUUSD',
  lookbackPeriod: 40,      // Number of candles to look back for swing highs/lows (40 * 15min = 10 hours)
  pollInterval: 60000,     // Poll every 60 seconds
  minSwingStrength: 0.5    // Minimum price movement to consider as swing point
};

// Detect swing highs and lows
function detectSwingPoints(prices, lookback = 10) {
  const swingPoints = [];
  
  for (let i = lookback; i < prices.length - lookback; i++) {
    const current = prices[i];
    const isSwingHigh = prices.slice(i - lookback, i).every(p => p.high < current.high) &&
                        prices.slice(i + 1, i + lookback + 1).every(p => p.high < current.high);
    
    const isSwingLow = prices.slice(i - lookback, i).every(p => p.low > current.low) &&
                       prices.slice(i + 1, i + lookback + 1).every(p => p.low > current.low);
    
    if (isSwingHigh) {
      swingPoints.push({ type: 'high', price: current.high, time: current.time, index: i });
    }
    if (isSwingLow) {
      swingPoints.push({ type: 'low', price: current.low, time: current.time, index: i });
    }
  }
  
  return swingPoints;
}

// Detect Break of Structure (BOS)
function detectBOS(currentPrice, swingPoints) {
  if (swingPoints.length < 2) return null;
  
  const recentSwings = swingPoints.slice(-5); // Look at last 5 swing points
  const lastSwing = recentSwings[recentSwings.length - 1];
  
  if (!lastSwing) return null;
  
  // Bullish BOS: Price breaks above recent swing high
  if (lastSwing.type === 'high' && currentPrice > lastSwing.price) {
    return {
      type: 'BULLISH_BOS',
      brokenLevel: lastSwing.price,
      currentPrice: currentPrice,
      swingTime: lastSwing.time
    };
  }
  
  // Bearish BOS: Price breaks below recent swing low
  if (lastSwing.type === 'low' && currentPrice < lastSwing.price) {
    return {
      type: 'BEARISH_BOS',
      brokenLevel: lastSwing.price,
      currentPrice: currentPrice,
      swingTime: lastSwing.time
    };
  }
  
  return null;
}

// Send BOS alert to all registered devices
async function sendBOSAlert(bosEvent) {
  const alert = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    type: bosEvent.type,
    price: bosEvent.currentPrice,
    symbol: BOS_CONFIG.symbol,
    message: `${bosEvent.type} on ${BOS_CONFIG.symbol} at $${bosEvent.currentPrice.toFixed(2)}`
  };
  
  alertHistory.unshift(alert);
  if (alertHistory.length > 100) alertHistory.pop();
  
  // Send Firebase push notifications
  const message = {
    notification: {
      title: `BOS Alert: ${bosEvent.type}`,
      body: alert.message
    },
    data: {
      type: bosEvent.type,
      price: bosEvent.currentPrice.toString(),
      symbol: BOS_CONFIG.symbol,
      timestamp: alert.timestamp
    }
  };
  
  const tokens = Array.from(fcmTokens);
  if (tokens.length > 0) {
    try {
      const response = await admin.messaging().sendEachForMulticast({
        tokens: tokens,
        notification: message.notification,
        data: message.data
      });
      console.log('BOS Alert sent via Firebase:', response);
    } catch (error) {
      console.error('Error sending BOS alert via Firebase:', error);
    }
  }
  
  // Send ntfy.sh notification
  const ntfyMessage = `
🚨 BOS Alert
━━━━━━━━━━━━━━━━━━━━
${bosEvent.type}
Symbol: ${BOS_CONFIG.symbol}
Price: $${bosEvent.currentPrice.toFixed(2)}
Time: ${new Date().toLocaleString()}
━━━━━━━━━━━━━━━━━━━━
  `.trim();
  
  await sendNtfyMessage(`BOS Alert: ${bosEvent.type}`, ntfyMessage);
  
  console.log('BOS Detected:', alert);
}

// Start BOS monitoring
async function startBOSMonitoring() {
  console.log('Starting BOS monitoring for', BOS_CONFIG.symbol);
  
  setInterval(async () => {
    try {
      // Fetch latest price data directly using the internal function
      const newPrices = await fetchMarketData(BOS_CONFIG.symbol, 100);
      
      if (newPrices && newPrices.length > 0) {
        // Update price history
        priceHistory = [...priceHistory, ...newPrices];
        
        // Keep only last 100 candles
        if (priceHistory.length > 100) {
          priceHistory = priceHistory.slice(-100);
        }
        
        // Detect swing points
        const swingPoints = detectSwingPoints(priceHistory, BOS_CONFIG.lookbackPeriod);
        
        // Check for BOS
        const currentPrice = newPrices[newPrices.length - 1].close;
        const bosEvent = detectBOS(currentPrice, swingPoints);
        
        if (bosEvent) {
          await sendBOSAlert(bosEvent);
        }
        
        console.log(`BOS check completed. Price history: ${priceHistory.length} candles, Swing points: ${swingPoints.length}`);
      }
    } catch (error) {
      console.error('Error in BOS monitoring:', error.message);
    }
  }, BOS_CONFIG.pollInterval);
}

// Manual test endpoint for BOS alerts
app.post('/test-bos-alert', async (req, res) => {
  try {
    const { type = 'BULLISH_BOS', price = 4355.67 } = req.body;
    
    const testBOS = {
      type: type,
      brokenLevel: price - 20, // Smaller breakout for 15min timeframe
      currentPrice: price,
      swingTime: Date.now()
    };
    
    await sendBOSAlert(testBOS);
    
    // Also send test ntfy message
    try {
      await sendNtfyMessage(`🧪 Test BOS Alert (15min)`, `${type} at $${price.toFixed(2)}`);
    } catch (error) {
      console.log('Test ntfy message failed (non-critical)');
    }
    
    res.json({ 
      success: true, 
      message: 'Test BOS alert sent',
      alert: testBOS,
      ntfyTopic: NTFY_TOPIC,
      timeframe: '15-minute'
    });
  } catch (error) {
    console.error('Error sending test BOS alert:', error);
    res.status(500).json({ success: false, message: 'Error sending test alert' });
  }
});

// Start monitoring after server is ready
setTimeout(() => {
  startBOSMonitoring();
}, 5000);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Webhook endpoint: http://localhost:' + PORT + '/webhook');
});
