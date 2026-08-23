'use client';

import React, { useState, useEffect } from 'react';
import MTFDashboard from './MTFDashboard';
import IndicatorState from './IndicatorState';
import AlertFeed from './AlertFeed';
import TradingViewChart from './TradingViewChart';
import BOSAlertPanel from './BOSAlertPanel';
import EconomicNews from './EconomicNews';
import SymbolSettings from './SymbolSettings';
import MarketScanner from './MarketScanner';
import PerformanceMetrics from './PerformanceMetrics';
import MLPrediction from './MLPrediction';
import TradeRecommendations from './TradeRecommendations';
import { supabase } from '@/lib/supabase';

export default function TradingDashboard() {
  const [health, setHealth] = useState({ status: 'ok', registeredTokens: 0, alertCount: 0 });
  const [selectedSymbol, setSelectedSymbol] = useState('XAUUSD');
  const [selectedTimeframe, setSelectedTimeframe] = useState('15');
  const [chartKey, setChartKey] = useState(0);
  const [realtimeAlerts, setRealtimeAlerts] = useState<any[]>([]);

  useEffect(() => {
    // Check Supabase connection
    checkSupabaseHealth();
    
    // Set up real-time subscriptions
    setupRealtimeSubscriptions();
    
    return () => {
      // Cleanup subscriptions
      supabase.channel('alerts-channel').unsubscribe();
    };
  }, [selectedSymbol]);

  const checkSupabaseHealth = async () => {
    try {
      const { data: alerts, error } = await supabase
        .from('alerts')
        .select('count', { count: 'exact', head: true });
      
      const { data: tokens, error: tokensError } = await supabase
        .from('fcm_tokens')
        .select('count', { count: 'exact', head: true });
      
      if (!error && !tokensError) {
        setHealth({
          status: 'ok',
          registeredTokens: tokens?.[0]?.count || 0,
          alertCount: alerts?.[0]?.count || 0
        });
      } else {
        setHealth({ status: 'error', registeredTokens: 0, alertCount: 0 });
      }
    } catch (error) {
      console.error('Supabase health check error:', error);
      setHealth({ status: 'error', registeredTokens: 0, alertCount: 0 });
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Subscribe to new alerts
    const alertsChannel = supabase
      .channel('alerts-channel')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'alerts',
          filter: `symbol=eq.${selectedSymbol}`
        },
        (payload) => {
          console.log('New alert received:', payload);
          setRealtimeAlerts(prev => [payload.new, ...prev.slice(0, 49)]);
        }
      )
      .subscribe();
  };

  // Force chart re-render when symbol changes
  const handleSymbolChange = (symbol: string) => {
    setSelectedSymbol(symbol);
    setChartKey(prev => prev + 1);
    setRealtimeAlerts([]); // Clear alerts when symbol changes
  };

  const symbols = ['XAUUSD', 'EURUSD', 'BTCUSD', 'NAS100'];

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold">Trade Alert Dashboard</h1>
              <p className="text-xs text-gray-400">BOS + OB Retest Trend Analysis</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Symbol Selector */}
            <select
              value={selectedSymbol}
              onChange={(e) => handleSymbolChange(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            >
              {symbols.map(symbol => (
                <option key={symbol} value={symbol}>{symbol}</option>
              ))}
            </select>
            
          {/* Health Status */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${health.status === 'ok' ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm text-gray-400">
              {health.status === 'ok' ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto p-6">
        {/* Chart Section */}
        <div className="mb-6">
          <TradingViewChart 
            key={chartKey} 
            symbol={selectedSymbol} 
            height={700} 
            onTimeframeChange={setSelectedTimeframe}
          />
        </div>

        {/* Analysis Panels - Horizontal Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <MTFDashboard symbol={selectedSymbol} />
          <IndicatorState />
          <BOSAlertPanel />
          <EconomicNews />
          <SymbolSettings />
          <MLPrediction symbol={selectedSymbol} />
        </div>

        {/* Trade Recommendations */}
        <div className="mb-6">
          <TradeRecommendations 
            symbol={selectedSymbol} 
            multiSymbol={true} 
            timeframe={selectedTimeframe}
            activeSymbol={selectedSymbol}
          />
        </div>

        {/* Real-time Alert Feed */}
        <div className="mb-6">
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <h3 className="text-sm font-semibold text-gray-300 mb-3">Real-time Alerts (Supabase)</h3>
            {realtimeAlerts.length === 0 ? (
              <div className="text-xs text-gray-500 text-center py-4">
                Waiting for live alerts...
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {realtimeAlerts.map((alert) => (
                  <div key={alert.id} className="bg-gray-800 rounded p-2 border border-gray-700">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-semibold text-gray-300">{alert.type}</span>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        alert.direction === 'bullish' ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                      }`}>
                        {alert.direction}
                      </span>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {alert.symbol} @ {alert.price}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(alert.timestamp).toLocaleTimeString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Market Scanner */}
        <div className="mb-6">
          <MarketScanner />
        </div>

        {/* Performance Metrics */}
        <div className="mb-6">
          <PerformanceMetrics />
        </div>

        {/* Quick Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div className="text-xs text-gray-400 mb-1">Registered Devices</div>
            <div className="text-2xl font-bold text-blue-400">{health.registeredTokens}</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div className="text-xs text-gray-400 mb-1">Total Alerts</div>
            <div className="text-2xl font-bold text-purple-400">{health.alertCount}</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div className="text-xs text-gray-400 mb-1">Active Symbol</div>
            <div className="text-2xl font-bold text-green-400">{selectedSymbol}</div>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
            <div className="text-xs text-gray-400 mb-1">System Status</div>
            <div className={`text-2xl font-bold ${health.status === 'ok' ? 'text-green-400' : 'text-red-400'}`}>
              {health.status === 'ok' ? 'Online' : 'Offline'}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}