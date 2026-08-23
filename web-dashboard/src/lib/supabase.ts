import { createClient } from '@supabase/supabase-js';
import { config } from './config';

export const supabase = createClient(
  config.supabaseUrl,
  config.supabaseAnonKey
);

// Database types based on our schema
export interface Database {
  public: {
    Tables: {
      alerts: {
        Row: {
          id: string;
          symbol: string;
          type: 'BOS' | 'CHOCH' | 'ORDER_BLOCK' | 'SUPPLY_DEMAND' | 'TRENDLINE_BREAK';
          direction: 'bullish' | 'bearish';
          price: number;
          timestamp: string;
          status: 'active' | 'expired' | 'triggered';
          details?: any;
          created_at: string;
        };
        Insert: {
          id?: string;
          symbol: string;
          type: 'BOS' | 'CHOCH' | 'ORDER_BLOCK' | 'SUPPLY_DEMAND' | 'TRENDLINE_BREAK';
          direction: 'bullish' | 'bearish';
          price: number;
          timestamp?: string;
          status?: 'active' | 'expired' | 'triggered';
          details?: any;
          created_at?: string;
        };
        Update: {
          id?: string;
          symbol?: string;
          type?: 'BOS' | 'CHOCH' | 'ORDER_BLOCK' | 'SUPPLY_DEMAND' | 'TRENDLINE_BREAK';
          direction?: 'bullish' | 'bearish';
          price?: number;
          timestamp?: string;
          status?: 'active' | 'expired' | 'triggered';
          details?: any;
          created_at?: string;
        };
      };
      market_state: {
        Row: {
          id: string;
          symbol: string;
          current_price: number;
          trend: 'bullish' | 'bearish' | 'neutral';
          pdh: number | null;
          pdl: number | null;
          pwh: number | null;
          pwl: number | null;
          last_updated: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          symbol: string;
          current_price: number;
          trend: 'bullish' | 'bearish' | 'neutral';
          pdh?: number | null;
          pdl?: number | null;
          pwh?: number | null;
          pwl?: number | null;
          last_updated?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          symbol?: string;
          current_price?: number;
          trend?: 'bullish' | 'bearish' | 'neutral';
          pdh?: number | null;
          pdl?: number | null;
          pwh?: number | null;
          pwl?: number | null;
          last_updated?: string;
          created_at?: string;
        };
      };
      fcm_tokens: {
        Row: {
          id: string;
          token: string;
          device_info?: any;
          last_used: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          token: string;
          device_info?: any;
          last_used?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          token?: string;
          device_info?: any;
          last_used?: string;
          created_at?: string;
        };
      };
      mtf_trends: {
        Row: {
          id: string;
          symbol: string;
          timeframe: string;
          trend: 'bullish' | 'bearish' | 'neutral';
          bias: 'bullish' | 'bearish' | 'neutral';
          last_updated: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          symbol: string;
          timeframe: string;
          trend: 'bullish' | 'bearish' | 'neutral';
          bias: 'bullish' | 'bearish' | 'neutral';
          last_updated?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          symbol?: string;
          timeframe?: string;
          trend?: 'bullish' | 'bearish' | 'neutral';
          bias?: 'bullish' | 'bearish' | 'neutral';
          last_updated?: string;
          created_at?: string;
        };
      };
    };
  };
}