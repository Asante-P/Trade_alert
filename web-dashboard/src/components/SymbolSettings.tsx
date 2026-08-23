'use client';

import React, { useState, useEffect } from 'react';

interface SymbolConfig {
  symbol: string;
  enabled: boolean;
  alertSettings: {
    obZones: boolean;
    trends: boolean;
  };
}

export default function SymbolSettings() {
  const [symbols, setSymbols] = useState<SymbolConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    fetchSymbolSettings();
  }, []);

  const fetchSymbolSettings = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://web-production-014c4.up.railway.app'}/monitored-symbols`);
      const data = await response.json();
      if (data.success) {
        setSymbols(data.symbols);
      }
    } catch (error) {
      console.error('Error fetching symbol settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateSymbolSetting = async (symbol: string, updates: Partial<SymbolConfig>) => {
    setUpdating(symbol);
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL || 'https://web-production-014c4.up.railway.app'}/monitored-symbols`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol, ...updates })
      });
      const data = await response.json();
      if (data.success) {
        setSymbols(prev => prev.map(s => s.symbol === symbol ? data.symbol : s));
      }
    } catch (error) {
      console.error('Error updating symbol settings:', error);
    } finally {
      setUpdating(null);
    }
  };

  const toggleSymbol = (symbol: string, enabled: boolean) => {
    updateSymbolSetting(symbol, { enabled });
  };

  const toggleAlertSetting = (symbol: string, setting: keyof SymbolConfig['alertSettings']) => {
    const symbolConfig = symbols.find(s => s.symbol === symbol);
    if (symbolConfig) {
      updateSymbolSetting(symbol, {
        alertSettings: {
          ...symbolConfig.alertSettings,
          [setting]: !symbolConfig.alertSettings[setting]
        }
      });
    }
  };

  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
        <h3 className="text-white font-semibold mb-3">Symbol Monitoring</h3>
        <div className="text-xs text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
      <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        Symbol Monitoring
      </h3>

      <div className="space-y-2">
        {symbols.map((symbolConfig) => (
          <div key={symbolConfig.symbol} className="bg-gray-800 rounded p-3 border border-gray-700">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm font-semibold text-gray-300">{symbolConfig.symbol}</span>
              <button
                onClick={() => toggleSymbol(symbolConfig.symbol, !symbolConfig.enabled)}
                disabled={updating === symbolConfig.symbol}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  symbolConfig.enabled ? 'bg-green-600' : 'bg-gray-600'
                } ${updating === symbolConfig.symbol ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    symbolConfig.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {symbolConfig.enabled && (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center gap-2 text-gray-400">
                  <input
                    type="checkbox"
                    checked={symbolConfig.alertSettings.obZones}
                    onChange={() => toggleAlertSetting(symbolConfig.symbol, 'obZones')}
                    disabled={updating === symbolConfig.symbol}
                    className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                  />
                  OB Zones
                </label>
                <label className="flex items-center gap-2 text-gray-400">
                  <input
                    type="checkbox"
                    checked={symbolConfig.alertSettings.trends}
                    onChange={() => toggleAlertSetting(symbolConfig.symbol, 'trends')}
                    disabled={updating === symbolConfig.symbol}
                    className="rounded bg-gray-700 border-gray-600 text-blue-500 focus:ring-blue-500"
                  />
                  Trends
                </label>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-700">
        <div className="text-xs text-gray-400">
          <div className="flex justify-between mb-1">
            <span>Active Symbols:</span>
            <span className="text-green-400">{symbols.filter(s => s.enabled).length}/{symbols.length}</span>
          </div>
          <div className="text-gray-500">
            Monitoring runs every 60 seconds for enabled symbols
          </div>
        </div>
      </div>
    </div>
  );
}
