import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  // BOS alert functionality removed in Vercel migration
  // Requires persistent backend server for webhook handling
  return NextResponse.json({ 
    success: false, 
    message: 'BOS alert functionality requires a persistent backend server' 
  }, { status: 503 });
}