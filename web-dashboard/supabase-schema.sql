-- Supabase Database Schema for Trading Alert System
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Alerts table for BOS, CHOCH, Order Blocks, etc.
CREATE TABLE IF NOT EXISTS alerts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('BOS', 'CHOCH', 'ORDER_BLOCK', 'SUPPLY_DEMAND', 'TRENDLINE_BREAK')),
  direction VARCHAR(10) NOT NULL CHECK (direction IN ('bullish', 'bearish')),
  price DECIMAL(20, 8) NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'triggered')),
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Market state table for current prices and levels
CREATE TABLE IF NOT EXISTS market_state (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  symbol VARCHAR(20) UNIQUE NOT NULL,
  current_price DECIMAL(20, 8) NOT NULL,
  trend VARCHAR(10) DEFAULT 'neutral' CHECK (trend IN ('bullish', 'bearish', 'neutral')),
  pdh DECIMAL(20, 8),
  pdl DECIMAL(20, 8),
  pwh DECIMAL(20, 8),
  pwl DECIMAL(20, 8),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- FCM tokens for push notifications
CREATE TABLE IF NOT EXISTS fcm_tokens (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  device_info JSONB,
  last_used TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MTF trends table for multi-timeframe analysis
CREATE TABLE IF NOT EXISTS mtf_trends (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL,
  timeframe VARCHAR(20) NOT NULL,
  trend VARCHAR(10) DEFAULT 'neutral' CHECK (trend IN ('bullish', 'bearish', 'neutral')),
  bias VARCHAR(10) DEFAULT 'neutral' CHECK (bias IN ('bullish', 'bearish', 'neutral')),
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(symbol, timeframe)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_alerts_symbol ON alerts(symbol);
CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);

CREATE INDEX IF NOT EXISTS idx_market_state_symbol ON market_state(symbol);
CREATE INDEX IF NOT EXISTS idx_market_state_updated ON market_state(last_updated DESC);

CREATE INDEX IF NOT EXISTS idx_mtf_trends_symbol ON mtf_trends(symbol);
CREATE INDEX IF NOT EXISTS idx_mtf_trends_timeframe ON mtf_trends(timeframe);
CREATE INDEX IF NOT EXISTS idx_mtf_trends_updated ON mtf_trends(last_updated DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE market_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE fcm_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE mtf_trends ENABLE ROW LEVEL SECURITY;

-- Allow public read access for alerts and market state
DROP POLICY IF EXISTS "Allow public read access to alerts" ON alerts;
CREATE POLICY "Allow public read access to alerts" ON alerts
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access to market state" ON market_state;
CREATE POLICY "Allow public read access to market state" ON market_state
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public read access to mtf trends" ON mtf_trends;
CREATE POLICY "Allow public read access to mtf trends" ON mtf_trends
  FOR SELECT USING (true);

-- Allow service role to insert/update data
DROP POLICY IF EXISTS "Allow service role to insert alerts" ON alerts;
CREATE POLICY "Allow service role to insert alerts" ON alerts
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service role to update alerts" ON alerts;
CREATE POLICY "Allow service role to update alerts" ON alerts
  FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow service role to manage market state" ON market_state;
CREATE POLICY "Allow service role to manage market state" ON market_state
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow service role to manage fcm tokens" ON fcm_tokens;
CREATE POLICY "Allow service role to manage fcm tokens" ON fcm_tokens
  FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow service role to manage mtf trends" ON mtf_trends;
CREATE POLICY "Allow service role to manage mtf trends" ON mtf_trends
  FOR ALL USING (true);

-- Function to update market state (upsert)
CREATE OR REPLACE FUNCTION upsert_market_state(
  p_symbol VARCHAR(20),
  p_current_price DECIMAL(20, 8),
  p_trend VARCHAR(10),
  p_pdh DECIMAL(20, 8),
  p_pdl DECIMAL(20, 8),
  p_pwh DECIMAL(20, 8),
  p_pwl DECIMAL(20, 8)
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO market_state (symbol, current_price, trend, pdh, pdl, pwh, pwl, last_updated)
  VALUES (p_symbol, p_current_price, p_trend, p_pdh, p_pdl, p_pwh, p_pwl, NOW())
  ON CONFLICT (symbol)
  DO UPDATE SET
    current_price = EXCLUDED.current_price,
    trend = EXCLUDED.trend,
    pdh = EXCLUDED.pdh,
    pdl = EXCLUDED.pdl,
    pwh = EXCLUDED.pwh,
    pwl = EXCLUDED.pwl,
    last_updated = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to insert alert with validation
CREATE OR REPLACE FUNCTION insert_alert(
  p_symbol VARCHAR(20),
  p_type VARCHAR(50),
  p_direction VARCHAR(10),
  p_price DECIMAL(20, 8),
  p_details JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_alert_id UUID;
BEGIN
  INSERT INTO alerts (symbol, type, direction, price, details, timestamp, status)
  VALUES (p_symbol, p_type, p_direction, p_price, p_details, NOW(), 'active')
  RETURNING id INTO v_alert_id;
  
  RETURN v_alert_id;
END;
$$ LANGUAGE plpgsql;

-- Function to upsert MTF trend
CREATE OR REPLACE FUNCTION upsert_mtf_trend(
  p_symbol VARCHAR(20),
  p_timeframe VARCHAR(20),
  p_trend VARCHAR(10),
  p_bias VARCHAR(10)
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO mtf_trends (symbol, timeframe, trend, bias, last_updated)
  VALUES (p_symbol, p_timeframe, p_trend, p_bias, NOW())
  ON CONFLICT (symbol, timeframe)
  DO UPDATE SET
    trend = EXCLUDED.trend,
    bias = EXCLUDED.bias,
    last_updated = NOW();
END;
$$ LANGUAGE plpgsql;

-- Create storage bucket for logs/screenshots (optional)
-- Only create if it doesn't exist to avoid errors
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'trade-logs'
  ) THEN
    INSERT INTO storage.buckets (id, name, public)
    VALUES ('trade-logs', 'trade-logs', false);
  END IF;
END $$;

-- Grant permissions for storage
DROP POLICY IF EXISTS "Allow service role to manage storage" ON storage.objects;
CREATE POLICY "Allow service role to manage storage" ON storage.objects
  FOR ALL USING (auth.role() = 'service_role');