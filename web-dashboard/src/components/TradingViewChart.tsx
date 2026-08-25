'use client';

import React, { useEffect, useRef, useState } from 'react';

interface TradingViewChartProps {
  symbol?: string;
  height?: number;
  onSymbolChange?: (symbol: string) => void;
  onTimeframeChange?: (timeframe: string) => void;
  onPriceUpdate?: (price: number) => void;
}

export default function TradingViewChart({ symbol = 'XAUUSD', height = 500, onSymbolChange, onTimeframeChange, onPriceUpdate }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerId, setContainerId] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [chartSettings, setChartSettings] = useState({
    interval: '15',
    showDrawingTools: true,
    showIndicators: true,
    showVolume: true,
    showMA: true,
    showEMA: true,
    showSideToolbar: true,
  });

  // Notify parent when timeframe changes
  useEffect(() => {
    if (onTimeframeChange) {
      onTimeframeChange(chartSettings.interval);
    }
  }, [chartSettings.interval, onTimeframeChange]);

  // Poll for live price from Yahoo Finance as fallback
  useEffect(() => {
    const fetchLivePrice = async () => {
      try {
        const getYahooSymbol = (sym: string) => {
          switch (sym.toUpperCase()) {
            case 'XAUUSD': return 'GC=F';
            case 'EURUSD': return 'EURUSD=X';
            case 'BTCUSD': return 'BTC-USD';
            case 'NAS100': return '^NDX';
            default: return sym;
          }
        };

        const yahooSymbol = getYahooSymbol(symbol);
        const response = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1m&range=1d`
        );
        const data = await response.json();
        const result = data.chart?.result?.[0];
        
        if (result && result.meta) {
          const price = result.meta.regularPrice || result.meta.lastClose;
          if (price && price !== currentPrice) {
            setCurrentPrice(price);
            if (onPriceUpdate) onPriceUpdate(price);
          }
        }
      } catch (error) {
        console.error('Error fetching live price:', error);
      }
    };

    fetchLivePrice();
    const interval = setInterval(fetchLivePrice, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [symbol, currentPrice, onPriceUpdate]);

  useEffect(() => {
    setIsMounted(true);
    setContainerId(`tradingview_${symbol}_${Math.random().toString(36).substr(2, 9)}`);
  }, [symbol]);

  useEffect(() => {
    if (!containerRef.current || !containerId) return;

    // Clean up any existing widget
    containerRef.current.innerHTML = '';

    // Create TradingView widget script
    const script = document.createElement('script');
    script.src = 'https://s3.tradingview.com/tv.js';
    script.async = true;
    script.onload = () => {
      // @ts-ignore
      if (window.TradingView) {
        // @ts-ignore
        new window.TradingView.widget({
          autosize: true,
          symbol: symbol,
          interval: chartSettings.interval,
          timezone: 'Etc/UTC',
          theme: 'dark',
          style: '1',
          locale: 'en',
          enable_publishing: false,
          backgroundColor: 'rgba(17, 24, 39, 1)',
          gridColor: 'rgba(31, 41, 55, 0.5)',
          hide_top_toolbar: false,
          hide_legend: false,
          save_image: false,
          container_id: containerId,
          height: height,
          // Advanced charting features
          studies: [
            chartSettings.showMA ? 'MASimple@tv-basicstudies' : '',
            chartSettings.showEMA ? 'MAExp@tv-basicstudies' : '',
            chartSettings.showVolume ? 'MASimple@tv-basicstudies' : '',
          ].filter(Boolean),
          // Drawing tools
          drawings_access: { type: 'full', tools: [{ name: 'all' }] },
          // Chart overlays
          overlay: true,
          // Additional features
          allow_symbol_change: false,
          calendar: true,
          hide_side_toolbar: !chartSettings.showSideToolbar,
          details: true,
          hotlist: false,
          news: false,
          show_widget_logo: false,
          disabled_features: [
            'header_symbol_search',
            'header_screenshot',
            'header_compare',
            'header_settings',
            'header_interval',
            'header_resolutions',
          ],
          enabled_features: [
            'use_localstorage_for_settings',
            'header_chart_type',
            'header_toolbar',
            'drawing_tools',
            'study_templates',
          ],
        });
      }
    };

    document.head.appendChild(script);

    return () => {
      if (document.head.contains(script)) {
        document.head.removeChild(script);
      }
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [symbol, height, containerId, chartSettings]);

  const intervals = ['1', '5', '15', '30', '60', '240', 'D', 'W'];

  if (!isMounted) {
    return (
      <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
        <div className="flex justify-between items-center px-4 py-2 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <h3 className="text-white font-semibold">{symbol}</h3>
            <span className="text-xs text-gray-400">15</span>
            <span className="text-xs text-gray-400">TradingView</span>
          </div>
        </div>
        <div style={{ height: `${height}px` }} />
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
      {/* Chart Header with Controls */}
      <div className="flex flex-wrap justify-between items-center px-4 py-2 border-b border-gray-800 gap-2">
        <div className="flex items-center gap-3">
          <h3 className="text-white font-semibold">{symbol}</h3>
          
          {/* Interval Selector */}
          <div className="flex items-center gap-1">
            {intervals && intervals.length > 0 && intervals.map((interval) => (
              <button
                key={interval}
                onClick={() => setChartSettings(prev => ({ ...prev, interval }))}
                className={`px-2 py-1 rounded text-xs transition-colors ${
                  chartSettings.interval === interval 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                }`}
              >
                {interval}
              </button>
            ))}
          </div>
        </div>

        {/* Chart Settings */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Settings:</span>
          
          <label className="flex items-center gap-1 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={chartSettings.showDrawingTools}
              onChange={(e) => setChartSettings(prev => ({ ...prev, showDrawingTools: e.target.checked }))}
              className="rounded bg-gray-700 border-gray-600 text-blue-500"
            />
            Drawing
          </label>
          
          <label className="flex items-center gap-1 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={chartSettings.showVolume}
              onChange={(e) => setChartSettings(prev => ({ ...prev, showVolume: e.target.checked }))}
              className="rounded bg-gray-700 border-gray-600 text-blue-500"
            />
            Volume
          </label>
          
          <label className="flex items-center gap-1 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={chartSettings.showMA}
              onChange={(e) => setChartSettings(prev => ({ ...prev, showMA: e.target.checked }))}
              className="rounded bg-gray-700 border-gray-600 text-blue-500"
            />
            MA
          </label>
          
          <label className="flex items-center gap-1 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={chartSettings.showEMA}
              onChange={(e) => setChartSettings(prev => ({ ...prev, showEMA: e.target.checked }))}
              className="rounded bg-gray-700 border-gray-600 text-blue-500"
            />
            EMA
          </label>
          
          {/* Collapsible Sidebar Button */}
          <button
            onClick={() => setChartSettings(prev => ({ ...prev, showSideToolbar: !prev.showSideToolbar }))}
            className={`px-2 py-1 rounded text-xs transition-colors ${
              chartSettings.showSideToolbar 
                ? 'bg-purple-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
            title="Toggle Widgets/Hotlist Sidebar"
          >
            {chartSettings.showSideToolbar ? '◀ Widgets' : '▶ Widgets'}
          </button>
        </div>
      </div>

      {/* Chart Container */}
      <div 
        id={containerId}
        ref={containerRef}
        style={{ height: `${height}px` }}
      />
    </div>
  );
}
