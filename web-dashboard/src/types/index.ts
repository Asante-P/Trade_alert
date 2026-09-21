export interface Alert {
  id: number;
  timestamp: string;
  type: string;
  price: number;
  symbol: string;
  timeframe: string;
  message: string;
  created_at?: string;
}

export interface MarketData {
  time: number | string;
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface HealthStatus {
  status: string;
  registeredTokens: number;
  alertCount: number;
}

export interface TrendBias {
  timeframe: string;
  bias: 'Bullish' | 'Bearish' | 'Neutral';
  weight: number;
}

export interface IndicatorState {
  bullishOBs: number;
  bearishOBs: number;
  resTouches: number;
  supTouches: number;
  touchesRequired: number;
}

export interface MarketCandle {
  time: number | string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface TrendBias {
  timeframe: string;
  bias: 'Bullish' | 'Bearish' | 'Neutral';
  weight: number;
}

export interface MarketDataResponse {
  success: boolean;
  candles: MarketCandle[];
  symbol: string;
  interval: string;
}

export interface AlertResponse {
  alerts: Alert[];
  total: number;
}

export interface HealthResponse {
  status: string;
  message?: string;
  timestamp?: string;
  registeredTokens?: number;
  alertCount?: number;
}