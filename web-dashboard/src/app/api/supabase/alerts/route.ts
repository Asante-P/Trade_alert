import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get('symbol');
    const limit = parseInt(searchParams.get('limit') || '50');
    
    let query = supabase
      .from('alerts')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (symbol) {
      query = query.eq('symbol', symbol);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error('Supabase query error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch alerts', details: error },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ alerts: data });
    
  } catch (error) {
    console.error('Alerts API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}