import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { config } from '@/lib/config';

export async function GET(request: NextRequest) {
  try {
    // Verify this is a cron job (Vercel specific header)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const results = [];
    
    // Fetch market data for each symbol
    for (const symbol of config.symbols) {
      try {
        // Fetch candle data from backend API
        const marketDataResponse = await fetch(
          `${config.backendUrl}/api/market-data/${symbol}?interval=1&count=100`
        );
        
        if (!marketDataResponse.ok) {
          console.error(`Failed to fetch market data for ${symbol}`);
          continue;
        }
        
        const marketData = await marketDataResponse.json();
        
        if (marketData.candles && marketData.candles.length > 0) {
          // Call Supabase Edge Function for market data processing (Pine Script accurate)
          const { data, error } = await supabase.functions.invoke('market-data', {
            body: {
              symbol,
              candles: marketData.candles
            }
          });
          
          if (error) {
            console.error(`Error in Supabase market data processing for ${symbol}:`, error);
          } else {
            results.push({
              symbol,
              success: true,
              currentPrice: data.currentPrice,
              trend: data.trend,
              source: 'Supabase Edge Function (Pine Script accurate)'
            });
          }
        }
      } catch (error) {
        console.error(`Error processing ${symbol}:`, error);
        results.push({
          symbol,
          success: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      results,
      message: 'Market data processing completed using Supabase Edge Functions (Pine Script accurate)'
    });
    
  } catch (error) {
    console.error('Cron job error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}