'use client';

import React, { useState, useEffect } from 'react';
import { Alert } from '@/types';
import { config } from '@/lib/config';

export default function AlertFeed() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
    
    // Poll for new alerts every 15 seconds
    const interval = setInterval(fetchAlerts, config.refreshInterval);
    
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    try {
      const response = await fetch('/api/alerts');
      const data = await response.json();
      setAlerts(data.alerts || []);
      setIsLoading(false);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      setIsLoading(false);
    }
  };

  const getAlertIcon = (type: string) => {
    if (type.includes('BULLISH') || type.includes('BUY')) {
      return '🟢';
    } else if (type.includes('BEARISH') || type.includes('SELL')) {
      return '🔴';
    } else if (type.includes('BOS')) {
      return '⚡';
    } else if (type.includes('ZONE')) {
      return '📍';
    } else if (type.includes('TOUCH')) {
      return '📊';
    }
    return '📢';
  };

  const getAlertColor = (type: string) => {
    if (type.includes('BULLISH') || type.includes('BUY')) {
      return 'border-green-500 bg-green-500/10';
    } else if (type.includes('BEARISH') || type.includes('SELL')) {
      return 'border-red-500 bg-red-500/10';
    } else if (type.includes('BOS')) {
      return 'border-yellow-500 bg-yellow-500/10';
    } else if (type.includes('ZONE')) {
      return 'border-blue-500 bg-blue-500/10';
    } else if (type.includes('TOUCH')) {
      return 'border-purple-500 bg-purple-500/10';
    }
    return 'border-gray-500 bg-gray-500/10';
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
        <h3 className="text-white font-semibold mb-3">Recent Alerts</h3>
        <div className="text-gray-400 text-sm">Loading alerts...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          Recent Alerts
        </h3>
        <span className="text-xs text-gray-400">{alerts.length} alerts</span>
      </div>
      
      {alerts.length === 0 ? (
        <div className="text-gray-500 text-sm py-4 text-center">
          No alerts yet. Waiting for TradingView signals...
        </div>
      ) : (
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {alerts.slice(0, config.maxAlerts).map((alert) => (
            <div
              key={alert.id}
              className={`border-l-4 ${getAlertColor(alert.type)} rounded p-3`}
            >
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{getAlertIcon(alert.type)}</span>
                  <span className="text-white font-medium text-sm">{alert.type}</span>
                </div>
                <span className="text-xs text-gray-400">{formatTime(alert.timestamp)}</span>
              </div>
              
              <div className="text-gray-300 text-sm mb-1">{alert.message}</div>
              
              <div className="flex gap-3 text-xs text-gray-400">
                <span>{alert.symbol}</span>
                <span>@ ${alert.price?.toFixed(2) || 'N/A'}</span>
                <span>{alert.timeframe}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}