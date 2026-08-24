import { NextResponse } from 'next/server';

export async function GET() {
  // Health check for Vercel deployment
  return NextResponse.json({ 
    status: 'ok', 
    message: 'Vercel serverless functions are running',
    timestamp: new Date().toISOString()
  });
}