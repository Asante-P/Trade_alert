export const config = {
  backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000',
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  symbols: ['XAUUSD', 'EURUSD', 'BTCUSD', 'NAS100'],
  refreshInterval: 15000, // 15 seconds
  maxAlerts: 50
};