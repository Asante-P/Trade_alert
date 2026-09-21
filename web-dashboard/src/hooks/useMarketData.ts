import { useState, useEffect, useCallback } from 'react';
import { apiClient, ApiError } from '@/lib/api';
import type { MarketCandle, MarketDataResponse } from '@/types';

interface UseMarketDataResult {
  data: MarketCandle[] | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseMarketDataOptions {
  symbol: string;
  interval?: string;
  limit?: number;
  refreshInterval?: number;
  enabled?: boolean;
}

/**
 * Custom hook for fetching market data
 */
export function useMarketData({
  symbol,
  interval = '1h',
  limit = 200,
  refreshInterval = 60000,
  enabled = true,
}: UseMarketDataOptions): UseMarketDataResult {
  const [data, setData] = useState<MarketCandle[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.getMarketData(symbol, interval, limit);
      if (response.success && response.candles) {
        setData(response.candles);
      } else {
        setError('Failed to fetch market data');
        setData([]);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred');
      }
      // Set empty data on error to prevent UI from breaking
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [symbol, interval, limit, enabled]);

  useEffect(() => {
    fetchData();

    if (refreshInterval > 0) {
      const intervalId = setInterval(fetchData, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [fetchData, refreshInterval]);

  return { data, loading, error, refetch: fetchData };
}
