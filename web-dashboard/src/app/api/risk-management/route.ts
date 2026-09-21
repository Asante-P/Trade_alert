import { NextRequest, NextResponse } from 'next/server';
import { riskManager } from '@/lib/risk-management';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { positions, accountBalance, newPosition } = body;
    
    if (!accountBalance || typeof accountBalance !== 'number') {
      return NextResponse.json({
        success: false,
        error: 'Valid account balance is required'
      }, { status: 400 });
    }
    
    const validPositions = positions || [];
    
    // Calculate position size for new position
    let positionSize = 0;
    if (newPosition) {
      positionSize = riskManager.calculatePositionSize(
        accountBalance,
        newPosition.entryPrice,
        newPosition.stopLoss
      );
    }
    
    // Assess overall risk
    const riskAssessment = riskManager.assessRisk(validPositions, accountBalance, newPosition);
    
    // Generate risk report
    const riskReport = riskManager.generateRiskReport(validPositions, accountBalance);
    
    return NextResponse.json({
      success: true,
      positionSize,
      riskAssessment,
      riskReport,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in risk management API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountBalance = parseFloat(searchParams.get('accountBalance') || '10000');
    const positionsParam = searchParams.get('positions');
    
    const positions = positionsParam ? JSON.parse(positionsParam) : [];
    
    // Generate risk report
    const riskReport = riskManager.generateRiskReport(positions, accountBalance);
    
    return NextResponse.json({
      success: true,
      riskReport,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error in risk management API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}