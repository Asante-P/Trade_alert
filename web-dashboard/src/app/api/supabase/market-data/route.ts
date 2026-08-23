import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { symbol, candles } = await request.json();
    
    if (!symbol || !candles || !Array.isArray(candles)) {
      return NextResponse.json(
        { error: 'Invalid request: symbol and candles array required' },
        { status: 400 }
      );
    }
    
    // Call Supabase Edge Function for market data processing
    const { data, error } = await supabase.functions.invoke('market-data', {
      body: { symbol, candles }
    });
    
    if (error) {
      console.error('Supabase function error:', error);
      return NextResponse.json(
        { error: 'Market data processing failed', details: error },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Market data API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}