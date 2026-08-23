import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'https://web-production-014c4.up.railway.app';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { symbol = 'XAUUSD' } = body;
    
    // Trigger BOS test alert on backend
    const response = await fetch(`${BACKEND_URL}/test-bos-alert`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: 'BULLISH_BOS',
        price: 4597.105
      }),
    });
    
    const result = await response.json();
    
    return NextResponse.json({ 
      success: true, 
      message: 'BOS alert triggered',
      data: result
    });
  } catch (error) {
    console.error('Error triggering BOS alert:', error);
    return NextResponse.json({ success: false, message: 'Error triggering BOS alert' }, { status: 500 });
  }
}