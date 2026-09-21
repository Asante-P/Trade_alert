# Quick Start Guide - Setting Up Your Trading System APIs

This guide provides step-by-step instructions for setting up the three main API integrations for your enhanced AI trading system.

## 🚀 Quick Setup Overview

You need to configure 3 main services:
1. **Economic Data APIs** (Trading Economics, FRED)
2. **WebSocket for Real-time Data** (Live price streaming)
3. **Notification Services** (Email, SMS, Webhooks)

---

## 1️⃣ ECONOMIC DATA API SETUP

### Option A: Finance Calendar API (Recommended - Free!)

**No API Key Required!**

Finance Calendar API is completely free and requires no setup:

**Step 1: No Configuration Needed**
The system uses Finance Calendar API by default - no API key required!

**Step 2: Test Integration**
```bash
curl "https://www.financecalendar.com/wp-json/fc/v1/today"
```

**Features:**
- ✅ Free (no API key)
- ✅ No rate limits (5-minute cache)
- ✅ CORS enabled
- ✅ Real-time economic data
- ✅ Verified times against official sources
- ✅ JSON format

**Cost:** $0/month

---

### Option B: Trading Economics (Optional)

**Step 1: Get API Key**
1. Visit https://tradingeconomics.com/
2. Click "Sign Up" → Create free account
3. Go to Dashboard → API section
4. Copy your API key

**Step 2: Configure in .env.local**
```env
TRADING_ECONOMICS_API_KEY=your_actual_api_key_here
```

**Step 3: Test Integration**
```bash
curl "https://api.tradingeconomics.com/country/united%20states?apikey=YOUR_KEY"
```

**Free Tier:** 500 requests/month
**Cost:** $20/month for more requests

---

### Option C: FRED API (Optional)

**Step 1: Get API Key**
1. Visit https://fred.stlouisfed.org/docs/api/api_key.html
2. Click "Request API Key"
3. Fill in registration form
4. Receive key via email

**Step 2: Configure in .env.local**
```env
FRED_API_KEY=your_actual_fred_key_here
```

**Step 3: Test Integration**
```bash
curl "https://api.stlouisfed.org/fred/series/observations?series_id=GDP&api_key=YOUR_KEY"
```

**Free Tier:** 120 requests/minute (unlimited access)
**Cost:** Free

---

## 2️⃣ WEBSOCKET REAL-TIME DATA SETUP

### Option A: Binance WebSocket (Free, Crypto Only)

**Step 1: No API Key Required**
```env
WEBSOCKET_URL=wss://stream.binance.com:9443/ws
```

**Step 2: Test Connection**
```bash
curl "http://localhost:3001/api/realtime-prices?action=connect&symbols=BTCUSD"
```

**Cost:** Free
**Limitations:** Crypto only, no forex

---

### Option B: Custom WebSocket Server

**Step 1: Set Up Simple WebSocket Server**
Create a file `websocket-server.js`:
```javascript
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  console.log('Client connected');
  
  // Send price updates every second
  setInterval(() => {
    const priceUpdate = {
      type: 'price_update',
      symbol: 'XAUUSD',
      price: 1950.50 + Math.random() * 10,
      timestamp: Date.now()
    };
    ws.send(JSON.stringify(priceUpdate));
  }, 1000);
});

console.log('WebSocket server running on port 8080');
```

**Step 2: Run Server**
```bash
npm install ws
node websocket-server.js
```

**Step 3: Configure in .env.local**
```env
WEBSOCKET_URL=ws://localhost:8080
```

**Cost:** Free (your own server)

---

### Option C: Commercial Forex WebSocket

**Recommended Providers:**
- **OANDA**: https://developer.oanda.com/
- **FXCM**: https://www.fxcm.com/markets/services/api/
- **Interactive Brokers**: https://www.interactivebrokers.com/

**Setup Process:**
1. Create account with provider
2. Get API credentials
3. Configure WebSocket URL
4. Add API key to .env.local

**Cost:** Varies by provider

---

## 3️⃣ NOTIFICATION SERVICES SETUP

### Email Notifications (Gmail SMTP)

**Step 1: Enable Gmail App Password**
1. Go to Google Account → Security
2. Enable 2-Step Verification
3. Go to App Passwords → Generate new app password
4. Name it "Trade Alert System"
5. Copy the 16-character password

**Step 2: Configure in .env.local**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_16_char_app_password
NOTIFICATION_EMAIL=your_email@gmail.com
```

**Step 3: Test Email**
```bash
curl -X POST http://localhost:3001/api/alerts \
  -H "Content-Type: application/json" \
  -d '{"action":"opportunity","analysis":{"symbol":"XAUUSD","score":70}}'
```

**Cost:** Free
**Alternative:** SendGrid (100 emails/day free)

---

### SMS Notifications (Twilio)

**Step 1: Set Up Twilio Account**
1. Visit https://www.twilio.com/
2. Sign up for free account
3. Get Account SID and Auth Token from dashboard
4. Get a phone number (trial or purchased)

**Step 2: Configure in .env.local**
```env
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_PHONE_NUMBER=+1234567890
NOTIFICATION_PHONE_NUMBER=+0987654321
```

**Step 3: Test SMS**
The system will automatically send SMS when alerts are triggered.

**Cost:** $15.50 free credit, then pay per SMS

---

### Webhook Notifications

**Step 1: Create Webhook Endpoint**
Set up a simple server to receive webhooks:
```javascript
const express = require('express');
const app = express();

app.use(express.json());

app.post('/webhook/alerts', (req, res) => {
  console.log('Received alert:', req.body);
  // Process alert (send to Discord, Slack, etc.)
  res.status(200).send('OK');
});

app.listen(3000, () => console.log('Webhook server running'));
```

**Step 2: Configure in .env.local**
```env
ALERT_WEBHOOK_URL=https://your-server.com/webhook/alerts
WEBHOOK_SECRET=your_secret_key
```

**Cost:** Free (your own server)

---

## 📋 COMPLETE .ENV.LOCAL TEMPLATE

Copy this template and fill in your actual keys:

```env
# Economic Data APIs
TRADING_ECONOMICS_API_KEY=your_trading_economics_key
FRED_API_KEY=your_fred_key

# WebSocket Configuration
WEBSOCKET_URL=wss://stream.binance.com:9443/ws

# Email Notifications (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
NOTIFICATION_EMAIL=your_email@gmail.com

# SMS Notifications (Twilio)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_PHONE_NUMBER=+1234567890
NOTIFICATION_PHONE_NUMBER=+0987654321

# Webhook Notifications
ALERT_WEBHOOK_URL=https://your-server.com/webhook/alerts
WEBHOOK_SECRET=your_secret_key
```

---

## 🧪 TESTING YOUR SETUP

### Test Economic Data
```bash
# Test Trading Economics
curl "https://api.tradingeconomics.com/country/united%20states?apikey=YOUR_KEY"

# Test FRED
curl "https://api.stlouisfed.org/fred/series/observations?series_id=GDP&api_key=YOUR_KEY"
```

### Test WebSocket
```bash
curl "http://localhost:3001/api/realtime-prices?action=connect&symbols=XAUUSD"
```

### Test Notifications
```bash
# Test email
curl -X POST http://localhost:3001/api/alerts \
  -H "Content-Type: application/json" \
  -d '{"action":"opportunity","analysis":{"symbol":"XAUUSD","score":70}}'
```

---

## 🔧 TROUBLESHOOTING

### Economic Data Not Working
- Verify API key is correct
- Check if you've exceeded rate limits
- Ensure the API service is operational

### WebSocket Connection Failed
- Check if the URL is correct
- Verify the server is running
- Check firewall settings

### Email Not Sending
- Verify SMTP credentials (use app password for Gmail)
- Check if email provider allows third-party apps
- Ensure recipient email is correct

### SMS Not Sending
- Verify Twilio credentials
- Check if phone number is verified (trial account)
- Ensure you have sufficient credit

---

## 💡 COST SUMMARY

### Free Setup (Recommended - No API Keys Required!)
- **Economic Data:** Finance Calendar API (Free, no API key)
- **WebSocket:** Binance (Free, crypto only)
- **Email:** Gmail SMTP (Free)
- **SMS:** Skip (use email only)
- **Total Cost:** $0/month

### Recommended Setup
- **Economic Data:** Finance Calendar API (Free) + optional Trading Economics ($20/month)
- **WebSocket:** Custom server ($0/month)
- **Email:** Gmail SMTP ($0/month)
- **SMS:** Twilio ($10-30/month)
- **Total Cost:** $10-50/month

### Professional Setup
- **Economic Data:** Finance Calendar API (Free) + Trading Economics Pro ($50/month)
- **WebSocket:** Commercial forex provider ($50-100/month)
- **Email:** SendGrid ($10-20/month)
- **SMS:** Twilio ($20-50/month)
- **Total Cost:** $130-170/month

---

## 🚀 NEXT STEPS

1. **Copy the template:** `cp .env.example .env.local`
2. **Add your API keys** to `.env.local`
3. **Test each service** individually
4. **Restart your dev server:** `npm run dev`
5. **Monitor logs** for any connection issues
6. **Deploy to production** with Vercel environment variables

---

## 📚 ADDITIONAL RESOURCES

- **Trading Economics Docs:** https://tradingeconomics.com/api/
- **FRED API Docs:** https://fred.stlouisfed.org/docs/api/fred/
- **Twilio Docs:** https://www.twilio.com/docs/sms
- **Nodemailer Docs:** https://nodemailer.com/
- **WebSocket Guide:** See `API_SETUP_GUIDE.md` for detailed setup

---

**Need Help?** Check the detailed `API_SETUP_GUIDE.md` for comprehensive setup instructions for each service.