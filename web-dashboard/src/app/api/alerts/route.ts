import { NextResponse } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'https://web-production-014c4.up.railway.app';

export async function GET() {
  try {
    const response = await fetch(`${BACKEND_URL}/alerts`);
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ alerts: [] }, { status: 500 });
  }
}