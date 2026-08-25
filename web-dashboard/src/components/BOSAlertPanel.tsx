'use client';

import React, { useState } from 'react';

export default function BOSAlertPanel() {
  const [isLoading, setIsLoading] = useState(false);
  const [lastAlert, setLastAlert] = useState<any>(null);

  const triggerTestAlert = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/bos-alert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          symbol: 'XAUUSD',
          type: 'BOS',
          direction: 'bullish',
          price: 4650.00,
          details: { timeframe: '15m' }
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setLastAlert({
          timestamp: new Date().toISOString(),
          message: 'Test BOS alert sent successfully'
        });
      }
    } catch (error) {
      console.error('Error triggering BOS alert:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
      <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
        <svg className="w-5 h-5 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        BOS Alert Settings
      </h3>

      <div className="space-y-3">
        {/* Alert Status */}
        <div className="bg-gray-800 rounded p-3">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-gray-400">Alert Status</span>
            <span className="text-xs text-green-400">● Active</span>
          </div>
          <div className="text-xs text-gray-300">
            BOS alerts are monitored automatically every 60 seconds
          </div>
        </div>

        {/* Test Alert Button */}
        <button
          onClick={triggerTestAlert}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded text-sm transition-colors"
        >
          {isLoading ? 'Sending Test Alert...' : 'Send Test BOS Alert'}
        </button>

        {/* Last Alert Info */}
        {lastAlert && (
          <div className="bg-green-500/20 border border-green-500/50 rounded p-2 text-sm text-green-400">
            ✓ {lastAlert.message}
            <div className="text-xs text-gray-400 mt-1">
              {new Date(lastAlert.timestamp).toLocaleTimeString()}
            </div>
          </div>
        )}

        {/* Alert Types */}
        <div className="border-t border-gray-700 pt-3">
          <div className="text-xs text-gray-400 mb-2">Alert Types</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-800 rounded p-2 text-green-400">● Bullish BOS</div>
            <div className="bg-gray-800 rounded p-2 text-red-400">● Bearish BOS</div>
          </div>
        </div>

        {/* Cooldown Info */}
        <div className="border-t border-gray-700 pt-3">
          <div className="text-xs text-gray-400 mb-1">Alert Cooldown</div>
          <div className="text-xs text-gray-300">
            5 minutes between alerts to prevent duplicates
          </div>
        </div>

        {/* Notification Channels */}
        <div className="border-t border-gray-700 pt-3">
          <div className="text-xs text-gray-400 mb-2">Notification Channels</div>
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-green-400">●</span>
              <span className="text-gray-300">Firebase Push Notifications</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-400">●</span>
              <span className="text-gray-300">ntfy.sh Notifications</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-purple-400">●</span>
              <span className="text-gray-300">Database Alert History</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}