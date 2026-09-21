# Trade Alert Web Dashboard

A modern Next.js web dashboard for monitoring TradingView indicator alerts, specifically designed for the BOS + OB Retest Trend indicator. Built with TypeScript, strict type safety, and best practices.

## Features

- **Real-time Alert Feed**: Live updates of TradingView alerts with color-coded display
- **MTF Trend Dashboard**: Multi-timeframe trend analysis with weighted bias calculation
- **Indicator State Monitor**: Track order blocks, trendline touches, and signal readiness
- **Webhook Configuration**: Easy setup for TradingView webhook integration
- **Health Monitoring**: Backend connection status and system health checks
- **Type-Safe Architecture**: Full TypeScript strict mode with comprehensive type definitions
- **Custom Hooks**: Reusable data fetching hooks with loading/error states
- **Centralized API**: Type-safe API client with error handling
- **Environment Validation**: Zod-based environment variable validation
- **Responsive Design**: Dark-themed UI optimized for trading environments

## Architecture

- **Frontend**: Next.js 16 with TypeScript strict mode and Tailwind CSS
- **State Management**: Custom React hooks for data fetching and state management
- **API Layer**: Centralized API client with timeout and error handling
- **Type Safety**: Comprehensive TypeScript types with strict mode enabled
- **Configuration**: Centralized config with environment validation
- **Backend Integration**: Connects to existing Node.js backend via API proxy

## Setup Instructions

### 1. Install Dependencies

```bash
cd web-dashboard
npm install
```

### 2. Environment Configuration

Copy the example environment file and configure:

```bash
cp .env.example .env.local
```

Edit `.env.local` with your configuration:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3000
BACKEND_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
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
│   ├── hooks/
│   │   ├── useMarketData.ts            # Market data fetching hook
│   │   ├── useTrendAnalysis.ts         # Trend analysis hook
│   │   ├── useAlerts.ts                # Alerts fetching hook
│   │   └── index.ts                    # Hook exports
│   ├── lib/
│   │   ├── config.ts                   # Configuration constants
│   │   ├── api.ts                      # Centralized API client
│   │   ├── utils.ts                    # Shared utility functions
│   │   ├── env-validation.ts           # Environment validation with Zod
│   │   └── supabase.ts                 # Supabase client configuration
│   └── types/
│       └── index.ts                    # TypeScript type definitions
├── public/                             # Static assets
├── package.json                        # Dependencies
├── tsconfig.json                       # TypeScript configuration (strict mode)
├── .env.example                        # Environment variables template
└── README.md                           # This file
```

## Key Improvements

### Code Quality
- **TypeScript Strict Mode**: Enabled with additional compiler options for better type safety
- **No `any` Types**: All data properly typed with comprehensive interfaces
- **Error Handling**: Custom `ApiError` class and proper error boundaries
- **Code Organization**: Clear separation of concerns with dedicated directories

### Architecture
- **Custom Hooks**: Reusable data fetching hooks (`useMarketData`, `useTrendAnalysis`, `useAlerts`)
- **Centralized API**: Single API client with timeout, error handling, and type safety
- **Shared Utilities**: Common functions in `lib/utils.ts` (market open check, EMA calculations, formatting)
- **Environment Validation**: Zod-based validation for type-safe environment variables
- **Configuration Management**: Centralized config object with all application settings

### Component Improvements
- **MTFDashboard**: 
  - Separated business logic from UI
  - Added loading and error states
  - Uses custom hooks for data fetching
  - Configurable timeframes and weights
- **IndicatorState**:
  - Removed code duplication
  - Improved error handling
  - Configurable refresh intervals
  - Better loading states

### Development Experience
- **Type Safety**: Full TypeScript coverage with strict mode
- **IntelliSense**: Better autocomplete and type hints
- **Error Prevention**: Compile-time error catching
- **Maintainability**: Clear code structure and documentation

## Component Descriptions

### MTFDashboard
- Displays trend bias across multiple timeframes (15m, 1H, 4H, 1D)
- Calculates weighted overall bias using configurable threshold
- Uses custom hooks for data fetching and trend analysis
- Auto-updates with configurable refresh interval
- Includes loading and error states for better UX

### IndicatorState
- Shows active bullish/bearish order blocks
- Tracks resistance/support trendline touches
- Displays signal readiness status
- Reset functionality for touch counters
- Configurable parameters via props and config

### AlertFeed
- Real-time display of TradingView alerts
- Color-coded by alert type (buy/sell/BOS/zone/touch)
- Shows timestamp, symbol, price, and timeframe
- Auto-refreshes with configurable interval
- Uses custom `useAlerts` hook

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
Fetches market data for specified symbol with interval and limit parameters.

### POST /api/webhook
Receives TradingView webhook alerts and forwards to backend.

## Configuration

The dashboard uses a centralized configuration system in `src/lib/config.ts`:

```typescript
export const config = {
  backendUrl: string,
  supabaseUrl: string,
  supabaseAnonKey: string,
  symbols: string[],
  refreshInterval: number,
  maxAlerts: number,
  apiTimeout: number,
  appName: string,
  appVersion: string,
  features: {
    marketData: boolean,
    mtfAnalysis: boolean,
    aiAnalyzer: boolean,
  },
  mtf: {
    defaultTimeframes: string[],
    defaultWeights: number[],
    refreshInterval: number,
    biasThreshold: number,
  },
  indicator: {
    refreshInterval: number,
    defaultTouchesRequired: number,
    maxTouches: number,
  },
  marketData: {
    defaultLimit: number,
    intervals: Record<string, string>,
  },
};
```

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

## Development

### Available Scripts

- `npm run dev` - Start development server on port 3001
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

### Adding New Features

1. Create new components in `src/components/`
2. Add custom hooks in `src/hooks/`
3. Add API routes in `src/app/api/`
4. Update types in `src/types/index.ts`
5. Modify configuration in `src/lib/config.ts`
6. Add utilities in `src/lib/utils.ts`

### Type Safety Guidelines

- Always define proper TypeScript interfaces for data structures
- Avoid using `any` types - use proper interfaces or `unknown`
- Use the centralized API client for all backend communication
- Validate environment variables using the Zod schema
- Follow the existing patterns for custom hooks

## Troubleshooting

### Dashboard Not Loading
- Ensure backend server is running
- Check `BACKEND_URL` in `.env.local`
- Verify API endpoints are accessible
- Check browser console for TypeScript errors

### Type Errors
- Ensure all dependencies are installed
- Check that `tsconfig.json` has strict mode enabled
- Verify all interfaces are properly defined
- Run `npm run build` to catch compilation errors

### Alerts Not Updating
- Check browser console for errors
- Verify backend `/alerts` endpoint
- Ensure polling interval is working
- Check that custom hooks are properly configured

### Webhook Not Receiving Alerts
- Verify TradingView webhook URL is correct
- Check backend server logs
- Ensure webhook URL is publicly accessible

## Deployment

### Vercel (Recommended)

1. Push your code to GitHub
2. Import project in Vercel
3. Set environment variables:
   - `NEXT_PUBLIC_BACKEND_URL`: Your backend server URL
   - `BACKEND_URL`: Your backend server URL
   - `NEXT_PUBLIC_SUPABASE_URL`: Your Supabase project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Your Supabase anon key
4. Deploy

### Other Platforms

The dashboard can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- AWS Amplify
- DigitalOcean App Platform

## Future Enhancements

- WebSocket integration for real-time updates
- Historical alert analytics
- Chart integration with TradingView widgets
- User authentication and multi-user support
- Alert filtering and search functionality
- Export alert history to CSV
- Mobile app companion
- Unit and integration tests
- Storybook for component documentation

## License

MIT License - See main project LICENSE file