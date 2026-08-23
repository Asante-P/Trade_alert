import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'https://web-production-014c4.up.railway.app';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ symbol: string }> }
) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '100';
    const { symbol } = await params;
    
    const response = await fetch(`${BACKEND_URL}/api/market-data/${symbol}?limit=${limit}`);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ success: false, message: 'Error fetching market data' }, { status: 500 });
  }
}