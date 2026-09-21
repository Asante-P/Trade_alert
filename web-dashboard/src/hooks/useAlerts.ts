import { useState, useEffect, useCallback } from 'react';
import { apiClient, ApiError } from '@/lib/api';
import { config } from '@/lib/config';
import type { Alert, AlertResponse } from '@/types';

interface UseAlertsResult {
  alerts: Alert[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseAlertsOptions {
  refreshInterval?: number;
  maxAlerts?: number;
  enabled?: boolean;
}

/**
 * Custom hook for fetching alerts
 */
export function useAlerts({
  refreshInterval = config.refreshInterval,
  maxAlerts = config.maxAlerts,
  enabled = true,
}: UseAlertsOptions = {}): UseAlertsResult {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAlerts = useCallback(async () => {
    if (!enabled) return;

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.getAlerts();
      if (response.alerts) {
        const limitedAlerts = response.alerts.slice(0, maxAlerts);
        setAlerts(limitedAlerts);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Failed to fetch alerts');
      }
    } finally {
      setLoading(false);
    }
  }, [maxAlerts, enabled]);

  useEffect(() => {
    fetchAlerts();

    if (refreshInterval > 0) {
      const intervalId = setInterval(fetchAlerts, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [fetchAlerts, refreshInterval]);

  return { alerts, loading, error, refetch: fetchAlerts };
}
