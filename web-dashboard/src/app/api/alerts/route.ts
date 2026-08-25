import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const symbol = searchParams.get('symbol') || 'XAUUSD';
    const limit = parseInt(searchParams.get('limit') || '50');

    const { data: alerts, error } = await supabase
      .from('alerts')
      .select('*')
      .eq('symbol', symbol)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json({ 
        success: false, 
        error: error.message,
        alerts: []
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      alerts: alerts || []
    });
  } catch (error) {
    console.error('Error fetching alerts:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to fetch alerts',
      alerts: []
    }, { status: 500 });
  }
}

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
      console.error('Error creating alert:', error);
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
    console.error('Error creating alert:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Failed to create alert'
    }, { status: 500 });
  }
}