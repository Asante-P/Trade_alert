# API Setup Guide for Trade Alert System

This guide walks you through setting up all the external APIs and services needed for the enhanced AI trading system.

## 1. Economic Data API Setup

### Trading Economics API

**Steps to get API key:**
1. Go to [https://tradingeconomics.com/](https://tradingeconomics.com/)
2. Sign up for a free account
3. Navigate to API section
4. Get your API key from the dashboard

**Features available:**
- Real-time economic indicators
- Historical economic data
- Economic calendar
- Market forecasts

**Free tier includes:**
- 500 requests/month
- Basic economic indicators
- Limited historical data

**Configuration:**
```env
TRADING_ECONOMICS_API_KEY=your_actual_api_key_here
```

### FRED API (Federal Reserve Economic Data)

**Steps to get API key:**
1. Go to [https://fred.stlouisfed.org/docs/api/api_key.html](https://fred.stlouisfed.org/docs/api/api_key.html)
2. Click "Request API Key"
3. Fill in the registration form
4. Receive your API key via email

**Features available:**
- US economic indicators
- Interest rates
- GDP data
- Employment statistics
- Inflation data

**Free tier includes:**
- 120 requests/minute
- Unlimited access to all FRED data

**Configuration:**
```env
FRED_API_KEY=your_actual_fred_api_key_here
```

## 2. WebSocket Configuration

### Option A: Binance WebSocket (for crypto)

**Free access:**
- No API key required for public data
- Real-time price streaming
- High frequency updates

**Configuration:**
```env
WEBSOCKET_URL=wss://stream.binance.com:9443/ws
```

### Option B: Custom WebSocket Server

**Set up your own WebSocket server:**
1. Create a Node.js WebSocket server
2. Deploy to your hosting service
3. Configure the URL

**Example WebSocket server setup:**
```javascript
// Simple WebSocket server for streaming prices
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

wss.on('connection', (ws) => {
  // Send price updates
  setInterval(() => {
    const priceUpdate = {
      type: 'price_update',
      symbol: 'XAUUSD',
      price: 1950.50,
      timestamp: Date.now()
    };
    ws.send(JSON.stringify(priceUpdate));
  }, 1000);
});
```

**Configuration:**
```env
WEBSOCKET_URL=ws://your-server.com:8080
WEBSOCKET_API_KEY=your_api_key_if_required
```

### Option C: Forex WebSocket Providers

**Popular providers:**
- **OANDA**: Requires API key
- **FXCM**: Requires account
- **Interactive Brokers**: Requires account

**Configuration:**
```env
WEBSOCKET_URL=wss://api.forex-provider.com/stream
WEBSOCKET_API_KEY=your_provider_api_key
```

## 3. Notification Services Setup

### Email Notifications (Gmail SMTP)

**Steps to set up Gmail SMTP:**
1. Enable 2FA on your Google Account
2. Go to Google Account settings → Security
3. Enable "App Passwords"
4. Generate a new app password for your application
5. Use the app password (not your regular password)

**Configuration:**
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_generated_app_password
NOTIFICATION_EMAIL=your_notification_email@gmail.com
```

**Alternative Email Services:**
- **SendGrid**: Free 100 emails/day
  - Sign up at [sendgrid.com](https://sendgrid.com/)
  - Get API key from dashboard
  - Use SendGrid API instead of SMTP

- **Mailgun**: Free 5,000 emails/month
  - Sign up at [mailgun.com](https://www.mailgun.com/)
  - Get API key from dashboard
  - Use Mailgun API

### SMS Notifications (Twilio)

**Steps to set up Twilio:**
1. Go to [twilio.com](https://www.twilio.com/)
2. Sign up for free account
3. Get Account SID and Auth Token from dashboard
4. Purchase a phone number (or use trial number)
5. Verify your phone number for trial account

**Free tier includes:**
- $15.50 credit to start
- Trial phone number
- SMS to verified numbers only

**Configuration:**
```env
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=+1234567890
NOTIFICATION_PHONE_NUMBER=+0987654321
```

**Alternative SMS Services:**
- **AWS SNS**: Pay-as-you-go
- **Nexmo**: Free trial available
- **Plivo**: Free trial available

### Webhook Notifications

**Steps to set up webhooks:**
1. Create a webhook endpoint on your server
2. Implement POST handler to receive alerts
3. Configure the URL in your application

**Example webhook endpoint:**
```javascript
// Express.js webhook example
app.post('/webhook/alerts', (req, res) => {
  const alert = req.body;
  console.log('Received alert:', alert);
  
  // Process the alert (send to Telegram, Discord, etc.)
  sendToDiscord(alert);
  sendToTelegram(alert);
  
  res.status(200).send('OK');
});
```

**Configuration:**
```env
ALERT_WEBHOOK_URL=https://your-server.com/webhook/alerts
WEBHOOK_SECRET=your_secret_key_for_verification
```

**Popular webhook destinations:**
- **Discord**: Create Discord webhook URL
- **Slack**: Create Slack incoming webhook
- **Telegram**: Use Telegram Bot API
- **Custom**: Your own server endpoint

## 4. Environment Variable Setup

### Step-by-step setup:

1. **Copy the example file:**
```bash
cp .env.example .env.local
```

2. **Edit .env.local with your actual keys:**
```bash
# Economic Data
TRADING_ECONOMICS_API_KEY=your_real_key
FRED_API_KEY=your_real_fred_key

# WebSocket
WEBSOCKET_URL=your_websocket_url

# Email
SMTP_USER=your_email@gmail.com
SMTP_PASSWORD=your_app_password
NOTIFICATION_EMAIL=your_email@gmail.com

# SMS
TWILIO_ACCOUNT_SID=your_sid
TWILIO_AUTH_TOKEN=your_token
TWILIO_PHONE_NUMBER=+1234567890
NOTIFICATION_PHONE_NUMBER=+0987654321

# Webhook
ALERT_WEBHOOK_URL=https://your-webhook.com/alerts
```

3. **Restart your development server:**
```bash
npm run dev
```

## 5. Testing Your Setup

### Test Economic Data APIs:

```bash
# Test Trading Economics
curl "https://api.tradingeconomics.com/country/united%20states?apikey=YOUR_KEY"

# Test FRED API
curl "https://api.stlouisfed.org/fred/series/observations?series_id=GDP&api_key=YOUR_KEY"
```

### Test WebSocket Connection:

Use the new API endpoint:
```bash
curl "http://localhost:3001/api/realtime-prices?action=connect&symbols=XAUUSD,EURUSD"
```

### Test Email Notifications:

Check your notification system:
```bash
curl -X POST http://localhost:3001/api/alerts \
  -H "Content-Type: application/json" \
  -d '{"action":"opportunity","analysis":{...}}'
```

### Test SMS Notifications:

Ensure Twilio credentials are correct by checking your Twilio dashboard.

## 6. Production Deployment

### Vercel Environment Variables:

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add all the environment variables from .env.local
4. Redeploy your application

### Security Best Practices:

- **Never commit .env.local to git**
- **Use different keys for development and production**
- **Rotate API keys regularly**
- **Monitor API usage to avoid rate limits**
- **Use webhook secrets for verification**

## 7. Cost Considerations

### Free Tier Limits:

| Service | Free Tier | Monthly Cost |
|----------|-----------|--------------|
| Trading Economics | 500 requests | $20 for more |
| FRED API | 120 req/min | Free |
| Binance WebSocket | Unlimited | Free |
| Gmail SMTP | Limited | Free |
| Twilio SMS | $15.50 credit | Pay per SMS |
| SendGrid Email | 100 emails/day | Free |
| Vercel Hosting | Hobby plan | Free |

### Estimated Monthly Costs for Active Trading:

- **Economic Data**: $20-50/month
- **SMS Notifications**: $10-30/month (depending on volume)
- **Email Notifications**: Free (Gmail) or $10-20/month (SendGrid)
- **Total**: $40-100/month for comprehensive setup

## 8. Troubleshooting

### Common Issues:

**API Key Not Working:**
- Verify the key is correct
- Check if the key has expired
- Ensure you haven't exceeded rate limits

**WebSocket Connection Failed:**
- Check if the URL is correct
- Verify the server is running
- Check firewall settings

**Email Not Sending:**
- Verify SMTP credentials
- Check if app password is correct (Gmail)
- Ensure email provider allows third-party apps

**SMS Not Sending:**
- Verify Twilio credentials
- Check if phone number is verified (trial account)
- Ensure you have sufficient credit

## 9. Advanced Configuration

### Custom Economic Data Integration:

Create a custom integration in `src/lib/economic-analysis.ts`:

```typescript
async function fetchCustomEconomicData() {
  const response = await fetch('https://your-api.com/data', {
    headers: {
      'Authorization': `Bearer ${process.env.CUSTOM_API_KEY}`
    }
  });
  return response.json();
}
```

### Custom WebSocket Handler:

Extend the WebSocket client for custom protocols:

```typescript
class CustomWebSocketClient extends WebSocketClient {
  protected handleMessage(data: string) {
    // Custom message handling
    const message = JSON.parse(data);
    // Your custom logic
  }
}
```

### Custom Notification Channels:

Add new notification channels in `src/lib/alert-system.ts`:

```typescript
private async sendCustomNotification(alert: TradingAlert) {
  // Your custom notification logic
  await fetch('https://your-service.com/notify', {
    method: 'POST',
    body: JSON.stringify(alert)
  });
}
```

## 10. Monitoring and Maintenance

### Monitor API Usage:

- Check Trading Economics dashboard for usage
- Monitor FRED API call counts
- Track Twilio SMS usage
- Monitor email sending rates

### Set Up Alerts:

- Configure alerts for API rate limits
- Monitor WebSocket connection health
- Track notification delivery rates
- Set up error monitoring

### Regular Maintenance:

- Rotate API keys every 90 days
- Update dependencies regularly
- Monitor costs and optimize usage
- Backup configuration settings

---

**Need Help?**
- Check API documentation for each service
- Review error logs in your application
- Test each service individually before integration
- Start with free tiers before upgrading to paid plans