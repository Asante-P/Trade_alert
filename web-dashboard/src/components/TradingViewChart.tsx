'use client';

import { useEffect, useRef, useState } from 'react';

interface TradingViewChartProps {
  symbol?: string;
  height?: number;
  onTimeframeChange?: (timeframe: string) => void;
  onPriceUpdate?: (price: number) => void;
}

export default function TradingViewChart({ symbol = 'XAUUSD', height = 500, onTimeframeChange, onPriceUpdate }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerId, setContainerId] = useState<string>('');
  const [isMounted, setIsMounted] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [chartSettings, setChartSettings] = useState({
    interval: '15',
    showVolume: true,
  });

  // Notify parent when timeframe changes
  useEffect(() => {
    if (onTimeframeChange) {
      onTimeframeChange(chartSettings.interval);
    }
  }, [chartSettings.interval, onTimeframeChange]);

  // Poll for live price from backend API (not direct Yahoo Finance to avoid CORS)
  useEffect(() => {
    const fetchLivePrice = async () => {
      try {
        const response = await fetch(`/api/market-data/${symbol}?interval=1m&limit=1`);
        const data = await response.json();
        
        if (data.success && data.currentPrice) {
          if (data.currentPrice !== currentPrice) {
            setCurrentPrice(data.currentPrice);
            if (onPriceUpdate) onPriceUpdate(data.currentPrice);
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
          hide_side_toolbar: false,
          hide_legend: false,
          save_image: false,
          container_id: containerId,
          height: height,
          allow_symbol_change: false,
          toolbar_bg: '#1f2937',
          disabled_features: [
            'header_symbol_search',
            'header_screenshot',
            'header_compare',
            'header_settings',
          ],
          enabled_features: [
            'study_templates',
            'use_localstorage_for_settings',
            'side_toolbar_in_fullscreen',
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
          <label className="flex items-center gap-1 text-xs text-gray-400">
            <input
              type="checkbox"
              checked={chartSettings.showVolume}
              onChange={(e) => setChartSettings(prev => ({ ...prev, showVolume: e.target.checked }))}
              className="rounded bg-gray-700 border-gray-600 text-blue-500"
            />
            Volume
          </label>
          
          <span className="text-xs text-gray-500">|</span>
          <span className="text-xs text-gray-400">Drawing tools enabled</span>
          <span className="text-xs text-gray-500">|</span>
          <span className="text-xs text-gray-400">Add indicators from toolbar</span>
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
