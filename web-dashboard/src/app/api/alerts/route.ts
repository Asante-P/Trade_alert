import { NextRequest, NextResponse } from 'next/server';
import { alertSystem } from '@/lib/alert-system';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'active';
    const limit = parseInt(searchParams.get('limit') || '50');
    
    if (action === 'active') {
      const activeAlerts = alertSystem.getActiveAlerts();
      return NextResponse.json({
        success: true,
        alerts: activeAlerts,
        count: activeAlerts.length
      });
    }
    
    if (action === 'history') {
      const alertHistory = alertSystem.getAlertHistory(limit);
      return NextResponse.json({
        success: true,
        alerts: alertHistory,
        count: alertHistory.length
      });
    }
    
    if (action === 'config') {
      const config = alertSystem.getConfig();
      return NextResponse.json({
        success: true,
        config
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 });
    
  } catch (error) {
    console.error('Error in alerts API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, alertId, config, analysis, riskAssessment, economicEvent } = body;
    
    if (action === 'acknowledge') {
      const success = alertSystem.acknowledgeAlert(alertId);
      return NextResponse.json({
        success,
        message: success ? 'Alert acknowledged' : 'Alert not found'
      });
    }
    
    if (action === 'config') {
      alertSystem.updateConfig(config);
      return NextResponse.json({
        success: true,
        message: 'Alert configuration updated',
        config: alertSystem.getConfig()
      });
    }
    
    if (action === 'opportunity') {
      const alert = alertSystem.createOpportunityAlert(analysis);
      return NextResponse.json({
        success: !!alert,
        alert,
        message: alert ? 'Opportunity alert created' : 'Alert conditions not met'
      });
    }
    
    if (action === 'risk') {
      const alert = alertSystem.createRiskAlert(riskAssessment);
      return NextResponse.json({
        success: !!alert,
        alert,
        message: alert ? 'Risk alert created' : 'Risk level does not require alert'
      });
    }
    
    if (action === 'economic') {
      const alert = alertSystem.createEconomicAlert(economicEvent);
      return NextResponse.json({
        success: !!alert,
        alert,
        message: alert ? 'Economic alert created' : 'Event does not meet alert criteria'
      });
    }
    
    if (action === 'clear') {
      const olderThanHours = body.olderThanHours || 24;
      alertSystem.clearOldAlerts(olderThanHours);
      return NextResponse.json({
        success: true,
        message: `Old alerts cleared (older than ${olderThanHours} hours)`
      });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Invalid action'
    }, { status: 400 });
    
  } catch (error) {
    console.error('Error in alerts API:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}