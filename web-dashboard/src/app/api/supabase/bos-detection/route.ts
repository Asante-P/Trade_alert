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
    
    // Call Supabase Edge Function for BOS detection
    const { data, error } = await supabase.functions.invoke('bos-detection', {
      body: { symbol, candles }
    });
    
    if (error) {
      console.error('Supabase function error:', error);
      return NextResponse.json(
        { error: 'BOS detection failed', details: error },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('BOS detection API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}