# Trade Alert - Multi-Platform Trading Notification System

A comprehensive trading alert system with Flutter mobile app, Node.js backend, and Next.js web dashboard for monitoring TradingView indicator alerts, specifically designed for BOS (Break of Structure) and price reaching zones.

## Architecture

- **Flutter App**: Mobile app to receive and display alerts
- **Node.js Backend**: Server to receive TradingView webhooks and send push notifications via Firebase Cloud Messaging (FCM)
- **Next.js Web Dashboard**: Real-time web interface for monitoring alerts, trends, and market data
- **Firebase Cloud Messaging**: Push notification service
- **Supabase**: Database and real-time subscriptions
- **TradingView**: Sends webhook alerts to the backend server

## Quick Start

### Prerequisites
- Node.js (v18 or higher)
- Flutter SDK
- Firebase account
- Supabase account (for web dashboard)

### Installation

1. **Install all dependencies:**
   ```bash
   npm run install:all
   ```

2. **Configure environment variables:**
   - Copy `backend/.env.example` to `backend/.env` and configure Firebase credentials
   - Copy `web-dashboard/.env.example` to `web-dashboard/.env.local` and configure backend URLs

3. **Start all services:**
   ```bash
   npm run dev
   ```
   This starts:
   - Backend server on `http://localhost:3000`
   - Web dashboard on `http://localhost:3001`
   - Flutter app (requires manual device connection)

### Individual Service Setup

#### Backend Setup

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

#### Web Dashboard Setup

1. Navigate to the web-dashboard directory:
   ```bash
   cd web-dashboard
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   ```bash
   cp .env.example .env.local
   ```
   Edit `.env.local` with your backend URL and Supabase credentials.

4. Start the development server:
   ```bash
   npm run dev
   ```
   The dashboard will be available at `http://localhost:3001`

#### Flutter App Setup

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

## Development Scripts

Root-level scripts for managing the entire project:

- `npm run dev` - Start all services (backend, web, flutter)
- `npm run dev:backend` - Start backend only
- `npm run dev:web` - Start web dashboard only
- `npm run dev:flutter` - Start Flutter app
- `npm run start` - Start production services
- `npm run build:web` - Build web dashboard for production
- `npm run install:all` - Install all dependencies
- `npm run clean` - Clean all build artifacts
- `npm run test` - Run all tests
- `npm run lint` - Run linting for all services

## Project Structure

```
trade-alert-next/
├── backend/                   # Node.js backend server
│   ├── server.js             # Express server
│   ├── database.js           # Database configuration
│   ├── package.json          # Node.js dependencies
│   └── .env                  # Environment variables
├── web-dashboard/            # Next.js web dashboard
│   ├── src/
│   │   ├── app/              # Next.js app directory
│   │   │   ├── api/          # API routes
│   │   │   ├── layout.tsx    # Root layout
│   │   │   └── page.tsx      # Main page
│   │   ├── components/       # React components
│   │   │   ├── MTFDashboard.tsx
│   │   │   ├── IndicatorState.tsx
│   │   │   └── TradingDashboard.tsx
│   │   ├── hooks/            # Custom React hooks
│   │   │   ├── useMarketData.ts
│   │   │   ├── useTrendAnalysis.ts
│   │   │   └── useAlerts.ts
│   │   ├── lib/              # Utility libraries
│   │   │   ├── config.ts     # Configuration
│   │   │   ├── api.ts        # API client
│   │   │   ├── utils.ts      # Utility functions
│   │   │   └── env-validation.ts
│   │   └── types/            # TypeScript types
│   │       └── index.ts
│   ├── package.json          # Web dashboard dependencies
│   └── .env.example          # Environment variables template
├── flutter/                  # Flutter mobile app
│   ├── lib/
│   │   ├── main.dart         # App entry point
│   │   ├── models/
│   │   │   └── alert.dart    # Alert data model
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
│   └── pubspec.yaml          # Flutter dependencies
├── package.json              # Root package.json with unified scripts
└── README.md                 # This file
```

## Web Dashboard Features

- **Real-time Alert Feed**: Live updates of TradingView alerts with color-coded display
- **MTF Trend Dashboard**: Multi-timeframe trend analysis with weighted bias calculation
- **Indicator State Monitor**: Track order blocks, trendline touches, and signal readiness
- **Market Data Integration**: Real-time market data with custom hooks
- **Type-Safe API**: Centralized API client with error handling
- **Environment Validation**: Type-safe environment variable configuration
- **Responsive Design**: Dark-themed UI optimized for trading environments

## API Endpoints

### Backend Endpoints

- `POST /webhook` - Receives TradingView webhook alerts
- `POST /register-token` - Registers FCM token for push notifications
- `GET /alerts` - Returns alert history
- `GET /health` - Health check endpoint

### Web Dashboard API Routes

- `GET /api/health` - Backend health status
- `GET /api/alerts` - Alert history from backend
- `GET /api/market-data/[symbol]` - Market data for specified symbol
- `POST /api/webhook` - TradingView webhook proxy

## TradingView Integration

### Alert Configuration

In your Pine Script indicator, ensure you have the following alert conditions:

```pine
alertcondition(buySignal, title="BOS+OB Buy Signal", message="XAUUSD: Bullish OB retest confirmed")
alertcondition(sellSignal, title="BOS+OB Sell Signal", message="XAUUSD: Bearish OB retest confirmed")
alertcondition(tlBuy3rd, title="3rd Touch Trendline Buy", message="XAUUSD: 3rd touch support trendline BUY")
alertcondition(tlSell3rd, title="3rd Touch Trendline Sell", message="XAUUSD: 3rd touch resistance trendline SELL")
```

### TradingView Alert Setup

1. Open your chart with the indicator
2. Click the "Alert" button
3. Set condition to your desired alert
4. Copy the webhook URL from the dashboard or use your public URL
5. Paste in TradingView's Webhook URL field
6. Use this JSON message format:
```json
{
  "type": "{{strategy.order.action}}",
  "price": "{{close}}",
  "symbol": "{{ticker}}",
  "timeframe": "{{interval}}",
  "message": "{{strategy.order.comment}}"
}
```

## Code Quality Improvements

### TypeScript Configuration
- **Strict mode enabled** for better type safety
- **Additional compiler options** for code quality
- **Centralized type definitions** in `src/types/index.ts`

### Architecture Improvements
- **Custom hooks** for data fetching (`useMarketData`, `useTrendAnalysis`, `useAlerts`)
- **Centralized API client** with error handling and timeout management
- **Shared utilities** in `lib/utils.ts` (market open check, EMA calculations, formatting)
- **Environment validation** using Zod for type-safe configuration
- **Configuration management** with centralized config object

### Component Refactoring
- **MTFDashboard**: Separated concerns, added loading/error states, uses custom hooks
- **IndicatorState**: Removed code duplication, improved error handling, configurable parameters
- **Loading states** and **error boundaries** for better UX

### Best Practices
- **No `any` types** - all data properly typed
- **Error handling** with custom `ApiError` class
- **Consistent naming** and code organization
- **Reusable components** and utilities
- **Environment-based configuration**

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

### Web dashboard not loading
- Ensure backend server is running
- Check `BACKEND_URL` in `.env.local`
- Verify API endpoints are accessible
- Check browser console for errors

## Security Notes

- In production, use HTTPS for the backend server
- Store Firebase credentials securely (use environment variables)
- Implement authentication for the webhook endpoint
- Consider rate limiting to prevent abuse
- Never commit `.env` files to version control

## License

MIT License
