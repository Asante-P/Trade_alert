export interface Alert {
  id: number;
  timestamp: string;
  type: string;
  price: number;
  symbol: string;
  timeframe: string;
  message: string;
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