// Important recurring economic events schedule
// This provides a fallback when live APIs are unavailable
export const RECURRING_ECONOMIC_EVENTS = [
  {
    name: 'Non-Farm Payrolls (NFP)',
    currency: 'USD',
    importance: 'high',
    schedule: 'First Friday of every month, 8:30 AM EST',
    description: 'US employment data - major market mover'
  },
  {
    name: 'Consumer Price Index (CPI)',
    currency: 'USD', 
    importance: 'high',
    schedule: 'Monthly, around 13th-15th, 8:30 AM EST',
    description: 'US inflation data - Fed policy indicator'
  },
  {
    name: 'Federal Interest Rate Decision',
    currency: 'USD',
    importance: 'high',
    schedule: '8 times per year after FOMC meetings, 2:00 PM EST',
    description: 'Fed monetary policy announcement'
  },
  {
    name: 'GDP Growth Rate',
    currency: 'USD',
    importance: 'high',
    schedule: 'Quarterly, end of month, 8:30 AM EST',
    description: 'US economic growth measurement'
  },
  {
    name: 'Retail Sales',
    currency: 'USD',
    importance: 'medium',
    schedule: 'Monthly, mid-month, 8:30 AM EST',
    description: 'Consumer spending indicator'
  },
  {
    name: 'ISM Manufacturing PMI',
    currency: 'USD',
    importance: 'medium',
    schedule: 'First business day of month, 10:00 AM EST',
    description: 'Manufacturing sector health'
  },
  {
    name: 'Unemployment Rate',
    currency: 'USD',
    importance: 'high',
    schedule: 'First Friday of every month, 8:30 AM EST',
    description: 'US labor market indicator'
  },
  {
    name: 'ECB Interest Rate Decision',
    currency: 'EUR',
    importance: 'high',
    schedule: '6-8 times per year, 12:45 PM CET',
    description: 'European Central Bank policy'
  },
  {
    name: 'BOJ Interest Rate Decision',
    currency: 'JPY',
    importance: 'high',
    schedule: '6-8 times per year, 3:00 AM JST',
    description: 'Bank of Japan policy'
  },
  {
    name: 'UK CPI',
    currency: 'GBP',
    importance: 'high',
    schedule: 'Monthly, mid-month, 8:30 AM GMT',
    description: 'UK inflation data'
  }
];

// Trading impact analysis for economic events
export interface TradingImpact {
  direction: 'BUY' | 'SELL' | 'NEUTRAL' | 'WATCH';
  instrument: string;
  probability: 'HIGH' | 'MEDIUM' | 'LOW';
  reasoning: string;
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  expectedVolatility: 'HIGH' | 'MEDIUM' | 'LOW';
  keyLevels?: string[];
  timingAdvice: string;
}

// Analyze expected market impact for different event types
export function analyzeTradingImpact(event: any): TradingImpact {
  const currency = event.currency || 'USD';
  const instrument = currency === 'USD' ? 'XAUUSD' : `${currency}USD`;
  
  // Base analysis on event type and importance
  if (event.importance !== 'high') {
    return {
      direction: 'WATCH',
      instrument,
      probability: 'LOW',
      reasoning: 'Low/medium impact events typically do not provide high-probability trading opportunities',
      riskLevel: 'LOW',
      expectedVolatility: 'LOW',
      timingAdvice: 'Monitor for unexpected reactions'
    };
  }

  // High-impact event analysis
  if (event.event && (event.event.includes('NFP') || event.event.includes('Non-Farm Payrolls'))) {
    return {
      direction: 'WATCH',
      instrument,
      probability: 'MEDIUM',
      reasoning: 'NFP is highly volatile. Stronger than expected means USD strengthens (SELL XAUUSD). Weaker means USD weakens (BUY XAUUSD). Wait for initial reaction and confirmation before trading.',
      riskLevel: 'HIGH',
      expectedVolatility: 'HIGH',
      keyLevels: ['Previous swing highs/lows', 'Daily pivot points', 'Psychological levels'],
      timingAdvice: 'Wait 5-15 minutes after release for initial volatility to settle, then trade in direction of confirmed move'
    };
  }

  if (event.event && (event.event.includes('CPI') || event.event.includes('Consumer Price Index'))) {
    return {
      direction: 'WATCH',
      instrument,
      probability: 'MEDIUM',
      reasoning: 'Higher CPI means rate hike expectations so USD strengthens (SELL XAUUSD). Lower CPI means rate cut expectations so USD weakens (BUY XAUUSD). Monitor Fed response and market expectations.',
      riskLevel: 'MEDIUM',
      expectedVolatility: 'HIGH',
      keyLevels: ['Recent high/low ranges', 'Support/resistance zones'],
      timingAdvice: 'Trade after initial reaction if deviation from forecast is significant'
    };
  }

  if (event.event && (event.event.includes('Interest Rate') || event.event.includes('FOMC'))) {
    return {
      direction: 'WATCH',
      instrument,
      probability: 'HIGH',
      reasoning: 'Rate decisions are major market movers. Hike means USD strengthens (SELL XAUUSD). Cut means USD weakens (BUY XAUUSD). Forward guidance is often more important than the decision itself.',
      riskLevel: 'HIGH',
      expectedVolatility: 'HIGH',
      keyLevels: ['Pre-event consolidation range', 'Key psychological levels'],
      timingAdvice: 'Wait for press conference and forward guidance. The initial reaction often reverses.'
    };
  }

  if (event.event && event.event.includes('GDP')) {
    return {
      direction: 'WATCH',
      instrument,
      probability: 'MEDIUM',
      reasoning: 'Strong GDP means economic strength and potential rate hikes so USD strengthens (SELL XAUUSD). Weak GDP means economic concerns and potential rate cuts so USD weakens (BUY XAUUSD).',
      riskLevel: 'MEDIUM',
      expectedVolatility: 'MEDIUM',
      keyLevels: ['Trend lines', 'Moving averages'],
      timingAdvice: 'Trade in direction of trend if GDP confirms existing economic trajectory'
    };
  }

  if (event.event && event.event.includes('Retail Sales')) {
    return {
      direction: 'WATCH',
      instrument,
      probability: 'MEDIUM',
      reasoning: 'Strong retail sales means consumer confidence and economic strength so USD strengthens (SELL XAUUSD). Weak sales means economic concerns so USD weakens (BUY XAUUSD).',
      riskLevel: 'MEDIUM',
      expectedVolatility: 'MEDIUM',
      keyLevels: ['Recent support/resistance'],
      timingAdvice: 'Consider trading if deviation from forecast is significant'
    };
  }

  if (event.event && (event.event.includes('PMI') || event.event.includes('Manufacturing'))) {
    return {
      direction: 'WATCH',
      instrument,
      probability: 'LOW',
      reasoning: 'PMI above 50 indicates expansion, below 50 indicates contraction. Strong manufacturing means economic strength so USD strengthens (SELL XAUUSD).',
      riskLevel: 'LOW',
      expectedVolatility: 'MEDIUM',
      keyLevels: ['Trend lines', '50.0 level'],
      timingAdvice: 'Use as confirmation of broader economic trends rather than primary trading signal'
    };
  }

  // Default for other high-impact events
  return {
    direction: 'WATCH',
    instrument,
    probability: 'LOW',
    reasoning: 'Monitor market reaction to this event. High-impact events can create significant volatility but direction depends on multiple factors.',
    riskLevel: 'MEDIUM',
    expectedVolatility: 'HIGH',
    timingAdvice: 'Wait for clear directional signal before entering trades'
  };
}

// Calculate next occurrence for recurring events
export function getNextOccurrences() {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  return RECURRING_ECONOMIC_EVENTS.map(event => {
    let nextDate = new Date(now);
    
    // Simple estimation logic for recurring events
    if (event.name.includes('NFP') || event.name.includes('Unemployment')) {
      // First Friday of next month
      const nextMonth = new Date(currentYear, currentMonth + 1, 1);
      const firstFriday = new Date(nextMonth);
      while (firstFriday.getDay() !== 5) {
        firstFriday.setDate(firstFriday.getDate() + 1);
      }
      nextDate = firstFriday;
    } else if (event.name.includes('CPI') || event.name.includes('Retail Sales')) {
      // Mid-month (around 15th)
      nextDate = new Date(currentYear, currentMonth + 1, 15);
    } else if (event.name.includes('GDP')) {
      // End of quarter
      const nextQuarter = Math.floor(currentMonth / 3) + 1;
      const quarterEndMonth = nextQuarter * 3 - 1;
      nextDate = new Date(currentYear, quarterEndMonth, 28);
    } else {
      // Default to 1 week from now for other events
      nextDate.setDate(now.getDate() + 7);
    }
    
    return {
      datetime: nextDate.toISOString(),
      currency: event.currency,
      event: event.name,
      importance: event.importance,
      actual: null,
      forecast: null,
      previous: null
    };
  }).sort((a, b) => new Date(a.datetime).getTime() - new Date(b.datetime).getTime());
}