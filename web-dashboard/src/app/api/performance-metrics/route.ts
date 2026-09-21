import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    const symbol = searchParams.get('symbol') || '';

    // Calculate date threshold
    const dateThreshold = new Date();
    dateThreshold.setDate(dateThreshold.getDate() - days);
    const thresholdISO = dateThreshold.toISOString();

    // Build query
    let query = supabase
      .from('alerts')
      .select('*')
      .gte('timestamp', thresholdISO);

    if (symbol) {
      query = query.eq('symbol', symbol);
    }

    const { data: alerts, error } = await query;

    if (error) {
      throw error;
    }

    // Calculate metrics
    const totalAlerts = alerts?.length || 0;
    const bullishAlerts = alerts?.filter(a => a.direction === 'bullish').length || 0;
    const bearishAlerts = alerts?.filter(a => a.direction === 'bearish').length || 0;

    // Mock win rate calculation (in production, this would track actual trade outcomes)
    const winRate = totalAlerts > 0 ? ((bullishAlerts * 0.65 + bearishAlerts * 0.6) / totalAlerts * 100).toFixed(1) : '0';

    // Mock profit factor (in production, calculate from actual P&L)
    const profitFactor = totalAlerts > 0 ? (1.5 + Math.random() * 0.5).toFixed(1) : '1.0';

    // Mock average duration
    const avgDuration = (2 + Math.random() * 4).toFixed(1);

    // Mock profit/loss
    const totalProfit = (totalAlerts * 50 * (parseFloat(winRate) / 100)).toFixed(0);
    const totalLoss = (totalAlerts * 50 * (1 - parseFloat(winRate) / 100)).toFixed(0);

    // Breakdown by alert type
    const alertTypes: Record<string, number> = {};
    alerts?.forEach(alert => {
      const type = alert.type || 'Unknown';
      alertTypes[type] = (alertTypes[type] || 0) + 1;
    });

    // Breakdown by symbol
    const symbolBreakdown: Record<string, number> = {};
    alerts?.forEach(alert => {
      const sym = alert.symbol || 'Unknown';
      symbolBreakdown[sym] = (symbolBreakdown[sym] || 0) + 1;
    });

    return NextResponse.json({
      success: true,
      period: `${days} days`,
      symbol: symbol || 'all',
      metrics: {
        totalAlerts,
        bullishAlerts,
        bearishAlerts,
        winRate,
        profitFactor,
        avgDuration,
        totalProfit,
        totalLoss
      },
      breakdown: {
        alertTypes,
        symbolBreakdown
      }
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch performance metrics'
    }, { status: 500 });
  }
}
