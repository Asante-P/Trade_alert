// Alert System for Trading Opportunities
// Comprehensive alert management with multiple notification channels

export interface AlertCondition {
  type: 'price' | 'indicator' | 'pattern' | 'risk' | 'economic';
  symbol: string;
  condition: string;
  value: number;
  operator: '>' | '<' | '=' | '>=' | '<=';
  threshold: number;
  timeframe?: string;
}

export interface TradingAlert {
  id: string;
  type: 'opportunity' | 'warning' | 'risk' | 'info';
  symbol: string;
  message: string;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  data: any;
  acknowledged: boolean;
  channels: string[];
}

export interface AlertConfig {
  enabled: boolean;
  channels: {
    email: boolean;
    sms: boolean;
    push: boolean;
    webhook: boolean;
  };
  filters: {
    minConfidence: number;
    minRiskReward: number;
    maxRiskPercent: number;
    symbols: string[];
  };
  throttle: {
    minInterval: number; // milliseconds
    maxPerHour: number;
  };
}

export class AlertSystem {
  private alerts: Map<string, TradingAlert> = new Map();
  private alertHistory: TradingAlert[] = [];
  private config: AlertConfig;
  private lastAlertTimes: Map<string, number> = new Map();
  private alertCounters: Map<string, number> = new Map();

  constructor(config?: Partial<AlertConfig>) {
    this.config = {
      enabled: true,
      channels: {
        email: true,
        sms: false,
        push: true,
        webhook: false
      },
      filters: {
        minConfidence: 60,
        minRiskReward: 1.5,
        maxRiskPercent: 2,
        symbols: ['XAUUSD', 'EURUSD', 'BTCUSD', 'NAS100']
      },
      throttle: {
        minInterval: 60000, // 1 minute
        maxPerHour: 10
      },
      ...config
    };
  }

  // Check if alert should be sent based on throttle settings
  private shouldSendAlert(alertKey: string): boolean {
    const now = Date.now();
    const lastAlert = this.lastAlertTimes.get(alertKey) || 0;
    const hourlyCount = this.alertCounters.get(alertKey) || 0;
    
    // Check minimum interval
    if (now - lastAlert < this.config.throttle.minInterval) {
      return false;
    }
    
    // Check hourly limit
    if (hourlyCount >= this.config.throttle.maxPerHour) {
      return false;
    }
    
    return true;
  }

  // Update alert tracking
  private updateAlertTracking(alertKey: string) {
    const now = Date.now();
    this.lastAlertTimes.set(alertKey, now);
    
    // Reset counter if it's been more than an hour
    const hourlyCount = this.alertCounters.get(alertKey) || 0;
    const lastAlert = this.lastAlertTimes.get(alertKey) || 0;
    
    if (now - lastAlert > 3600000) {
      this.alertCounters.set(alertKey, 1);
    } else {
      this.alertCounters.set(alertKey, hourlyCount + 1);
    }
  }

  // Create trading opportunity alert
  createOpportunityAlert(analysis: any): TradingAlert | null {
    if (!this.config.enabled) return null;
    
    // Check filters
    if (analysis.score < this.config.filters.minConfidence) {
      return null;
    }
    
    if (analysis.riskRewardRatio < this.config.filters.minRiskReward) {
      return null;
    }
    
    if (!this.config.filters.symbols.includes(analysis.symbol)) {
      return null;
    }
    
    const alertKey = `${analysis.symbol}_opportunity`;
    if (!this.shouldSendAlert(alertKey)) {
      return null;
    }
    
    const alert: TradingAlert = {
      id: this.generateAlertId(),
      type: 'opportunity',
      symbol: analysis.symbol,
      message: this.generateOpportunityMessage(analysis),
      timestamp: new Date(),
      priority: this.determinePriority(analysis),
      data: analysis,
      acknowledged: false,
      channels: this.getActiveChannels()
    };
    
    this.addAlert(alert);
    this.updateAlertTracking(alertKey);
    
    return alert;
  }

  // Create risk alert
  createRiskAlert(riskAssessment: any): TradingAlert | null {
    if (!this.config.enabled) return null;
    
    if (riskAssessment.level === 'low') {
      return null;
    }
    
    const alertKey = 'risk_alert';
    if (!this.shouldSendAlert(alertKey)) {
      return null;
    }
    
    const alert: TradingAlert = {
      id: this.generateAlertId(),
      type: 'risk',
      symbol: 'PORTFOLIO',
      message: this.generateRiskMessage(riskAssessment),
      timestamp: new Date(),
      priority: riskAssessment.level === 'extreme' ? 'critical' : 
                riskAssessment.level === 'high' ? 'high' : 'medium',
      data: riskAssessment,
      acknowledged: false,
      channels: this.getActiveChannels()
    };
    
    this.addAlert(alert);
    this.updateAlertTracking(alertKey);
    
    return alert;
  }

  // Create economic event alert
  createEconomicAlert(event: any): TradingAlert | null {
    if (!this.config.enabled) return null;
    
    if (event.importance !== 'high') {
      return null;
    }
    
    const alertKey = `economic_${event.event}`;
    if (!this.shouldSendAlert(alertKey)) {
      return null;
    }
    
    const alert: TradingAlert = {
      id: this.generateAlertId(),
      type: 'info',
      symbol: event.currency,
      message: `High-impact economic event: ${event.event} at ${new Date(event.datetime).toLocaleString()}`,
      timestamp: new Date(),
      priority: 'high',
      data: event,
      acknowledged: false,
      channels: this.getActiveChannels()
    };
    
    this.addAlert(alert);
    this.updateAlertTracking(alertKey);
    
    return alert;
  }

  // Generate opportunity message
  private generateOpportunityMessage(analysis: any): string {
    const direction = analysis.recommendation.includes('BUY') ? 'BUY' : 'SELL';
    return `Trading Opportunity: ${direction} ${analysis.symbol} at ${analysis.entryPrice}\n` +
           `Confidence: ${analysis.confidence}% | Score: ${analysis.score}\n` +
           `Stop Loss: ${analysis.stopLoss} | Take Profit: ${analysis.takeProfit}\n` +
           `Risk/Reward: ${analysis.riskRewardRatio}`;
  }

  // Generate risk message
  private generateRiskMessage(riskAssessment: any): string {
    return `Risk Alert: ${riskAssessment.level.toUpperCase()} risk level detected\n` +
           `Risk Score: ${riskAssessment.score}\n` +
           `Warnings: ${riskAssessment.warnings.join(', ')}`;
  }

  // Determine alert priority
  private determinePriority(analysis: any): 'low' | 'medium' | 'high' | 'critical' {
    if (analysis.score >= 80) return 'critical';
    if (analysis.score >= 65) return 'high';
    if (analysis.score >= 50) return 'medium';
    return 'low';
  }

  // Get active notification channels
  private getActiveChannels(): string[] {
    const channels: string[] = [];
    if (this.config.channels.email) channels.push('email');
    if (this.config.channels.sms) channels.push('sms');
    if (this.config.channels.push) channels.push('push');
    if (this.config.channels.webhook) channels.push('webhook');
    return channels;
  }

  // Add alert to system
  private addAlert(alert: TradingAlert) {
    this.alerts.set(alert.id, alert);
    this.alertHistory.push(alert);
    
    // Keep history limited to last 100 alerts
    if (this.alertHistory.length > 100) {
      this.alertHistory.shift();
    }
    
    // Send notifications
    this.sendNotifications(alert);
  }

  // Send notifications through configured channels
  private async sendNotifications(alert: TradingAlert) {
    const notifications = [];
    
    if (this.config.channels.push) {
      notifications.push(this.sendPushNotification(alert));
    }
    
    if (this.config.channels.email) {
      notifications.push(this.sendEmailNotification(alert));
    }
    
    if (this.config.channels.webhook) {
      notifications.push(this.sendWebhookNotification(alert));
    }
    
    await Promise.allSettled(notifications);
  }

  // Send push notification (placeholder)
  private async sendPushNotification(alert: TradingAlert) {
    console.log(`[PUSH] ${alert.priority.toUpperCase()}: ${alert.message}`);
    // In production, integrate with push notification service
  }

  // Send email notification (placeholder)
  private async sendEmailNotification(alert: TradingAlert) {
    console.log(`[EMAIL] ${alert.priority.toUpperCase()}: ${alert.message}`);
    // In production, integrate with email service
  }

  // Send webhook notification (placeholder)
  private async sendWebhookNotification(alert: TradingAlert) {
    const webhookUrl = process.env.ALERT_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alert)
        });
      } catch (error) {
        console.error('Webhook notification failed:', error);
      }
    }
  }

  // Generate unique alert ID
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get active alerts
  getActiveAlerts(): TradingAlert[] {
    return Array.from(this.alerts.values()).filter(alert => !alert.acknowledged);
  }

  // Get alert history
  getAlertHistory(limit: number = 50): TradingAlert[] {
    return this.alertHistory.slice(-limit);
  }

  // Acknowledge alert
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      return true;
    }
    return false;
  }

  // Update configuration
  updateConfig(config: Partial<AlertConfig>) {
    this.config = { ...this.config, ...config };
  }

  // Get current configuration
  getConfig(): AlertConfig {
    return { ...this.config };
  }

  // Clear old alerts
  clearOldAlerts(olderThanHours: number = 24) {
    const cutoff = Date.now() - (olderThanHours * 3600000);
    
    for (const [id, alert] of this.alerts) {
      if (alert.timestamp.getTime() < cutoff && alert.acknowledged) {
        this.alerts.delete(id);
      }
    }
    
    this.alertHistory = this.alertHistory.filter(
      alert => alert.timestamp.getTime() >= cutoff
    );
  }
}

export const alertSystem = new AlertSystem();