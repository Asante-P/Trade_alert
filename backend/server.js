require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');
const { 
  registerToken, 
  unregisterToken, 
  getAllTokens, 
  getTokenCount, 
  saveAlert, 
  getAlerts, 
  getAlertCount 
} = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;
console.log('Server starting with ML prediction endpoints enabled');

// Supabase client initialization (optional)
let supabase = null;
const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('Checking Supabase credentials:', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseKey,
  urlLength: supabaseUrl?.length,
  keyLength: supabaseKey?.length
});

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('Supabase client initialized');
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error.message);
  }
} else {
  console.log('Supabase credentials not provided - OB zone monitoring will be disabled');
}

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

// Initialize Firebase only if credentials are available
if (serviceAccount && serviceAccount.project_id) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('Firebase initialized successfully');
} else {
  console.log('Firebase credentials incomplete - Firebase notifications will be disabled');
}

// Register FCM token
app.post('/register-token', (req, res) => {
  const { token, device_info } = req.body;
  if (token) {
    registerToken(token, device_info, (err, result) => {
      if (err) {
        console.error('Error registering token:', err);
        res.status(500).json({ success: false, message: 'Error registering token' });
      } else {
        console.log('Token registered:', token);
        res.json({ success: true, message: 'Token registered' });
      }
    });
  } else {
    res.status(400).json({ success: false, message: 'Token is required' });
  }
});

// Unregister FCM token
app.post('/unregister-token', (req, res) => {
  const { token } = req.body;
  if (token) {
    unregisterToken(token, (err, result) => {
      if (err) {
        console.error('Error unregistering token:', err);
        res.status(500).json({ success: false, message: 'Error unregistering token' });
      } else {
        console.log('Token unregistered:', token);
        res.json({ success: true, message: 'Token unregistered' });
      }
    });
  } else {
    res.status(400).json({ success: false, message: 'Token is required' });
  }
});

// Get alert history
app.get('/alerts', (req, res) => {
  const limit = parseInt(req.query.limit) || 100;
  getAlerts(limit, (err, alerts) => {
    if (err) {
      console.error('Error fetching alerts:', err);
      res.status(500).json({ success: false, message: 'Error fetching alerts' });
    } else {
      res.json({ alerts });
    }
  });
});

// Get performance metrics
app.get('/performance-metrics', (req, res) => {
  const { symbol, days = 30 } = req.query;
  
  getAlerts(1000, (err, alerts) => {
    if (err) {
      console.error('Error fetching alerts for performance metrics:', err);
      res.status(500).json({ success: false, message: 'Error fetching alerts' });
      return;
    }

    // Filter by symbol if specified
    const filteredAlerts = symbol 
      ? alerts.filter(alert => alert.symbol === symbol)
      : alerts;

    // Filter by date range
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
    const recentAlerts = filteredAlerts.filter(alert => 
      new Date(alert.timestamp) >= cutoffDate
    );

    // Calculate performance metrics
    const totalAlerts = recentAlerts.length;
    const bullishAlerts = recentAlerts.filter(a => a.direction === 'bullish').length;
    const bearishAlerts = recentAlerts.filter(a => a.direction === 'bearish').length;
    
    // Calculate win rate (assuming alerts with 'success' field or positive price movement)
    const successfulAlerts = recentAlerts.filter(a => a.success === true || a.result === 'profit').length;
    const winRate = totalAlerts > 0 ? (successfulAlerts / totalAlerts) * 100 : 0;

    // Calculate profit factor (simplified - would need actual trade data)
    const profitableAlerts = recentAlerts.filter(a => a.profit && a.profit > 0);
    const losingAlerts = recentAlerts.filter(a => a.profit && a.profit < 0);
    const totalProfit = profitableAlerts.reduce((sum, a) => sum + (a.profit || 0), 0);
    const totalLoss = Math.abs(losingAlerts.reduce((sum, a) => sum + (a.profit || 0), 0));
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;

    // Calculate average trade duration (if available)
    const alertsWithDuration = recentAlerts.filter(a => a.duration);
    const avgDuration = alertsWithDuration.length > 0
      ? alertsWithDuration.reduce((sum, a) => sum + (a.duration || 0), 0) / alertsWithDuration.length
      : 0;

    // Alert type breakdown
    const alertTypes = {};
    recentAlerts.forEach(alert => {
      const type = alert.type || 'UNKNOWN';
      alertTypes[type] = (alertTypes[type] || 0) + 1;
    });

    // Symbol breakdown
    const symbolBreakdown = {};
    recentAlerts.forEach(alert => {
      const sym = alert.symbol || 'UNKNOWN';
      symbolBreakdown[sym] = (symbolBreakdown[sym] || 0) + 1;
    });

    res.json({
      success: true,
      period: `${days} days`,
      symbol: symbol || 'all',
      metrics: {
        totalAlerts,
        bullishAlerts,
        bearishAlerts,
        winRate: winRate.toFixed(2),
        profitFactor: profitFactor === Infinity ? '∞' : profitFactor.toFixed(2),
        avgDuration: avgDuration.toFixed(2),
        totalProfit: totalProfit.toFixed(2),
        totalLoss: totalLoss.toFixed(2),
      },
      breakdown: {
        alertTypes,
        symbolBreakdown
      },
      recentAlerts: recentAlerts.slice(0, 50) // Return recent alerts for reference
    });
  });
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
    console.error('FINNHUB_API_KEY not set in environment variables - cannot fetch live data');
    return [];
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
    return [];
  }
}

function getYahooSymbol(symbol) {
  switch (symbol.toUpperCase()) {
    case 'XAUUSD': return 'GC=F'; // Gold Futures (XAUUSD)
    case 'EURUSD': return 'EURUSD=X';
    case 'BTCUSD': return 'BTC-USD';
    case 'NAS100': return '^NDX'; // NASDAQ 100 index
    default: return symbol;
  }
}

function getFinnhubSymbol(symbol) {
  switch (symbol.toUpperCase()) {
    case 'XAUUSD': return 'USDXAU=X'; // XAU/USD forex pair
    case 'EURUSD': return 'EURUSD';
    case 'BTCUSD': return 'BINANCE:BTCUSDT'; // Bitcoin on Binance
    case 'NAS100': return 'US100'; // NASDAQ 100
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
  Promise.all([
    new Promise((resolve, reject) => {
      getTokenCount((err, count) => {
        if (err) reject(err);
        else resolve(count);
      });
    }),
    new Promise((resolve, reject) => {
      getAlertCount((err, count) => {
        if (err) reject(err);
        else resolve(count);
      });
    })
  ]).then(([tokenCount, alertCount]) => {
    res.json({ 
      status: 'ok', 
      registeredTokens: tokenCount,
      alertCount: alertCount
    });
  }).catch(error => {
    console.error('Error in health check:', error);
    res.status(500).json({ status: 'error', message: 'Database error' });
  });
});

// Send BOS alert to all registered devices (for notification system)
async function sendBOSAlert(bosEvent) {
  const alert = {
    timestamp: new Date().toISOString(),
    type: bosEvent.type,
    price: bosEvent.currentPrice,
    symbol: 'XAUUSD',
    timeframe: '15m',
    message: `BOS Alert: ${bosEvent.type} at $${bosEvent.currentPrice.toFixed(2)}`
  };
  
  saveAlert(alert, (err) => {
    if (err) {
      console.error('Error saving BOS alert to database:', err);
    }
  });

  // Send Firebase push notifications
  const message = {
    notification: {
      title: `🚨 BOS Alert: ${bosEvent.type}`,
      body: alert.message
    },
    data: {
      type: bosEvent.type,
      price: bosEvent.currentPrice.toString(),
      symbol: 'XAUUSD',
      timestamp: alert.timestamp
    }
  };
  
  getAllTokens((err, tokens) => {
    if (err) {
      console.error('Error getting tokens for BOS alert:', err);
    } else if (tokens.length > 0) {
      // Send to Firebase
      const tokensList = tokens.map(t => t.token);
      admin.messaging().sendEachForMulticast({
        tokens: tokens,
        notification: message.notification,
        data: message.data
      }).then(response => {
        console.log('BOS Alert sent via Firebase:', response);
      }).catch(error => {
        console.error('Error sending BOS alert via Firebase:', error);
      });
    }
  });
  
  // Send ntfy.sh notification
  const ntfyMessage = `
🚨 BOS Alert
━━━━━━━━━━━━━━━━━━━━
${bosEvent.type}
Symbol: XAUUSD
Price: $${bosEvent.currentPrice.toFixed(2)}
Time: ${new Date().toLocaleString()}
━━━━━━━━━━━━━━━━━━━━
  `.trim();
  
  await sendNtfyMessage(`🚨 BOS Alert: ${bosEvent.type}`, ntfyMessage);
  
  console.log('BOS Alert sent:', alert);
}

// OB Zone monitoring and alerting
let activeOBZones = {}; // Object to store OB zones per symbol
let lastOBAlertTime = {}; // Object to store last alert time per symbol
const OB_ALERT_COOLDOWN = 5 * 60 * 1000; // 5 minutes in milliseconds

// Symbol monitoring configuration
const monitoredSymbols = [
  { symbol: 'XAUUSD', enabled: true, alertSettings: { obZones: true, trends: true } },
  { symbol: 'EURUSD', enabled: false, alertSettings: { obZones: true, trends: false } },
  { symbol: 'BTCUSD', enabled: false, alertSettings: { obZones: true, trends: true } },
  { symbol: 'NAS100', enabled: false, alertSettings: { obZones: false, trends: true } }
];

// Fetch OB zones from Supabase
async function fetchOBZonesFromSupabase(symbol = 'XAUUSD') {
  if (!supabase) {
    console.log('Supabase not available, returning empty OB zones');
    return [];
  }

  try {
    const { data, error } = await supabase.functions.invoke('bos-detection', {
      body: {
        symbol: symbol,
        candles: await fetchMarketData(symbol, 100)
      }
    });

    if (error) {
      console.error('Error fetching OB zones from Supabase:', error);
      return [];
    }

    if (data && data.success && data.orderBlocks) {
      console.log(`Fetched ${data.orderBlocks.length} OB zones from Supabase`);
      return data.orderBlocks;
    }

    return [];
  } catch (error) {
    console.error('Error calling Supabase for OB zones:', error);
    return [];
  }
}

// Check if price is in OB zone
function isPriceInOBZone(price, obZone) {
  return price >= obZone.low && price <= obZone.high;
}

// Send OB zone alert
async function sendOBZoneAlert(obZone, currentPrice, symbol = 'XAUUSD') {
  const alertKey = `${symbol}_${obZone.direction}_${obZone.high}_${obZone.low}`;
  const now = Date.now();

  // Check cooldown
  if (lastOBAlertTime[alertKey] && now - lastOBAlertTime[alertKey] < OB_ALERT_COOLDOWN) {
    console.log('OB zone alert on cooldown, skipping');
    return;
  }

  lastOBAlertTime[alertKey] = now;

  const alert = {
    timestamp: new Date().toISOString(),
    type: 'OB_ZONE_ENTRY',
    direction: obZone.direction,
    price: currentPrice,
    zoneHigh: obZone.high,
    zoneLow: obZone.low,
    symbol: symbol,
    message: `${obZone.direction.toUpperCase()} Order Block Zone Reached - Price: $${currentPrice.toFixed(2)}`
  };

  // Save to database
  saveAlert(alert, (err) => {
    if (err) {
      console.error('Error saving OB alert to database:', err);
    }
  });

  // Send push notification
  const message = {
    notification: {
      title: `🎯 OB Zone Alert: ${obZone.direction.toUpperCase()}`,
      body: `${symbol} - ${obZone.direction} OB Zone @ $${currentPrice.toFixed(2)}`
    },
    data: {
      type: 'OB_ZONE_ENTRY',
      direction: obZone.direction,
      price: currentPrice.toString(),
      zoneHigh: obZone.high.toString(),
      zoneLow: obZone.low.toString(),
      symbol: symbol,
      timestamp: alert.timestamp
    }
  };

  getAllTokens((err, tokens) => {
    if (err) {
      console.error('Error getting tokens for OB alert:', err);
    } else if (tokens.length > 0) {
      admin.messaging().sendEachForMulticast({
        tokens: tokens,
        notification: message.notification,
        data: message.data
      }).then(response => {
        console.log('OB Alert sent via Firebase:', response);
      }).catch(error => {
        console.error('Error sending OB alert via Firebase:', error);
      });
    }
  });

  // Send ntfy.sh notification
  const ntfyMessage = `
🎯 OB Zone Alert
━━━━━━━━━━━━━━━━━━━━
${obZone.direction.toUpperCase()} Order Block
Symbol: ${symbol}
Current Price: $${currentPrice.toFixed(2)}
Zone Range: $${obZone.low.toFixed(2)} - $${obZone.high.toFixed(2)}
Time: ${new Date().toLocaleString()}
━━━━━━━━━━━━━━━━━━━━
  `.trim();

  await sendNtfyMessage(`🎯 OB Zone: ${obZone.direction.toUpperCase()}`, ntfyMessage);

  console.log('OB Zone Alert sent:', alert);
}

// Monitor OB zones
async function monitorOBZones(symbol = 'XAUUSD') {
  try {
    // Check if symbol is enabled for monitoring
    const symbolConfig = monitoredSymbols.find(s => s.symbol === symbol);
    if (!symbolConfig || !symbolConfig.enabled || !symbolConfig.alertSettings.obZones) {
      return;
    }

    // Fetch current price
    const marketData = await fetchMarketData(symbol, 5);
    if (marketData.length === 0) {
      console.log(`No market data available for ${symbol} OB monitoring`);
      return;
    }

    const currentPrice = marketData[marketData.length - 1].close;
    console.log(`Current price for ${symbol}: $${currentPrice.toFixed(2)}`);

    // Fetch OB zones from Supabase
    const obZones = await fetchOBZonesFromSupabase(symbol);
    activeOBZones[symbol] = obZones;

    // Check each OB zone
    for (const obZone of obZones) {
      if (isPriceInOBZone(currentPrice, obZone)) {
        console.log(`Price in ${obZone.direction} OB zone for ${symbol}: $${obZone.low.toFixed(2)} - $${obZone.high.toFixed(2)}`);
        await sendOBZoneAlert(obZone, currentPrice, symbol);
      }
    }
  } catch (error) {
    console.error(`Error monitoring OB zones for ${symbol}:`, error);
  }
}

// Start periodic OB zone monitoring for all enabled symbols
function startMultiSymbolMonitoring(intervalSeconds = 60) {
  console.log(`Starting multi-symbol OB zone monitoring every ${intervalSeconds} seconds`);
  
  // Initial check for all enabled symbols
  monitoredSymbols.forEach(symbolConfig => {
    if (symbolConfig.enabled) {
      monitorOBZones(symbolConfig.symbol);
    }
  });
  
  // Periodic checks for all enabled symbols
  setInterval(() => {
    monitoredSymbols.forEach(symbolConfig => {
      if (symbolConfig.enabled) {
        monitorOBZones(symbolConfig.symbol);
      }
    });
  }, intervalSeconds * 1000);
}

// Manual test endpoint for OB zone alerts
app.post('/test-ob-alert', async (req, res) => {
  try {
    const { symbol = 'XAUUSD' } = req.body;
    
    console.log('Manual OB zone check triggered for', symbol);
    await monitorOBZones(symbol);
    
    res.json({ success: true, message: 'OB zone check completed', activeZones: activeOBZones.length });
  } catch (error) {
    console.error('Error in manual OB check:', error);
    res.status(500).json({ success: false, message: 'Error checking OB zones' });
  }
});

// Get active OB zones
app.get('/ob-zones', (req, res) => {
  const { symbol } = req.query;
  if (symbol) {
    res.json({ 
      success: true, 
      symbol: symbol,
      zones: activeOBZones[symbol] || [],
      count: (activeOBZones[symbol] || []).length 
    });
  } else {
    res.json({ 
      success: true, 
      zones: activeOBZones,
      symbols: Object.keys(activeOBZones)
    });
  }
});

// Get monitored symbols configuration
app.get('/monitored-symbols', (req, res) => {
  res.json({ 
    success: true, 
    symbols: monitoredSymbols 
  });
});

// Update symbol monitoring settings
app.post('/monitored-symbols', (req, res) => {
  const { symbol, enabled, alertSettings } = req.body;
  
  const symbolIndex = monitoredSymbols.findIndex(s => s.symbol === symbol);
  if (symbolIndex === -1) {
    return res.status(404).json({ success: false, message: 'Symbol not found' });
  }
  
  if (enabled !== undefined) {
    monitoredSymbols[symbolIndex].enabled = enabled;
  }
  
  if (alertSettings) {
    monitoredSymbols[symbolIndex].alertSettings = { 
      ...monitoredSymbols[symbolIndex].alertSettings, 
      ...alertSettings 
    };
  }
  
  console.log(`Updated ${symbol} monitoring: enabled=${monitoredSymbols[symbolIndex].enabled}, settings=`, monitoredSymbols[symbolIndex].alertSettings);
  
  res.json({ 
    success: true, 
    symbol: monitoredSymbols[symbolIndex] 
  });
});

// Market Scanner - Scan all symbols for opportunities
app.get('/market-scan', async (req, res) => {
  try {
    const scanResults = [];
    
    for (const symbolConfig of monitoredSymbols) {
      try {
        // Fetch market data
        const marketData = await fetchMarketData(symbolConfig.symbol, 50);
        if (marketData.length === 0) continue;
        
        const currentPrice = marketData[marketData.length - 1].close;
        const previousPrice = marketData[marketData.length - 2].close;
        const priceChange = ((currentPrice - previousPrice) / previousPrice) * 100;
        
        // Use TradeRecommender for consistent trend analysis
        const tradeRecommendation = tradeRecommender.generateTradeRecommendation(symbolConfig.symbol, marketData, '15');
        const trend = tradeRecommendation.marketStructure.trend.toLowerCase();
        
        // Fetch OB zones
        const obZones = await fetchOBZonesFromSupabase(symbolConfig.symbol);
        const nearOBZone = obZones.some(zone => 
          Math.abs(currentPrice - zone.low) < (zone.high - zone.low) * 0.1 ||
          Math.abs(currentPrice - zone.high) < (zone.high - zone.low) * 0.1
        );
        
        // ML prediction
        const mlPrediction = mlPredictor.analyzeTrend(marketData);
        
        // Use trade recommendation for signal
        const signal = tradeRecommendation.recommendation === 'BUY' ? 
          (tradeRecommendation.confidence > 70 ? 'STRONG BUY' : 'BUY') :
          tradeRecommendation.recommendation === 'SELL' ? 
          (tradeRecommendation.confidence > 70 ? 'STRONG SELL' : 'SELL') :
          'WATCH';
        
        scanResults.push({
          symbol: symbolConfig.symbol,
          enabled: symbolConfig.enabled,
          currentPrice: currentPrice,
          priceChange: priceChange.toFixed(2),
          trend: trend,
          nearOBZone: nearOBZone,
          obZoneCount: obZones.length,
          signal: signal,
          mlPrediction: mlPrediction
        });
      } catch (error) {
        console.error(`Error scanning ${symbolConfig.symbol}:`, error.message);
      }
    }
    
    res.json({ 
      success: true, 
      timestamp: new Date().toISOString(),
      results: scanResults 
    });
  } catch (error) {
    console.error('Market scan error:', error);
    res.status(500).json({ success: false, message: 'Market scan failed' });
  }
});

// ML Prediction endpoint
app.get('/ml-prediction', async (req, res) => {
  try {
    const { symbol = 'XAUUSD' } = req.query;
    
    // Fetch market data
    const marketData = await fetchMarketData(symbol, 100);
    if (marketData.length === 0) {
      return res.status(404).json({ success: false, message: 'No market data available' });
    }
    
    // Get ML prediction
    const prediction = mlPredictor.analyzeTrend(marketData);
    
    res.json({
      success: true,
      symbol: symbol,
      timestamp: new Date().toISOString(),
      prediction: prediction
    });
  } catch (error) {
    console.error('ML prediction error:', error);
    res.status(500).json({ success: false, message: 'ML prediction failed' });
  }
});

// Trade Recommendation endpoint
app.get('/trade-recommendation', async (req, res) => {
  try {
    const { symbol = 'XAUUSD', timeframe = '15' } = req.query;
    
    // Fetch market data
    const marketData = await fetchMarketData(symbol, 100);
    if (marketData.length === 0) {
      return res.status(404).json({ success: false, message: 'No market data available' });
    }
    
    // Get trade recommendation with timeframe
    const recommendation = tradeRecommender.generateTradeRecommendation(symbol, marketData, timeframe);
    
    res.json({
      success: true,
      symbol: symbol,
      timeframe: timeframe,
      timestamp: new Date().toISOString(),
      recommendation: recommendation
    });
  } catch (error) {
    console.error('Trade recommendation error:', error);
    res.status(500).json({ success: false, message: 'Trade recommendation failed' });
  }
});

// Multi-symbol trade recommendations endpoint
app.get('/trade-recommendations', async (req, res) => {
  try {
    const symbols = req.query.symbols ? req.query.symbols.split(',') : ['XAUUSD', 'EURUSD', 'BTCUSD', 'NAS100'];
    const { timeframe = '15', activeSymbol = 'XAUUSD' } = req.query;
    
    const recommendations = [];
    
    for (const symbol of symbols) {
      try {
        const marketData = await fetchMarketData(symbol, 100);
        if (marketData.length > 0) {
          const recommendation = tradeRecommender.generateTradeRecommendation(symbol, marketData, timeframe);
          recommendations.push(recommendation);
        }
      } catch (error) {
        console.error(`Error processing ${symbol}:`, error.message);
      }
    }
    
    // Sort with active symbol first
    recommendations.sort((a, b) => {
      if (a.symbol === activeSymbol) return -1;
      if (b.symbol === activeSymbol) return 1;
      return a.symbol.localeCompare(b.symbol);
    });
    
    res.json({
      success: true,
      timeframe: timeframe,
      activeSymbol: activeSymbol,
      timestamp: new Date().toISOString(),
      recommendations: recommendations
    });
  } catch (error) {
    console.error('Multi-symbol trade recommendations error:', error);
    res.status(500).json({ success: false, message: 'Multi-symbol trade recommendations failed' });
  }
});

// Generate trading signal based on market conditions
function generateSignal(trend, priceChange, nearOBZone, obZoneCount) {
  if (nearOBZone && trend === 'bullish') return 'STRONG BUY';
  if (nearOBZone && trend === 'bearish') return 'STRONG SELL';
  if (Math.abs(priceChange) > 0.5 && trend === 'bullish') return 'BUY';
  if (Math.abs(priceChange) > 0.5 && trend === 'bearish') return 'SELL';
  if (obZoneCount > 0) return 'WATCH';
  return 'NEUTRAL';
}

// Advanced Trade Recommendation System
class TradeRecommender {
  constructor() {
    this.rsiOversold = 30;
    this.rsiOverbought = 70;
    this.atrPeriod = 14;
    this.supportResistancePeriod = 20;
  }

  calculateATR(data, period = 14) {
    if (data.length < period + 1) return null;
    
    let tr = 0;
    for (let i = 1; i < data.length; i++) {
      const high = data[i].high;
      const low = data[i].low;
      const prevClose = data[i - 1].close;
      const currentTR = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
      tr += currentTR;
    }
    
    return tr / period;
  }

  findSupportResistance(data, period = 20) {
    if (data.length < period) return { support: null, resistance: null };
    
    const recentData = data.slice(-period);
    const highs = recentData.map(c => c.high);
    const lows = recentData.map(c => c.low);
    
    const resistance = Math.max(...highs);
    const support = Math.min(...lows);
    
    return { support, resistance };
  }

  calculatePivotPoints(data) {
    const latest = data[data.length - 1];
    const high = latest.high;
    const low = latest.low;
    const close = latest.close;
    
    const pivot = (high + low + close) / 3;
    const r1 = (2 * pivot) - low;
    const r2 = pivot + (high - low);
    const s1 = (2 * pivot) - high;
    const s2 = pivot - (high - low);
    
    return { pivot, r1, r2, s1, s2 };
  }

  analyzeMarketStructure(data, period = 20) {
    if (data.length < 5) return { trend: 'NEUTRAL', strength: 0 };
    
    const recent = data.slice(-period);
    let higherHighs = 0;
    let higherLows = 0;
    let lowerHighs = 0;
    let lowerLows = 0;
    
    for (let i = 1; i < recent.length; i++) {
      if (recent[i].high > recent[i - 1].high) higherHighs++;
      else lowerHighs++;
      
      if (recent[i].low > recent[i - 1].low) higherLows++;
      else lowerLows++;
    }
    
    const bullishScore = higherHighs + higherLows;
    const bearishScore = lowerHighs + lowerLows;
    
    if (bullishScore > bearishScore * 1.5) return { trend: 'STRONG_BULLISH', strength: bullishScore / (recent.length - 1) };
    if (bearishScore > bullishScore * 1.5) return { trend: 'STRONG_BEARISH', strength: bearishScore / (recent.length - 1) };
    if (bullishScore > bearishScore) return { trend: 'BULLISH', strength: bullishScore / (recent.length - 1) };
    if (bearishScore > bullishScore) return { trend: 'BEARISH', strength: bearishScore / (recent.length - 1) };
    
    return { trend: 'NEUTRAL', strength: 0.5 };
  }

  generateTradeRecommendation(symbol, marketData, timeframe = '15') {
    if (marketData.length < 30) {
      return {
        symbol,
        recommendation: 'HOLD',
        confidence: 0,
        reason: 'Insufficient data for analysis',
        entryPrice: null,
        stopLoss: null,
        takeProfit: null,
        orderType: 'NONE',
        riskRewardRatio: 0
      };
    }

    // Timeframe-specific parameters
    const timeframeParams = this.getTimeframeParameters(timeframe);
    
    const currentPrice = marketData[marketData.length - 1].close;
    const closes = marketData.map(c => c.close);
    
    // Calculate indicators with timeframe-specific periods
    const rsi = this.calculateRSI(closes, timeframeParams.rsiPeriod);
    const atr = this.calculateATR(marketData, timeframeParams.atrPeriod);
    const { support, resistance } = this.findSupportResistance(marketData, timeframeParams.supportResistancePeriod);
    const { pivot, r1, r2, s1, s2 } = this.calculatePivotPoints(marketData);
    const marketStructure = this.analyzeMarketStructure(marketData, timeframeParams.structurePeriod);
    
    // Calculate EMAs with timeframe-specific periods
    const emaShort = this.calculateEMA(closes, timeframeParams.emaShort);
    const emaMedium = this.calculateEMA(closes, timeframeParams.emaMedium);
    const emaLong = this.calculateEMA(closes, timeframeParams.emaLong);
    
    // Determine trend and momentum
    const trend = emaShort > emaMedium ? (emaMedium > emaLong ? 'STRONG_BULLISH' : 'BULLISH') : 
                 (emaMedium < emaLong ? 'STRONG_BEARISH' : 'BEARISH');
    
    let recommendation = 'HOLD';
    let orderType = 'NONE';
    let entryPrice = currentPrice;
    let stopLoss = null;
    let takeProfit = null;
    let confidence = 0;
    let reason = '';
    
    // Advanced analysis logic with timeframe-specific thresholds
    const isOversold = rsi < timeframeParams.rsiOversold;
    const isOverbought = rsi > timeframeParams.rsiOverbought;
    const nearSupport = Math.abs(currentPrice - support) < (atr * timeframeParams.supportThreshold);
    const nearResistance = Math.abs(currentPrice - resistance) < (atr * timeframeParams.resistanceThreshold);
    const nearPivot = Math.abs(currentPrice - pivot) < (atr * timeframeParams.pivotThreshold);
    const nearS1 = Math.abs(currentPrice - s1) < (atr * timeframeParams.supportThreshold);
    const nearR1 = Math.abs(currentPrice - r1) < (atr * timeframeParams.resistanceThreshold);
    
    // Buy conditions
    if (marketStructure.trend.includes('BULLISH') && (isOversold || nearSupport || nearS1)) {
      recommendation = 'BUY';
      confidence = Math.min(90, 60 + (marketStructure.strength * 20) + (isOversold ? 15 : 0));
      
      if (nearSupport && currentPrice > support) {
        orderType = 'BUY_LIMIT';
        entryPrice = support + (atr * 0.2);
        reason = `Price near support level in bullish trend (${timeframe} timeframe) - good buy limit opportunity`;
      } else if (isOversold && marketStructure.trend === 'STRONG_BULLISH') {
        orderType = 'BUY_STOP';
        entryPrice = currentPrice + (atr * 0.5);
        reason = `Oversold in strong bullish trend (${timeframe} timeframe) - buy stop on momentum confirmation`;
      } else {
        orderType = 'MARKET';
        reason = `Bullish trend with favorable conditions (${timeframe} timeframe) - immediate market entry`;
      }
      
      stopLoss = entryPrice - (atr * timeframeParams.stopLossMultiplier);
      takeProfit = entryPrice + (atr * timeframeParams.takeProfitMultiplier);
    }
    // Sell conditions
    else if (marketStructure.trend.includes('BEARISH') && (isOverbought || nearResistance || nearR1)) {
      recommendation = 'SELL';
      confidence = Math.min(90, 60 + (marketStructure.strength * 20) + (isOverbought ? 15 : 0));
      
      if (nearResistance && currentPrice < resistance) {
        orderType = 'SELL_LIMIT';
        entryPrice = resistance - (atr * 0.2);
        reason = `Price near resistance level in bearish trend (${timeframe} timeframe) - good sell limit opportunity`;
      } else if (isOverbought && marketStructure.trend === 'STRONG_BEARISH') {
        orderType = 'SELL_STOP';
        entryPrice = currentPrice - (atr * 0.5);
        reason = `Overbought in strong bearish trend (${timeframe} timeframe) - sell stop on momentum confirmation`;
      } else {
        orderType = 'MARKET';
        reason = `Bearish trend with favorable conditions (${timeframe} timeframe) - immediate market entry`;
      }
      
      stopLoss = entryPrice + (atr * timeframeParams.stopLossMultiplier);
      takeProfit = entryPrice - (atr * timeframeParams.takeProfitMultiplier);
    }
    // Range trading conditions
    else if (nearPivot && Math.abs(rsi - 50) < 10) {
      recommendation = 'HOLD';
      orderType = 'NONE';
      confidence = 40;
      reason = `Market consolidating around pivot (${timeframe} timeframe) - wait for breakout`;
    }
    // Neutral conditions
    else {
      recommendation = 'HOLD';
      orderType = 'NONE';
      confidence = 30;
      reason = `No clear setup (${timeframe} timeframe) - wait for better risk/reward opportunity`;
    }
    
    // Calculate risk/reward ratio
    const riskRewardRatio = stopLoss && takeProfit ? 
      Math.abs(takeProfit - entryPrice) / Math.abs(stopLoss - entryPrice) : 0;
    
    // Adjust confidence based on risk/reward
    if (riskRewardRatio < timeframeParams.minRiskReward) {
      confidence = Math.min(confidence - 20, 50);
      reason += ' (Low risk/reward ratio)';
    }
    
    return {
      symbol,
      recommendation,
      confidence: Math.round(confidence),
      reason,
      entryPrice: parseFloat(entryPrice.toFixed(2)),
      stopLoss: stopLoss ? parseFloat(stopLoss.toFixed(2)) : null,
      takeProfit: takeProfit ? parseFloat(takeProfit.toFixed(2)) : null,
      orderType,
      riskRewardRatio: parseFloat(riskRewardRatio.toFixed(2)),
      currentPrice: parseFloat(currentPrice.toFixed(2)),
      timeframe: timeframe,
      indicators: {
        rsi: parseFloat(rsi.toFixed(2)),
        atr: parseFloat(atr.toFixed(2)),
        emaShort: parseFloat(emaShort.toFixed(2)),
        emaMedium: parseFloat(emaMedium.toFixed(2)),
        emaLong: parseFloat(emaLong.toFixed(2)),
        support: parseFloat(support.toFixed(2)),
        resistance: parseFloat(resistance.toFixed(2)),
        pivot: parseFloat(pivot.toFixed(2))
      },
      marketStructure
    };
  }

  getTimeframeParameters(timeframe) {
    // Different parameters for different timeframes
    const params = {
      '1': { // 1 minute - scalping
        rsiPeriod: 7,
        atrPeriod: 7,
        supportResistancePeriod: 10,
        structurePeriod: 10,
        emaShort: 5,
        emaMedium: 13,
        emaLong: 21,
        rsiOversold: 25,
        rsiOverbought: 75,
        supportThreshold: 0.3,
        resistanceThreshold: 0.3,
        pivotThreshold: 0.2,
        stopLossMultiplier: 1.0,
        takeProfitMultiplier: 1.5,
        minRiskReward: 1.2
      },
      '5': { // 5 minutes - scalping
        rsiPeriod: 10,
        atrPeriod: 10,
        supportResistancePeriod: 15,
        structurePeriod: 15,
        emaShort: 7,
        emaMedium: 17,
        emaLong: 34,
        rsiOversold: 28,
        rsiOverbought: 72,
        supportThreshold: 0.4,
        resistanceThreshold: 0.4,
        pivotThreshold: 0.25,
        stopLossMultiplier: 1.2,
        takeProfitMultiplier: 2.0,
        minRiskReward: 1.3
      },
      '15': { // 15 minutes - day trading (default)
        rsiPeriod: 14,
        atrPeriod: 14,
        supportResistancePeriod: 20,
        structurePeriod: 20,
        emaShort: 9,
        emaMedium: 21,
        emaLong: 50,
        rsiOversold: 30,
        rsiOverbought: 70,
        supportThreshold: 0.5,
        resistanceThreshold: 0.5,
        pivotThreshold: 0.3,
        stopLossMultiplier: 1.5,
        takeProfitMultiplier: 2.5,
        minRiskReward: 1.5
      },
      '60': { // 1 hour - swing trading
        rsiPeriod: 14,
        atrPeriod: 14,
        supportResistancePeriod: 25,
        structurePeriod: 25,
        emaShort: 12,
        emaMedium: 26,
        emaLong: 55,
        rsiOversold: 32,
        rsiOverbought: 68,
        supportThreshold: 0.6,
        resistanceThreshold: 0.6,
        pivotThreshold: 0.35,
        stopLossMultiplier: 1.8,
        takeProfitMultiplier: 3.0,
        minRiskReward: 1.6
      },
      '240': { // 4 hours - swing trading
        rsiPeriod: 14,
        atrPeriod: 20,
        supportResistancePeriod: 30,
        structurePeriod: 30,
        emaShort: 15,
        emaMedium: 30,
        emaLong: 60,
        rsiOversold: 35,
        rsiOverbought: 65,
        supportThreshold: 0.7,
        resistanceThreshold: 0.7,
        pivotThreshold: 0.4,
        stopLossMultiplier: 2.0,
        takeProfitMultiplier: 3.5,
        minRiskReward: 1.7
      },
      'D': { // Daily - position trading
        rsiPeriod: 14,
        atrPeriod: 20,
        supportResistancePeriod: 40,
        structurePeriod: 40,
        emaShort: 20,
        emaMedium: 50,
        emaLong: 100,
        rsiOversold: 40,
        rsiOverbought: 60,
        supportThreshold: 0.8,
        resistanceThreshold: 0.8,
        pivotThreshold: 0.5,
        stopLossMultiplier: 2.5,
        takeProfitMultiplier: 4.0,
        minRiskReward: 1.8
      }
    };
    
    return params[timeframe] || params['15']; // Default to 15-minute timeframe
  }

  calculateRSI(data, period = 14) {
    if (data.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const change = data[data.length - i] - data[data.length - i - 1];
      if (change > 0) gains += change;
      else losses -= change;
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  calculateEMA(data, period) {
    if (data.length < period) return data[data.length - 1];
    const k = 2 / (period + 1);
    let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
    
    for (let i = period; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
    }
    
    return ema;
  }
}

const tradeRecommender = new TradeRecommender();

// Machine Learning - Simple Moving Average Crossover Strategy
class MLTrendPredictor {
  constructor() {
    this.shortPeriod = 9;
    this.longPeriod = 21;
    this.signalPeriod = 7;
  }

  calculateSMA(data, period) {
    if (data.length < period) return null;
    const slice = data.slice(-period);
    return slice.reduce((a, b) => a + b, 0) / period;
  }

  calculateEMA(data, period) {
    if (data.length < period) return null;
    const k = 2 / (period + 1);
    let ema = data.slice(0, period).reduce((a, b) => a + b, 0) / period;
    
    for (let i = period; i < data.length; i++) {
      ema = data[i] * k + ema * (1 - k);
    }
    
    return ema;
  }

  calculateRSI(data, period = 14) {
    if (data.length < period + 1) return null;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i <= period; i++) {
      const change = data[data.length - i] - data[data.length - i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses -= change;
      }
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
  }

  calculateMACD(data) {
    const ema12 = this.calculateEMA(data, 12);
    const ema26 = this.calculateEMA(data, 26);
    
    if (!ema12 || !ema26) return null;
    
    const macd = ema12 - ema26;
    return macd;
  }

  analyzeTrend(data) {
    if (data.length < this.longPeriod) {
      return { prediction: 'NEUTRAL', confidence: 0, signals: [] };
    }

    const closes = data.map(d => d.close || d);
    
    // Calculate indicators
    const shortEMA = this.calculateEMA(closes, this.shortPeriod);
    const longEMA = this.calculateEMA(closes, this.longPeriod);
    const rsi = this.calculateRSI(closes);
    const macd = this.calculateMACD(closes);
    
    const signals = [];
    let bullishScore = 0;
    let bearishScore = 0;

    // EMA Crossover Signal
    if (shortEMA && longEMA) {
      if (shortEMA > longEMA) {
        bullishScore += 2;
        signals.push({ type: 'EMA_CROSS', direction: 'bullish', strength: 'strong' });
      } else {
        bearishScore += 2;
        signals.push({ type: 'EMA_CROSS', direction: 'bearish', strength: 'strong' });
      }
    }

    // RSI Signal
    if (rsi !== null) {
      if (rsi < 30) {
        bullishScore += 2;
        signals.push({ type: 'RSI', direction: 'bullish', strength: 'strong', value: rsi });
      } else if (rsi < 40) {
        bullishScore += 1;
        signals.push({ type: 'RSI', direction: 'bullish', strength: 'moderate', value: rsi });
      } else if (rsi > 70) {
        bearishScore += 2;
        signals.push({ type: 'RSI', direction: 'bearish', strength: 'strong', value: rsi });
      } else if (rsi > 60) {
        bearishScore += 1;
        signals.push({ type: 'RSI', direction: 'bearish', strength: 'moderate', value: rsi });
      }
    }

    // MACD Signal
    if (macd !== null) {
      if (macd > 0) {
        bullishScore += 1;
        signals.push({ type: 'MACD', direction: 'bullish', strength: 'moderate', value: macd });
      } else {
        bearishScore += 1;
        signals.push({ type: 'MACD', direction: 'bearish', strength: 'moderate', value: macd });
      }
    }

    // Price Momentum
    const recentChange = (closes[closes.length - 1] - closes[closes.length - 5]) / closes[closes.length - 5] * 100;
    if (recentChange > 0.5) {
      bullishScore += 1;
      signals.push({ type: 'MOMENTUM', direction: 'bullish', strength: 'moderate', value: recentChange });
    } else if (recentChange < -0.5) {
      bearishScore += 1;
      signals.push({ type: 'MOMENTUM', direction: 'bearish', strength: 'moderate', value: recentChange });
    }

    // Calculate prediction
    const totalScore = bullishScore + bearishScore;
    const confidence = totalScore > 0 ? Math.max(bullishScore, bearishScore) / totalScore : 0;
    
    let prediction = 'NEUTRAL';
    if (bullishScore > bearishScore && bullishScore >= 2) {
      prediction = bullishScore >= 4 ? 'STRONG_BULLISH' : 'BULLISH';
    } else if (bearishScore > bullishScore && bearishScore >= 2) {
      prediction = bearishScore >= 4 ? 'STRONG_BEARISH' : 'BEARISH';
    }

    return {
      prediction,
      confidence: Math.round(confidence * 100),
      signals,
      indicators: {
        shortEMA: shortEMA?.toFixed(2) || null,
        longEMA: longEMA?.toFixed(2) || null,
        rsi: rsi?.toFixed(2) || null,
        macd: macd?.toFixed(2) || null
      }
    };
  }
}

// Initialize ML predictor
const mlPredictor = new MLTrendPredictor();

// Manual test endpoint for BOS alerts (for testing notification system)
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

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`BOS detection handled by Supabase Edge Functions (Pine Script accurate)`);
  console.log(`Multi-symbol OB zone monitoring active`);
  
  // Start multi-symbol OB zone monitoring
  startMultiSymbolMonitoring(60); // Monitor all enabled symbols every 60 seconds
});
