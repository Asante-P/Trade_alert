'use client';

import React, { useState, useEffect } from 'react';
import { analyzeTradingImpact, TradingImpact } from '@/lib/economic-events';

interface NewsEvent {
  datetime: string;
  currency: string;
  event: string;
  importance: 'high' | 'medium' | 'low';
  actual?: string;
  forecast?: string;
  previous?: string;
  impact?: 'bullish' | 'bearish' | 'neutral';
}

export default function EconomicNews() {
  const [newsEvents, setNewsEvents] = useState<NewsEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<string>('');
  const [note, setNote] = useState<string>('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState<Set<number>>(new Set());

  const toggleEventExpansion = (index: number) => {
    setExpandedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  useEffect(() => {
    const fetchEconomicNews = async () => {
      try {
        const response = await fetch('/api/economic-calendar');
        const data = await response.json();
        
        if (data.success && data.data && data.data.length > 0) {
          setNewsEvents(data.data);
          setSource(data.source || 'Unknown');
          setNote(data.note || '');
          console.log('Economic news fetched from:', data.source);
          if (data.note) {
            console.log('Note:', data.note);
          }
        } else {
          console.log('No live economic data available');
          setNewsEvents([]);
        }
      } catch (error) {
        console.log('Error fetching economic news');
        setNewsEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEconomicNews();
    const interval = setInterval(fetchEconomicNews, 300000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, []);

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high': return 'bg-red-500';
      case 'medium': return 'bg-orange-500';
      case 'low': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getTradingImpactDisplay = (event: NewsEvent): TradingImpact | null => {
    if (event.importance !== 'high') return null;
    return analyzeTradingImpact(event);
  };

  const getDirectionColor = (direction: string) => {
    switch (direction) {
      case 'BUY': return 'text-green-400';
      case 'SELL': return 'text-red-400';
      case 'NEUTRAL': return 'text-yellow-400';
      case 'WATCH': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getProbabilityColor = (probability: string) => {
    switch (probability) {
      case 'HIGH': return 'bg-green-500/20 text-green-400';
      case 'MEDIUM': return 'bg-yellow-500/20 text-yellow-400';
      case 'LOW': return 'bg-red-500/20 text-red-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'HIGH': return 'text-red-400';
      case 'MEDIUM': return 'text-yellow-400';
      case 'LOW': return 'text-green-400';
      default: return 'text-gray-400';
    }
  };

  const formatDateTime = (datetime: string) => {
    const date = new Date(datetime);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHrs = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffHrs / 24);
    
    if (diffDays > 7) {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    } else if (diffDays > 0) {
      return `${diffDays}d ${diffHrs % 24}h`;
    } else if (diffHrs > 0) {
      return `${diffHrs}h`;
    } else {
      return 'Now';
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between text-white font-semibold"
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 0 0118 0z" />
            </svg>
            Economic Calendar
          </div>
          <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isExpanded && (
          <div className="mt-3 text-gray-400 text-sm">Loading economic news...</div>
        )}
      </div>
    );
  }

  if (newsEvents.length === 0) {
    return (
      <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full flex items-center justify-between text-white font-semibold"
        >
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 0 0118 0z" />
            </svg>
            Economic Calendar
          </div>
          <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {isExpanded && (
          <div className="mt-3">
            <div className="text-gray-400 text-sm mb-2">Showing scheduled recurring economic events.</div>
            <div className="text-xs text-gray-500">
              For live data with actual/forecast values, consider using a paid economic calendar API service.
              Check <a href="https://www.forexfactory.com/calendar" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Forex Factory</a> for live events.
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-white font-semibold mb-3"
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 0 0118 0z" />
          </svg>
          Economic Calendar
          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded-full">
            {newsEvents.length}
          </span>
        </div>
        <svg className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <>
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded p-2 mb-2 text-xs text-yellow-400">
            ⚠️ <strong>Disclaimer:</strong> These are educational guidelines based on typical market reactions. Economic news impact is complex and depends on multiple factors. Always use proper risk management and consider these as analysis, not guaranteed trading signals.
          </div>
          
          <div className="space-y-2">
            {note && (
              <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2 text-xs text-blue-400">
                ℹ️ {note}
              </div>
            )}
            
            {newsEvents.map((event, index) => (
              <div key={index} className="bg-gray-800 rounded p-3">
                <button
                  onClick={() => toggleEventExpansion(index)}
                  className="w-full flex justify-between items-start mb-2"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${getImportanceColor(event.importance)}`} />
                    <span className="text-xs text-gray-400">{formatDateTime(event.datetime)}</span>
                    <span className="text-xs font-medium text-white">{event.currency}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${
                      event.importance === 'high' ? 'bg-red-500/20 text-red-400' :
                      event.importance === 'medium' ? 'bg-orange-500/20 text-orange-400' :
                      'bg-yellow-500/20 text-yellow-400'
                    }`}>
                      {event.importance}
                    </span>
                    <svg className={`w-4 h-4 transition-transform ${expandedEvents.has(index) ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>
                
                <div className="text-sm text-white font-medium mb-2">{event.event}</div>
                
                {expandedEvents.has(index) && (
                  <>
                    <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                      <div>
                        <span className="text-gray-400">Forecast:</span>
                        <span className="text-white ml-1">{event.forecast || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Previous:</span>
                        <span className="text-white ml-1">{event.previous || '-'}</span>
                      </div>
                      <div>
                        <span className="text-gray-400">Actual:</span>
                        <span className="text-white ml-1">{event.actual || '-'}</span>
                      </div>
                    </div>

                    {event.importance === 'high' && (() => {
                      const impact = getTradingImpactDisplay(event);
                      if (!impact) return null;
                      return (
                        <div className="mt-2 pt-2 border-t border-gray-700">
                          <div className="text-xs text-gray-400 mb-2 font-semibold">📊 Trading Impact Analysis</div>
                          
                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <div className="bg-gray-700/50 rounded p-2">
                              <div className="text-xs text-gray-400">Direction</div>
                              <div className={`text-sm font-bold ${getDirectionColor(impact.direction)}`}>
                                {impact.direction} {impact.instrument}
                              </div>
                            </div>
                            <div className="bg-gray-700/50 rounded p-2">
                              <div className="text-xs text-gray-400">Probability</div>
                              <div className={`text-xs font-bold px-2 py-1 rounded ${getProbabilityColor(impact.probability)}`}>
                                {impact.probability}
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 mb-2">
                            <div className="bg-gray-700/50 rounded p-2">
                              <div className="text-xs text-gray-400">Risk Level</div>
                              <div className={`text-sm font-bold ${getRiskColor(impact.riskLevel)}`}>
                                {impact.riskLevel}
                              </div>
                            </div>
                            <div className="bg-gray-700/50 rounded p-2">
                              <div className="text-xs text-gray-400">Volatility</div>
                              <div className="text-sm font-bold text-white">
                                {impact.expectedVolatility}
                              </div>
                            </div>
                          </div>

                          <div className="bg-blue-500/10 border border-blue-500/30 rounded p-2 mb-2">
                            <div className="text-xs text-gray-400 mb-1">Analysis</div>
                            <div className="text-xs text-blue-300">{impact.reasoning}</div>
                          </div>

                          <div className="bg-gray-700/50 rounded p-2 mb-2">
                            <div className="text-xs text-gray-400 mb-1">⏰ Timing Advice</div>
                            <div className="text-xs text-gray-300">{impact.timingAdvice}</div>
                          </div>

                          {impact.keyLevels && impact.keyLevels.length > 0 && (
                            <div className="bg-gray-700/50 rounded p-2">
                              <div className="text-xs text-gray-400 mb-1">🎯 Key Levels to Watch</div>
                              <div className="flex flex-wrap gap-1">
                                {impact.keyLevels.map((level, idx) => (
                                  <span key={idx} className="text-xs bg-gray-600 px-2 py-1 rounded text-gray-300">
                                    {level}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            ))}
          </div>

          <div className="mt-3 pt-3 border-t border-gray-700 text-xs text-gray-400">
            <div className="flex items-center justify-between mb-2">
              <span>Source: {source}</span>
              <a href="https://www.forexfactory.com/calendar" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                Forex Factory →
              </a>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-red-500" />
              <span>High Impact</span>
            </div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-orange-500" />
              <span>Medium Impact</span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 rounded-full bg-yellow-500" />
              <span>Low Impact</span>
            </div>
            <div className="border-t border-gray-700 pt-2 mt-2">
              <div className="text-xs text-gray-500">
                <strong>Trading Psychology:</strong> News trading is high-risk. Markets often react unexpectedly due to:
                priced-in expectations, central bank forward guidance, and broader market sentiment.
                Always wait for confirmation and use stop-losses.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}