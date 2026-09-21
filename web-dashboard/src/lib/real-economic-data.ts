// Real Economic Data Integration
// Implementation for Trading Economics and FRED APIs

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
  private tradingEconomicsKey: string;
  private fredKey: string;

  constructor() {
    this.tradingEconomicsKey = process.env.TRADING_ECONOMICS_API_KEY || '';
    this.fredKey = process.env.FRED_API_KEY || '';
  }

  // Fetch data from Trading Economics API
  async fetchTradingEconomicsData(country: string = 'united states'): Promise<EconomicIndicator[]> {
    if (!this.tradingEconomicsKey) {
      console.warn('Trading Economics API key not configured');
      return this.getFallbackData();
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
      console.error('Error fetching Trading Economics data:', error);
      return this.getFallbackData();
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

  // Fetch economic calendar from Trading Economics
  async fetchEconomicCalendar(): Promise<any[]> {
    if (!this.tradingEconomicsKey) {
      return this.getFallbackCalendar();
    }

    try {
      const response = await fetch(
        `https://api.tradingeconomics.com/calendar?apikey=${this.tradingEconomicsKey}`
      );

      if (!response.ok) {
        throw new Error(`Trading Economics Calendar API error: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching economic calendar:', error);
      return this.getFallbackCalendar();
    }
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
      this.fetchTradingEconomicsData(),
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