# Trade Alert Web Dashboard

A Next.js web dashboard for monitoring TradingView indicator alerts, specifically designed for the BOS + OB Retest Trend indicator.

## Features

- **Real-time Alert Feed**: Live updates of TradingView alerts with color-coded display
- **MTF Trend Dashboard**: Multi-timeframe trend analysis with weighted bias calculation
- **Indicator State Monitor**: Track order blocks, trendline touches, and signal readiness
- **Webhook Configuration**: Easy setup for TradingView webhook integration
- **Health Monitoring**: Backend connection status and system health checks
- **Responsive Design**: Dark-themed UI optimized for trading environments

## Architecture

- **Frontend**: Next.js 15 with TypeScript and Tailwind CSS
- **Backend Integration**: Connects to existing Node.js backend
- **Real-time Updates**: Polling-based alerts and health monitoring
- **API Proxy**: Next.js API routes proxy requests to backend server

## Setup Instructions

### 1. Install Dependencies

```bash
cd web-dashboard
npm install
```

### 2. Environment Configuration

Create a `.env.local` file in the web-dashboard directory:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3000
```

### 3. Start the Development Server

```bash
npm run dev
```

The dashboard will be available at `http://localhost:3001`

### 4. Backend Setup

Ensure your backend server is running (from the main project directory):

```bash
cd backend
npm start
```

## Project Structure

```
web-dashboard/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── alerts/route.ts          # Alert history API
│   │   │   ├── health/route.ts          # Health check API
│   │   │   ├── market-data/[symbol]/    # Market data API
│   │   │   └── webhook/route.ts         # TradingView webhook proxy
│   │   ├── layout.tsx                   # Root layout
│   │   ├── page.tsx                     # Main dashboard page
│   │   └── globals.css                  # Global styles
│   ├── components/
│   │   ├── MTFDashboard.tsx             # Multi-timeframe trend dashboard
│   │   ├── IndicatorState.tsx          # Indicator state monitor
│   │   ├── AlertFeed.tsx               # Alert feed component
│   │   ├── WebhookConfig.tsx            # Webhook configuration panel
│   │   └── TradingDashboard.tsx         # Main dashboard layout
│   ├── lib/
│   │   └── config.ts                   # Configuration constants
│   └── types/
│       └── index.ts                    # TypeScript type definitions
├── public/                             # Static assets
├── package.json                        # Dependencies
└── README.md                           # This file
```

## Component Descriptions

### MTFDashboard
- Displays trend bias across multiple timeframes (15m, 1H, 4H, 1D)
- Calculates weighted overall bias
- Auto-updates every 10 seconds with simulated data

### IndicatorState
- Shows active bullish/bearish order blocks
- Tracks resistance/support trendline touches
- Displays signal readiness status
- Reset functionality for touch counters

### AlertFeed
- Real-time display of TradingView alerts
- Color-coded by alert type (buy/sell/BOS/zone/touch)
- Shows timestamp, symbol, price, and timeframe
- Auto-refreshes every 15 seconds

### WebhookConfig
- Provides webhook URL for TradingView configuration
- Shows JSON message format template
- Lists supported alert types
- Setup instructions for TradingView

## API Endpoints

### GET /api/alerts
Returns alert history from backend server.

### GET /api/health
Returns backend health status and system metrics.

### GET /api/market-data/[symbol]
Fetches market data for specified symbol.

### POST /api/webhook
Receives TradingView webhook alerts and forwards to backend.

## TradingView Integration

### Configure Your Indicator

In your Pine Script indicator, ensure you have the following alert conditions:

```pine
alertcondition(buySignal, title="BOS+OB Buy Signal", message="XAUUSD: Bullish OB retest confirmed")
alertcondition(sellSignal, title="BOS+OB Sell Signal", message="XAUUSD: Bearish OB retest confirmed")
alertcondition(tlBuy3rd, title="3rd Touch Trendline Buy", message="XAUUSD: 3rd touch support trendline BUY")
alertcondition(tlSell3rd, title="3rd Touch Trendline Sell", message="XAUUSD: 3rd touch resistance trendline SELL")
```

### Set Up TradingView Alert

1. Open your chart with the indicator
2. Click the "Alert" button
3. Set condition to your desired alert
4. Copy the webhook URL from the dashboard
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

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Set environment variables:
   - `NEXT_PUBLIC_BACKEND_URL`: Your backend server URL
   - `BACKEND_URL`: Your backend server URL
4. Deploy

### Other Platforms

The dashboard can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- AWS Amplify
- DigitalOcean App Platform

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Adding New Features

1. Create new components in `src/components/`
2. Add API routes in `src/app/api/`
3. Update types in `src/types/index.ts`
4. Modify configuration in `src/lib/config.ts`

## Troubleshooting

### Dashboard Not Loading
- Ensure backend server is running
- Check `BACKEND_URL` in `.env.local`
- Verify API endpoints are accessible

### Alerts Not Updating
- Check browser console for errors
- Verify backend `/alerts` endpoint
- Ensure polling interval is working

### Webhook Not Receiving Alerts
- Verify TradingView webhook URL is correct
- Check backend server logs
- Ensure webhook URL is publicly accessible

## Future Enhancements

- WebSocket integration for real-time updates
- Historical alert analytics
- Chart integration with TradingView widgets
- User authentication and multi-user support
- Alert filtering and search functionality
- Export alert history to CSV
- Mobile app companion

## License

MIT License - See main project LICENSE file