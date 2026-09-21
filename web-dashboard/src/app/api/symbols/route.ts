import { NextRequest, NextResponse } from 'next/server';

// Default symbol configuration
const defaultSymbols = [
  { symbol: 'XAUUSD', enabled: true, alertSettings: { obZones: true, trends: true } },
  { symbol: 'EURUSD', enabled: true, alertSettings: { obZones: true, trends: true } },
  { symbol: 'BTCUSD', enabled: true, alertSettings: { obZones: true, trends: true } },
  { symbol: 'NAS100', enabled: true, alertSettings: { obZones: true, trends: true } },
];

// In-memory storage (in production, use a database)
let symbols = [...defaultSymbols];

export async function GET() {
  return NextResponse.json({
    success: true,
    symbols
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { symbol, enabled, alertSettings } = body;

    const symbolIndex = symbols.findIndex(s => s.symbol === symbol);
    
    if (symbolIndex !== -1) {
      // Update existing symbol
      if (enabled !== undefined) {
        symbols[symbolIndex].enabled = enabled;
      }
      if (alertSettings) {
        symbols[symbolIndex].alertSettings = {
          ...symbols[symbolIndex].alertSettings,
          ...alertSettings
        };
      }
      
      return NextResponse.json({
        success: true,
        symbol: symbols[symbolIndex]
      });
    } else {
      return NextResponse.json({
        success: false,
        error: 'Symbol not found'
      }, { status: 404 });
    }
  } catch (error) {
    console.error('Error updating symbol:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update symbol'
    }, { status: 500 });
  }
}
