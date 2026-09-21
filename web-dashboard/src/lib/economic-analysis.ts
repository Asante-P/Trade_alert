// Economic Analysis Library
// Integrates economic indicators into trading decisions

import { realEconomicDataService } from './real-economic-data';

export interface EconomicIndicator {
  name: string;
  value: number;
  previous: number;
  forecast: number;
  impact: 'high' | 'medium' | 'low';
  currency: string;
  timestamp: Date;
}

export interface EconomicImpact {
  score: number; // -100 to 100 (negative to positive impact)
  factors: string[];
  recommendation: string;
}

export class EconomicAnalyzer {
  // Analyze economic data impact on trading decisions
  analyzeEconomicImpact(indicators: EconomicIndicator[], symbol: string): EconomicImpact {
    let score = 0;
    const factors: string[] = [];
    
    // Filter relevant indicators based on symbol
    const relevantIndicators = this.getRelevantIndicators(indicators, symbol);
    
    for (const indicator of relevantIndicators) {
      const impact = this.calculateIndicatorImpact(indicator);
      score += impact.score;
      factors.push(impact.reason);
    }
    
    // Normalize score to -100 to 100 range
    score = Math.max(-100, Math.min(100, score));
    
    // Generate recommendation
    let recommendation = 'NEUTRAL';
    if (score >= 30) {
      recommendation = 'STRONG BUY';
    } else if (score >= 15) {
      recommendation = 'BUY';
    } else if (score <= -30) {
      recommendation = 'STRONG SELL';
    } else if (score <= -15) {
      recommendation = 'SELL';
    }
    
    return {
      score,
      factors,
      recommendation
    };
  }
  
  private getRelevantIndicators(indicators: EconomicIndicator[], symbol: string): EconomicIndicator[] {
    const symbolCurrency = this.getSymbolCurrency(symbol);
    return indicators.filter(ind => 
      ind.currency === symbolCurrency || ind.impact === 'high'
    );
  }
  
  private getSymbolCurrency(symbol: string): string {
    if (symbol.includes('USD')) return 'USD';
    if (symbol.includes('EUR')) return 'EUR';
    if (symbol.includes('GBP')) return 'GBP';
    if (symbol.includes('JPY')) return 'JPY';
    return 'USD'; // Default
  }
  
  private calculateIndicatorImpact(indicator: EconomicIndicator): { score: number; reason: string } {
    const difference = indicator.value - indicator.forecast;
    const percentDifference = (difference / indicator.forecast) * 100;
    
    let score = 0;
    let reason = '';
    
    // High impact indicators have more weight
    const weight = indicator.impact === 'high' ? 20 : indicator.impact === 'medium' ? 10 : 5;
    
    // Determine impact based on indicator type and deviation
    if (indicator.name.includes('CPI') || indicator.name.includes('Inflation')) {
      // Higher than expected inflation is generally positive for currency
      score = percentDifference * weight;
      reason = `${indicator.name} came in ${percentDifference > 0 ? 'above' : 'below'} forecast`;
    } else if (indicator.name.includes('NFP') || indicator.name.includes('Employment')) {
      // Better than expected employment is positive for currency
      score = percentDifference * weight;
      reason = `${indicator.name} ${percentDifference > 0 ? 'beat' : 'missed'} expectations`;
    } else if (indicator.name.includes('GDP')) {
      // Higher GDP is positive for currency
      score = percentDifference * weight;
      reason = `GDP growth ${percentDifference > 0 ? 'exceeded' : 'fell short'} of forecast`;
    } else if (indicator.name.includes('Interest Rate') || indicator.name.includes('FOMC')) {
      // Higher interest rates are positive for currency
      score = percentDifference * weight * 2; // Double weight for interest rates
      reason = `Interest rate decision ${percentDifference > 0 ? 'hawkish' : 'dovish'}`;
    } else {
      // Generic positive deviation is good
      score = percentDifference * weight;
      reason = `${indicator.name} deviation from forecast`;
    }
    
    return { score, reason };
  }
  
  // Get upcoming high-impact events
  async getUpcomingHighImpactEvents(): Promise<EconomicIndicator[]> {
    try {
      const snapshot = await realEconomicDataService.getEconomicSnapshot();
      
      // Filter for high-impact events and upcoming ones
      const upcomingEvents = snapshot.indicators.filter(ind => 
        ind.impact === 'high' && ind.timestamp > new Date()
      );
      
      return upcomingEvents.slice(0, 10); // Return top 10 upcoming events
    } catch (error) {
      console.error('Error fetching real economic data, using fallback:', error);
      
      // Fallback to sample data
      return [
        {
          name: 'Non-Farm Payrolls',
          value: 200,
          previous: 175,
          forecast: 190,
          impact: 'high',
          currency: 'USD',
          timestamp: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
        },
        {
          name: 'CPI',
          value: 3.2,
          previous: 3.1,
          forecast: 3.1,
          impact: 'high',
          currency: 'USD',
          timestamp: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000)
        }
      ];
    }
  }
  
  // Calculate market sentiment based on economic data
  calculateMarketSentiment(indicators: EconomicIndicator[]): {
    overall: 'bullish' | 'bearish' | 'neutral';
    confidence: number;
    keyDrivers: string[];
  } {
    const totalScore = indicators.reduce((sum, ind) => {
      const impact = this.calculateIndicatorImpact(ind);
      return sum + impact.score;
    }, 0);
    
    const avgScore = totalScore / indicators.length;
    
    let overall: 'bullish' | 'bearish' | 'neutral' = 'neutral';
    if (avgScore >= 10) overall = 'bullish';
    else if (avgScore <= -10) overall = 'bearish';
    
    const confidence = Math.min(100, Math.abs(avgScore) * 5);
    const keyDrivers = indicators
      .filter(ind => ind.impact === 'high')
      .map(ind => ind.name);
    
    return { overall, confidence, keyDrivers };
  }
}

export const economicAnalyzer = new EconomicAnalyzer();