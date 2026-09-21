import { env } from './env-validation';

export const config = {
  backendUrl: env.NEXT_PUBLIC_BACKEND_URL,
  supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  symbols: ['XAUUSD', 'EURUSD', 'BTCUSD', 'NAS100'],
  refreshInterval: env.NEXT_PUBLIC_REFRESH_INTERVAL,
  maxAlerts: 50,
  apiTimeout: env.NEXT_PUBLIC_API_TIMEOUT,
  appName: env.NEXT_PUBLIC_APP_NAME,
  appVersion: env.NEXT_PUBLIC_APP_VERSION,
  features: {
    marketData: env.NEXT_PUBLIC_ENABLE_MARKET_DATA,
    mtfAnalysis: env.NEXT_PUBLIC_ENABLE_MTF_ANALYSIS,
    aiAnalyzer: env.NEXT_PUBLIC_ENABLE_AI_ANALYZER,
  },
  // MTF Dashboard configuration
  mtf: {
    defaultTimeframes: ['15m', '1H', '4H', '1D'],
    defaultWeights: [1, 2, 3, 4],
    refreshInterval: 120000, // 2 minutes
    biasThreshold: 1.5, // Bullish/bearish score threshold
  },
  // Indicator State configuration
  indicator: {
    refreshInterval: 8000, // 8 seconds
    defaultTouchesRequired: 3,
    maxTouches: 5,
  },
  // Market data configuration
  marketData: {
    defaultLimit: 200,
    intervals: {
      '15m': '15min',
      '1H': '1h',
      '4H': '4h',
      '1D': '1day',
    },
  },
};