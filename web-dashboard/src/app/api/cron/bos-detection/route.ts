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
    
    // Run BOS detection for each symbol using Supabase Edge Functions
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
          // Call Supabase Edge Function for BOS detection (Pine Script accurate)
          const { data, error } = await supabase.functions.invoke('bos-detection', {
            body: {
              symbol,
              candles: marketData.candles
            }
          });
          
          if (error) {
            console.error(`Error in Supabase BOS detection for ${symbol}:`, error);
          } else {
            // Trigger notifications for new BOS events
            if (data.events && data.events.length > 0) {
              for (const event of data.events) {
                if (event.type === 'BOS') {
                  await supabase.functions.invoke('notify', {
                    body: {
                      alertId: event.id || Date.now().toString(),
                      symbol: event.symbol,
                      type: event.type,
                      direction: event.direction,
                      price: event.price || event.high
                    }
                  });
                }
              }
            }
            
            results.push({
              symbol,
              success: true,
              bosCount: data.bosCount,
              obCount: data.obCount,
              zoneCount: data.zoneCount,
              source: 'Supabase Edge Function (Pine Script accurate)'
            });
          }
        }
      } catch (error) {
        console.error(`Error processing BOS detection for ${symbol}:`, error);
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
      message: 'BOS detection completed using Supabase Edge Functions (Pine Script accurate)'
    });
    
  } catch (error) {
    console.error('BOS detection cron error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}