'use client';

import React, { useState, useEffect } from 'react';

interface MLPredictionData {
  prediction: string;
  confidence: number;
  signals: Array<{
    type: string;
    direction: string;
    strength: string;
    value?: number;
  }>;
  indicators: {
    emaShort: number;
    emaMedium: number;
    emaLong: number;
    rsi: number;
    atr: number;
  };
}

interface MLResponse {
  success: boolean;
  symbol: string;
  timestamp: string;
  prediction: MLPredictionData;
  message?: string;
}

export default function MLPrediction({ symbol = 'XAUUSD' }: { symbol?: string }) {
  const [predictionData, setPredictionData] = useState<MLPredictionData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMLPrediction();
    const interval = setInterval(fetchMLPrediction, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [symbol]);

  const fetchMLPrediction = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/ml-prediction?symbol=${symbol}`);
      const data: MLResponse = await response.json();
      if (data.success) {
        setPredictionData(data.prediction);
      } else {
        setError(data.message || 'Failed to fetch prediction');
      }
    } catch (err) {
      setError('Failed to connect to ML service');
    } finally {
      setIsLoading(false);
    }
  };

  const getPredictionColor = (prediction: string) => {
    switch (prediction) {
      case 'STRONG_BULLISH': return 'text-green-400 bg-green-900/30 border-green-700';
      case 'BULLISH': return 'text-green-300 bg-green-800/30 border-green-600';
      case 'STRONG_BEARISH': return 'text-red-400 bg-red-900/30 border-red-700';
      case 'BEARISH': return 'text-red-300 bg-red-800/30 border-red-600';
      default: return 'text-gray-400 bg-gray-800/30 border-gray-600';
    }
  };

  const getSignalIcon = (direction: string) => {
    return direction === 'bullish' ? '📈' : '📉';
  };

  const getStrengthColor = (strength: string) => {
    return strength === 'strong' ? 'text-yellow-400' : 'text-blue-400';
  };

  if (isLoading) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          ML Trend Prediction
        </h3>
        <div className="text-xs text-gray-400">Analyzing market data...</div>
      </div>
    );
  }

  if (error || !predictionData) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
        <h3 className="text-white font-semibold mb-3 flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          ML Trend Prediction
        </h3>
        <div className="text-xs text-red-400">{error || 'No prediction available'}</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          ML Trend Prediction
        </h3>
        <button
          onClick={fetchMLPrediction}
          className="bg-purple-600 hover:bg-purple-700 text-white px-2 py-1 rounded text-xs transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Main Prediction */}
      <div className={`mb-4 p-3 rounded-lg border ${getPredictionColor(predictionData.prediction)}`}>
        <div className="flex justify-between items-center mb-2">
          <span className="text-lg font-bold">{predictionData.prediction.replace('_', ' ')}</span>
          <span className="text-sm font-semibold">{predictionData.confidence}% confidence</span>
        </div>
        <div className="text-xs opacity-80">
          Based on EMA, RSI, MACD, and momentum analysis
        </div>
      </div>

      {/* Technical Indicators */}
      {predictionData.indicators && (
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-gray-800 rounded p-2 border border-gray-700">
            <div className="text-xs text-gray-400">EMA Short</div>
            <div className="text-sm font-semibold text-blue-400">{predictionData.indicators.emaShort?.toFixed(2) || 'N/A'}</div>
          </div>
          <div className="bg-gray-800 rounded p-2 border border-gray-700">
            <div className="text-xs text-gray-400">EMA Medium</div>
            <div className="text-sm font-semibold text-blue-400">{predictionData.indicators.emaMedium?.toFixed(2) || 'N/A'}</div>
          </div>
          <div className="bg-gray-800 rounded p-2 border border-gray-700">
            <div className="text-xs text-gray-400">RSI</div>
            <div className={`text-sm font-semibold ${(predictionData.indicators.rsi || 0) > 70 ? 'text-red-400' : (predictionData.indicators.rsi || 0) < 30 ? 'text-green-400' : 'text-blue-400'}`}>
              {predictionData.indicators.rsi?.toFixed(1) || 'N/A'}
            </div>
          </div>
          <div className="bg-gray-800 rounded p-2 border border-gray-700">
            <div className="text-xs text-gray-400">ATR</div>
            <div className="text-sm font-semibold text-purple-400">{predictionData.indicators.atr?.toFixed(2) || 'N/A'}</div>
          </div>
        </div>
      )}

      {/* Signal Breakdown */}
      <div className="border-t border-gray-700 pt-3">
        <div className="text-xs text-gray-400 mb-2">Signal Analysis</div>
        <div className="space-y-1">
          {predictionData.signals.map((signal, index) => (
            <div key={index} className="flex justify-between items-center text-xs">
              <div className="flex items-center gap-2">
                <span>{getSignalIcon(signal.direction)}</span>
                <span className="text-gray-300">{signal.type}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={getStrengthColor(signal.strength)}>{signal.strength}</span>
                {signal.value !== undefined && (
                  <span className="text-gray-500">{signal.value.toFixed(2)}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {predictionData.signals.length === 0 && (
        <div className="border-t border-gray-700 pt-3">
          <div className="text-xs text-gray-500 text-center">
            No strong signals detected
          </div>
        </div>
      )}
    </div>
  );
}
