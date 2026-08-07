# Trade Alert - Flutter TradingView Notification App

A Flutter application that receives push notifications on your phone when TradingView alerts trigger, specifically for BOS (Break of Structure) and price reaching zones.

## Architecture

- **Flutter App**: Mobile app to receive and display alerts
- **Node.js Backend**: Server to receive TradingView webhooks and send push notifications via Firebase Cloud Messaging (FCM)
- **Firebase Cloud Messaging**: Push notification service
- **TradingView**: Sends webhook alerts to the backend server

## Setup Instructions

### 1. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable Cloud Messaging:
   - Go to Project Settings
   - Click on Cloud Messaging tab
   - Enable Cloud Messaging API
4. Add an Android app:
   - Download `google-services.json`
   - Place it in `flutter/android/app/`
5. Generate a private key for the backend:
   - Go to Project Settings -> Service Accounts
   - Click "Generate New Private Key"
   - Save the JSON file
   - Copy the contents to `backend/.env`

### 2. Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and fill in your Firebase credentials from the private key JSON file.

4. Start the server:
   ```bash
   npm start
   ```
   Or for development with auto-reload:
   ```bash
   npm run dev
   ```

The server will run on `http://localhost:3000` by default.

### 3. Expose Server to Internet (for TradingView Webhooks)

TradingView webhooks need a public URL. Use one of these services:

**Option A: ngrok (Recommended for testing)**
```bash
ngrok http 3000
```
Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)

**Option B: Deploy to a cloud server**
- Deploy to VPS (DigitalOcean, AWS, etc.)
- Use your server's public IP/domain

### 4. Flutter App Setup

1. Navigate to the Flutter directory:
   ```bash
   cd flutter
   ```

2. Install dependencies:
   ```bash
   flutter pub get
   ```

3. Update `google-services.json`:
   - Replace the placeholder in `flutter/android/app/google-services.json` with your actual Firebase config

4. Run the app:
   ```bash
   flutter run
   ```

5. In the app settings, set the server URL to your public URL (e.g., `https://abc123.ngrok.io`)

### 5. TradingView Alert Configuration

#### For BOS Alerts

In your Pine Script, the BOS detection is already implemented. Add webhook alerts:

```pine
// Add this after your existing alert code
if bullSignal and alertBull
    alert("[BOS] Bullish Break of Structure @ " + str.tostring(close, format.mintick) +
          " — " + syminfo.ticker + " " + timeframe.period, 
          alert.freq_once_per_bar_close)

if bearSignal and alertBear
    alert("[BOS] Bearish Break of Structure @ " + str.tostring(close, format.mintick) +
          " — " + syminfo.ticker + " " + timeframe.period, 
          alert.freq_once_per_bar_close)
```

#### For Zone Alerts

```pine
// Zone alerts are already in your script
if sd_buy and alertBull
    alert("[ZONE] Demand Zone BUY @ " + str.tostring(close, format.mintick) +
          " — " + syminfo.ticker + " " + timeframe.period, 
          alert.freq_once_per_bar_close)

if sd_sell and alertBear
    alert("[ZONE] Supply Zone SELL @ " + str.tostring(close, format.mintick) +
          " — " + syminfo.ticker + " " + timeframe.period, 
          alert.freq_once_per_bar_close)
```

#### Configure TradingView Alert Dialog

1. Open your chart with the indicator
2. Click the "Alert" button
3. Set the **Condition** to your alert condition (e.g., "Sweep BUY", "S&D Zone BUY", etc.)
4. In the **Webhook URL** field, enter:
   ```
   https://YOUR_PUBLIC_URL/webhook
   ```
   Replace `YOUR_PUBLIC_URL` with your ngrok URL or server domain
5. In the **Message** field, enter JSON format:
   ```json
   {"type": "{{strategy.order.action}}", "price": {{close}}, "symbol": "{{ticker}}", "timeframe": "{{interval}}", "message": "{{strategy.order.comment}}"}
   ```
   Or for custom alerts:
   ```json
   {"type": "BOS", "price": {{close}}, "symbol": "{{ticker}}", "timeframe": "{{interval}}"}
   ```

### 6. Testing

1. Start the backend server
2. Run the Flutter app on your device/emulator
3. Verify the app shows "Connected" status
4. Trigger a TradingView alert manually or wait for a signal
5. You should receive a push notification on your device

## API Endpoints

### POST /webhook
Receives TradingView webhook alerts.

**Request Body:**
```json
{
  "type": "BOS",
  "price": 2345.50,
  "symbol": "XAUUSD",
  "timeframe": "1H",
  "message": "Break of Structure detected"
}
```

### POST /register-token
Registers FCM token for push notifications.

**Request Body:**
```json
{
  "token": "device_fcm_token"
}
```

### GET /alerts
Returns alert history.

### GET /health
Health check endpoint.

## Alert Types Supported

- **BOS**: Break of Structure (bullish/bearish)
- **SWEEP BUY/SELL**: Liquidity sweep signals
- **S&D ZONE BUY/SELL**: Supply/Demand zone entries
- **3RD TOUCH TRENDLINE BUY/SELL**: Trendline 3rd touch signals

## Project Structure

```
trade-alert/
├── backend/
│   ├── server.js              # Express server
│   ├── package.json           # Node.js dependencies
│   └── .env                   # Environment variables
├── flutter/
│   ├── lib/
│   │   ├── main.dart          # App entry point
│   │   ├── models/
│   │   │   └── alert.dart     # Alert data model
│   │   ├── screens/
│   │   │   ├── home_screen.dart
│   │   │   ├── alert_history_screen.dart
│   │   │   └── settings_screen.dart
│   │   └── services/
│   │       └── notification_service.dart
│   ├── android/
│   │   └── app/
│   │       ├── google-services.json
│   │       └── build.gradle
│   └── pubspec.yaml           # Flutter dependencies
└── README.md
```

## Troubleshooting

### Not receiving notifications
- Verify Firebase Cloud Messaging is enabled
- Check that the FCM token is registered (check server logs)
- Ensure the backend server is publicly accessible
- Verify TradingView webhook URL is correct

### Server connection failed
- Check that the backend server is running
- Verify the server URL in app settings matches your public URL
- If using ngrok, ensure it's still running

### TradingView webhook not triggering
- Verify the webhook URL is accessible (test with curl)
- Check TradingView alert is enabled and condition is met
- Review TradingView alert log for errors

## Security Notes

- In production, use HTTPS for the backend server
- Store Firebase credentials securely (use environment variables)
- Implement authentication for the webhook endpoint
- Consider rate limiting to prevent abuse

## License

MIT License
