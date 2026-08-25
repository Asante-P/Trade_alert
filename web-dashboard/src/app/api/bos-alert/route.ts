import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, type, direction, price, details } = body;

    if (!symbol || !type || !direction || !price) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: symbol, type, direction, price'
      }, { status: 400 });
    }

    // Insert alert into Supabase
    const { data: alert, error } = await supabase
      .from('alerts')
      .insert({
        symbol,
        type,
        direction,
        price,
        timestamp: new Date().toISOString(),
        status: 'active',
        details: details || {}
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating BOS alert:', error);
      return NextResponse.json({ 
        success: false, 
        error: error.message
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      alert
    });
  } catch (error) {
    console.error('Error creating BOS alert:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create BOS alert'
    }, { status: 500 });
  }
}