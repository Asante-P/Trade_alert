import { config } from './config';
import type { Alert, MarketDataResponse, AlertResponse, HealthResponse, MarketCandle } from '@/types';

class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public response?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * API client for backend communication
 */
class ApiClient {
  private backendUrl: string;
  private localApiUrl: string;
  private timeout: number;

  constructor() {
    this.backendUrl = config.backendUrl;
    this.localApiUrl = ''; // Empty for local Next.js API routes
    this.timeout = config.apiTimeout;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    useBackend: boolean = false
  ): Promise<T> {
    const baseUrl = useBackend ? this.backendUrl : this.localApiUrl;
    const url = `${baseUrl}${endpoint}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // Try to parse error response as JSON, fall back to text
        const contentType = response.headers.get('content-type');
        let errorData: unknown = {};
        let errorMessage = `HTTP error! status: ${response.status}`;
        
        if (contentType?.includes('application/json')) {
          try {
            errorData = await response.json();
            errorMessage = (errorData as any).message || errorMessage;
          } catch (e) {
            // JSON parsing failed, use text instead
          }
        } else {
          try {
            const text = await response.text();
            errorMessage = text || errorMessage;
            errorData = { message: text };
          } catch (e) {
            // Text parsing failed, use default message
          }
        }
        
        throw new ApiError(errorMessage, response.status, errorData);
      }

      // Try to parse successful response as JSON
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        const text = await response.text();
        throw new ApiError(`Expected JSON response, got ${contentType}`, response.status, { text });
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof ApiError) throw error;
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ApiError('Request timeout');
        }
        // Check if it's a JSON parsing error
        if (error.message.includes('JSON')) {
          throw new ApiError(`Failed to parse response: ${error.message}`);
        }
        throw new ApiError(error.message);
      }
      
      throw new ApiError('An unknown error occurred');
    }
  }

  /**
   * Get health status
   */
  async getHealth(): Promise<HealthResponse> {
    try {
      return await this.request<HealthResponse>('/api/health', {}, false);
    } catch (error) {
      // If the health check fails, return a default health response
      console.error('Failed to fetch health status:', error);
      return {
        status: 'error',
        message: 'Failed to connect to backend',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get alert history
   */
  async getAlerts(): Promise<AlertResponse> {
    try {
      const response = await this.request<{ success: boolean; alerts: Alert[]; error?: string }>('/api/alerts', {}, false);
      
      // Transform backend response to match expected format
      return {
        alerts: response.alerts || [],
        total: (response.alerts || []).length
      };
    } catch (error) {
      // If the API call fails, return a structured error response
      console.error('Failed to fetch alerts:', error);
      return {
        alerts: [],
        total: 0
      };
    }
  }

  /**
   * Get market data for a symbol
   */
  async getMarketData(
    symbol: string,
    interval: string = '1h',
    limit: number = 200
  ): Promise<MarketDataResponse> {
    try {
      const response = await this.request<{ success: boolean; data: any[]; currentPrice?: number }>(
        `/api/market-data-test?symbol=${symbol}&interval=${interval}&limit=${limit}`,
        {},
        false
      );
      
      // Transform backend response to match expected format
      return {
        success: response.success,
        candles: response.data,
        symbol,
        interval
      };
    } catch (error) {
      // If the API call fails, return a structured error response
      console.error('Failed to fetch market data:', error);
      return {
        success: false,
        candles: [],
        symbol,
        interval
      };
    }
  }

  /**
   * Register FCM token
   */
  async registerToken(token: string, deviceInfo?: Record<string, unknown>): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/register-token', {
      method: 'POST',
      body: JSON.stringify({ token, device_info: deviceInfo }),
    });
  }

  /**
   * Send webhook alert
   */
  async sendWebhook(alert: Partial<Alert>): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/webhook', {
      method: 'POST',
      body: JSON.stringify(alert),
    });
  }
}

export const apiClient = new ApiClient();
export { ApiError };
