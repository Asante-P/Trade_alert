'use client';

import React, { useState, useEffect } from 'react';
import type { IndicatorState as IndicatorStateType } from '@/types';

// Check if market is open (XAUUSD 24/5 market: Sunday 5pm EST to Friday 5pm EST)
function isMarketOpen() {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 6 = Saturday
  const hours = now.getUTCHours();
  
  // XAUUSD market hours: Sunday 21:00 UTC to Friday 21:00 UTC (5pm EST)
  // Closed: Friday 21:00 UTC to Sunday 21:00 UTC
  if (day === 5 && hours >= 21) return false; // Friday after 9pm UTC
  if (day === 6) return false; // Saturday
  if (day === 0 && hours < 21) return false; // Sunday before 9pm UTC
  
  return true;
}

export default function IndicatorState() {
  const [state, setState] = useState<IndicatorStateType>({
    bullishOBs: 0,
    bearishOBs: 0,
    resTouches: 0,
    supTouches: 0,
    touchesRequired: 3
  });

  // Simulate indicator state updates (in real app, this would come from backend)
  useEffect(() => {
    const interval = setInterval(() => {
      // Only update when market is open
      if (!isMarketOpen()) {
        console.log('Market is closed, skipping indicator state update');
        return;
      }
      
      setState(prev => ({
        ...prev,
        bullishOBs: Math.floor(Math.random() * 5),
        bearishOBs: Math.floor(Math.random() * 5),
        resTouches: Math.min(prev.resTouches + (Math.random() > 0.7 ? 1 : 0), 5),
        supTouches: Math.min(prev.supTouches + (Math.random() > 0.7 ? 1 : 0), 5)
      }));
    }, 8000); // Update every 8 seconds

    return () => clearInterval(interval);
  }, []);

  const resetTouches = () => {
    setState(prev => ({
      ...prev,
      resTouches: 0,
      supTouches: 0
    }));
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Indicator State
        </h3>
        <button
          onClick={resetTouches}
          className="text-xs text-gray-400 hover:text-white transition-colors"
        >
          Reset Touches
        </button>
      </div>
      
      <div className="space-y-3">
        {/* Order Blocks */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-800 rounded p-3">
            <div className="text-xs text-gray-400 mb-1">Bullish OBs</div>
            <div className="text-2xl font-bold text-green-500">{state.bullishOBs}</div>
          </div>
          <div className="bg-gray-800 rounded p-3">
            <div className="text-xs text-gray-400 mb-1">Bearish OBs</div>
            <div className="text-2xl font-bold text-red-500">{state.bearishOBs}</div>
          </div>
        </div>

        {/* Trendline Touches */}
        <div className="border-t border-gray-700 pt-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-800 rounded p-3">
              <div className="text-xs text-gray-400 mb-1">Resistance Touches</div>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-bold ${state.resTouches >= state.touchesRequired ? 'text-orange-500' : 'text-gray-400'}`}>
                  {state.resTouches}
                </span>
                <span className="text-gray-500">/ {state.touchesRequired}</span>
              </div>
            </div>
            <div className="bg-gray-800 rounded p-3">
              <div className="text-xs text-gray-400 mb-1">Support Touches</div>
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-bold ${state.supTouches >= state.touchesRequired ? 'text-cyan-500' : 'text-gray-400'}`}>
                  {state.supTouches}
                </span>
                <span className="text-gray-500">/ {state.touchesRequired}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Status Messages */}
        <div className="border-t border-gray-700 pt-3 space-y-2">
          {state.resTouches >= state.touchesRequired && (
            <div className="bg-orange-500/20 border border-orange-500/50 rounded p-2 text-sm text-orange-400">
              ⚡ Resistance trendline signal ready
            </div>
          )}
          {state.supTouches >= state.touchesRequired && (
            <div className="bg-cyan-500/20 border border-cyan-500/50 rounded p-2 text-sm text-cyan-400">
              ⚡ Support trendline signal ready
            </div>
          )}
          {state.resTouches < state.touchesRequired && state.supTouches < state.touchesRequired && (
            <div className="bg-gray-800 rounded p-2 text-sm text-gray-500">
              Waiting for trendline touches...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}