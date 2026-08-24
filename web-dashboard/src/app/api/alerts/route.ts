import { NextResponse } from 'next/server';

export async function GET() {
  // Alerts functionality removed in Vercel migration
  // Firebase push notifications and database operations
  // are not supported in serverless functions
  return NextResponse.json({ 
    success: true,
    alerts: [],
    message: 'Alerts functionality requires a persistent database server'
  });
}