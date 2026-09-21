// Real Economic Data Integration
// Implementation for Finance Calendar API (free, no API key required)

export interface EconomicIndicator {
  name: string;
  value: number;
  previous: number;
  forecast: number;
  timestamp: Date;
  currency: string;
  impact: 'high' | 'medium' | 'low';
}

export class RealEconomicDataService {
  private financeCalendarUrl = 'https://www.financecalendar.com/wp-json/fc/v1';
  private tradingEconomicsKey: string;
  private fredKey: string;

  constructor() {
    this.tradingEconomicsKey = process.env.TRADING_ECONOMICS_API_KEY || '';
    this.fredKey = process.env.FRED_API_KEY || '';
  }

  // Fetch data from Finance Calendar API (Free, no API key required)
  async fetchFinanceCalendarData(fromDate?: string, toDate?: string): Promise<EconomicIndicator[]> {
    try {
      const params = new URLSearchParams();
      
      if (fromDate) params.append('from', fromDate);
      if (toDate) params.append('to', toDate);
      params.append('impact', 'high'); // Get high-impact events
      params.append('limit', '50');

      const response = await fetch(
        `${this.financeCalendarUrl}/calendar?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(`Finance Calendar API error: ${response.status}`);
      }

      const data = await response.json();
      
      return this.transformFinanceCalendarData(data);
    } catch (error) {
      console.error('Error fetching Finance Calendar data:', error);
      return this.getFallbackData();
    }
  }

  // Fetch today's events from Finance Calendar
  async fetchTodayFinanceCalendar(): Promise<any> {
    try {
      const response = await fetch(`${this.financeCalendarUrl}/today`);

      if (!response.ok) {
        throw new Error(`Finance Calendar Today API error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching today\'s calendar:', error);
      return { market: 'unknown', events: [] };
    }
  }

  // Fetch next occurrence of a specific series
  async fetchNextOccurrence(series: string): Promise<any> {
    try {
      const response = await fetch(`${this.financeCalendarUrl}/next?series=${series}`);

      if (!response.ok) {
        throw new Error(`Finance Calendar Next API error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching next occurrence:', error);
      return null;
    }
  }

  // Fetch data from Trading Economics API (if API key is configured)
  async fetchTradingEconomicsData(country: string = 'united states'): Promise<EconomicIndicator[]> {
    if (!this.tradingEconomicsKey) {
      console.warn('Trading Economics API key not configured, using Finance Calendar');
      return this.fetchFinanceCalendarData();
    }

    try {
      const response = await fetch(
        `https://api.tradingeconomics.com/country/${country}?apikey=${this.tradingEconomicsKey}`
      );

      if (!response.ok) {
        throw new Error(`Trading Economics API error: ${response.status}`);
      }

      const data = await response.json();
      
      return this.transformTradingEconomicsData(data);
    } catch (error) {
      console.error('Error fetching Trading Economics data, falling back to Finance Calendar:', error);
      return this.fetchFinanceCalendarData();
    }
  }

  // Fetch data from FRED API
  async fetchFREDData(seriesId: string = 'GDP'): Promise<EconomicIndicator> {
    if (!this.fredKey) {
      console.warn('FRED API key not configured');
      return this.getFallbackIndicator();
    }

    try {
      const response = await fetch(
        `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${this.fredKey}&limit=1`
      );

      if (!response.ok) {
        throw new Error(`FRED API error: ${response.status}`);
      }

      const data = await response.json();
      
      return this.transformFREDData(data, seriesId);
    } catch (error) {
      console.error('Error fetching FRED data:', error);
      return this.getFallbackIndicator();
    }
  }

  // Fetch economic calendar from Finance Calendar (preferred method)
  async fetchEconomicCalendar(): Promise<any[]> {
    try {
      // Get events for next 30 days
      const today = new Date();
      const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      const fromDate = today.toISOString().split('T')[0];
      const toDate = nextMonth.toISOString().split('T')[0];

      const response = await fetch(
        `${this.financeCalendarUrl}/calendar?from=${fromDate}&to=${toDate}&impact=high&limit=100`
      );

      if (!response.ok) {
        throw new Error(`Finance Calendar API error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching economic calendar:', error);
      return this.getFallbackCalendar();
    }
  }

  // Transform Finance Calendar data to our format
  private transformFinanceCalendarData(data: any[]): EconomicIndicator[] {
    if (!Array.isArray(data)) return [];

    return data.map(item => ({
      name: item.name || item.title,
      value: item.actual ? parseFloat(item.actual) : 0,
      previous: item.prior ? parseFloat(item.prior) : 0,
      forecast: item.consensus ? parseFloat(item.consensus) : 0,
      timestamp: new Date(item.date || item.time_utc),
      currency: this.extractCurrency(item.name || item.title),
      impact: (item.impact || 'medium').toLowerCase() as 'high' | 'medium' | 'low'
    }));
  }

  // Extract currency from event name
  private extractCurrency(eventName: string): string {
    const currencyMap: { [key: string]: string } = {
      'US': 'USD',
      'United States': 'USD',
      'UK': 'GBP',
      'United Kingdom': 'GBP',
      'Euro': 'EUR',
      'European': 'EUR',
      'Japan': 'JPY',
      'China': 'CNY',
      'Canada': 'CAD',
      'Australia': 'AUD',
      'Switzerland': 'CHF'
    };

    for (const [key, currency] of Object.entries(currencyMap)) {
      if (eventName.toLowerCase().includes(key.toLowerCase())) {
        return currency;
      }
    }

    return 'USD'; // Default
  }

  // Transform Trading Economics data to our format
  private transformTradingEconomicsData(data: any[]): EconomicIndicator[] {
    return data.map(item => ({
      name: item.Category || item.Name,
      value: parseFloat(item.LatestValue || item.Value),
      previous: parseFloat(item.PreviousValue || item.Previous),
      forecast: parseFloat(item.ForecastValue || item.Forecast),
      timestamp: new Date(item.Timestamp || item.DateTime),
      currency: item.Country || 'USD',
      impact: this.determineImpact(item.Importance || item.Category)
    }));
  }

  // Transform FRED data to our format
  private transformFREDData(data: any, seriesId: string): EconomicIndicator {
    const observations = data.observations || [];
    const latest = observations[observations.length - 1];

    return {
      name: seriesId,
      value: parseFloat(latest?.value || 0),
      previous: parseFloat(observations[observations.length - 2]?.value || 0),
      forecast: parseFloat(latest?.value || 0), // FRED doesn't provide forecasts
      timestamp: new Date(latest?.date || Date.now()),
      currency: 'USD',
      impact: 'high'
    };
  }

  // Determine impact level based on category
  private determineImpact(category: string): 'high' | 'medium' | 'low' {
    const highImpact = [
      'GDP', 'CPI', 'Inflation', 'Interest Rate', 'Employment',
      'Non-Farm Payrolls', 'FOMC', 'Retail Sales', 'PMI'
    ];

    const lowerCategory = category.toLowerCase();
    
    if (highImpact.some(term => lowerCategory.includes(term.toLowerCase()))) {
      return 'high';
    }
    
    return 'medium';
  }

  // Fallback data when APIs are not available
  private getFallbackData(): EconomicIndicator[] {
    return [
      {
        name: 'Consumer Price Index',
        value: 3.2,
        previous: 3.1,
        forecast: 3.1,
        timestamp: new Date(),
        currency: 'USD',
        impact: 'high'
      },
      {
        name: 'GDP Growth Rate',
        value: 2.1,
        previous: 2.0,
        forecast: 2.0,
        timestamp: new Date(),
        currency: 'USD',
        impact: 'high'
      }
    ];
  }

  private getFallbackIndicator(): EconomicIndicator {
    return {
      name: 'GDP',
      value: 2.1,
      previous: 2.0,
      forecast: 2.0,
      timestamp: new Date(),
      currency: 'USD',
      impact: 'high'
    };
  }

  private getFallbackCalendar(): any[] {
    return [
      {
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        event: 'Consumer Price Index',
        importance: 'high',
        currency: 'USD',
        actual: null,
        forecast: '3.2%',
        previous: '3.1%'
      }
    ];
  }

  // Get comprehensive economic snapshot
  async getEconomicSnapshot(): Promise<{
    indicators: EconomicIndicator[];
    calendar: any[];
    lastUpdated: Date;
  }> {
    const [indicators, calendar] = await Promise.all([
      this.fetchFinanceCalendarData(),
      this.fetchEconomicCalendar()
    ]);

    return {
      indicators,
      calendar,
      lastUpdated: new Date()
    };
  }
}

export const realEconomicDataService = new RealEconomicDataService();