'use client';

import React, { useState, useEffect } from 'react';

interface AnalysisResult {
  symbol: string;
  recommendation: string;
  confidence: number;
  reason: string;
  score: number;
  currentPrice: number;
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskRewardRatio: number;
  confluence: string;
  timeframeResults: any[];
  indicators: {
    rsi: number;
    atr: number;
    ema20: number;
    ema50: number;
    support: number;
    resistance: number;
  };
  marketStructure: {
    trend: string;
    strength: number;
  };
}

interface AIResponse {
  success: boolean;
  summary: {
    totalAnalyzed: number;
    topOpportunities: number;
    bestEntry: AnalysisResult | null;
  };
  allResults: AnalysisResult[];
  topOpportunities: AnalysisResult[];
}

export default function AIAnalyzerPanel() {
  const [isLoading, setIsLoading] = useState(false);
  const [analysis, setAnalysis] = useState<AIResponse | null>(null);
  const [lastAnalyzed, setLastAnalyzed] = useState<string | null>(null);

  const runAnalysis = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/ai-analyzer?symbols=XAUUSD,EURUSD,BTCUSD,NAS100');
      const data = await response.json();
      
      if (data.success) {
        setAnalysis(data);
        setLastAnalyzed(new Date().toISOString());
      }
    } catch (error) {
      console.error('Error running AI analysis:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Run analysis on mount
    runAnalysis();
    
    // Refresh every 5 minutes
    const interval = setInterval(runAnalysis, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const getRecommendationColor = (rec: string) => {
    if (rec.includes('STRONG BUY')) return 'text-green-400';
    if (rec.includes('BUY')) return 'text-green-300';
    if (rec.includes('STRONG SELL')) return 'text-red-400';
    if (rec.includes('SELL')) return 'text-red-300';
    return 'text-yellow-400';
  };

  const getScoreColor = (score: number) => {
    if (score >= 75) return 'bg-green-500';
    if (score >= 60) return 'bg-green-400';
    if (score >= 40) return 'bg-yellow-400';
    if (score >= 25) return 'bg-orange-400';
    return 'bg-red-500';
  };

  return (
    <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-white font-semibold flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          AI Market Analyzer
        </h3>
        <button
          onClick={runAnalysis}
          disabled={isLoading}
          className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white px-3 py-1 rounded text-sm transition-colors"
        >
          {isLoading ? 'Analyzing...' : 'Refresh'}
        </button>
      </div>

      {analysis && (
        <>
          {/* Summary */}
          <div className="bg-gray-800 rounded p-3 mb-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">Analyzed {analysis.summary.totalAnalyzed} symbols</span>
              <span className="text-xs text-purple-400">{analysis.summary.topOpportunities} opportunities found</span>
            </div>
            {lastAnalyzed && (
              <div className="text-xs text-gray-500 mt-1">
                Last analyzed: {new Date(lastAnalyzed).toLocaleTimeString()}
              </div>
            )}
          </div>

          {/* Best Entry */}
          {analysis.summary.bestEntry && (
            <div className="bg-gradient-to-r from-purple-900/50 to-blue-900/50 border border-purple-500/50 rounded p-3 mb-3">
              <div className="text-xs text-purple-300 mb-2">🎯 BEST ENTRY OPPORTUNITY</div>
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-lg font-bold text-white">{analysis.summary.bestEntry.symbol}</div>
                  <div className={`text-sm font-semibold ${getRecommendationColor(analysis.summary.bestEntry.recommendation)}`}>
                    {analysis.summary.bestEntry.recommendation}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-white">{analysis.summary.bestEntry.score}</div>
                  <div className="text-xs text-gray-400">Score</div>
                </div>
              </div>
              <div className="text-xs text-gray-300 mt-2">{analysis.summary.bestEntry.reason}</div>
              
              {/* Confluence indicator */}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-gray-400">Confluence:</span>
                <span className={`text-xs font-semibold ${
                  analysis.summary.bestEntry.confluence === 'bullish' ? 'text-green-400' :
                  analysis.summary.bestEntry.confluence === 'bearish' ? 'text-red-400' :
                  'text-yellow-400'
                }`}>
                  {analysis.summary.bestEntry.confluence.toUpperCase()}
                </span>
              </div>
              
              {/* Timeframe breakdown */}
              {analysis.summary.bestEntry.timeframeResults && (
                <div className="mt-2 pt-2 border-t border-gray-700">
                  <div className="text-xs text-gray-400 mb-1">Timeframe Analysis</div>
                  <div className="grid grid-cols-4 gap-1">
                    {analysis.summary.bestEntry.timeframeResults.map((tf: any) => (
                      <div key={tf.timeframe} className="text-center">
                        <div className="text-xs text-gray-400">{tf.timeframe}</div>
                        <div className={`text-sm font-bold ${getScoreColor(tf.score || 50).replace('bg-', 'text-').replace('-500', '-400')}`}>
                          {tf.score || 50}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
                <div className="bg-gray-800/50 rounded p-2">
                  <div className="text-gray-400">Entry</div>
                  <div className="text-white font-semibold">{analysis.summary.bestEntry.entryPrice.toFixed(2)}</div>
                </div>
                <div className="bg-gray-800/50 rounded p-2">
                  <div className="text-gray-400">SL</div>
                  <div className="text-red-400 font-semibold">{analysis.summary.bestEntry.stopLoss.toFixed(2)}</div>
                </div>
                <div className="bg-gray-800/50 rounded p-2">
                  <div className="text-gray-400">TP</div>
                  <div className="text-green-400 font-semibold">{analysis.summary.bestEntry.takeProfit.toFixed(2)}</div>
                </div>
              </div>
              <div className="flex justify-between mt-2 text-xs">
                <span className="text-gray-400">Risk/Reward: <span className="text-white">{analysis.summary.bestEntry.riskRewardRatio}</span></span>
                <span className="text-gray-400">Confidence: <span className="text-white">{analysis.summary.bestEntry.confidence}%</span></span>
              </div>
            </div>
          )}

          {/* Top Opportunities */}
          {analysis.topOpportunities.length > 1 && (
            <div className="mb-3">
              <div className="text-xs text-gray-400 mb-2">Other Opportunities</div>
              <div className="space-y-2">
                {analysis.topOpportunities.slice(1).map((opp, index) => (
                  <div key={opp.symbol} className="bg-gray-800 rounded p-2">
                    <div className="flex justify-between items-center mb-1">
                      <div>
                        <div className="text-sm font-semibold text-white">{opp.symbol}</div>
                        <div className={`text-xs ${getRecommendationColor(opp.recommendation)}`}>{opp.recommendation}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-12 h-2 rounded ${getScoreColor(opp.score || 0)}`}></div>
                        <div className="text-sm font-bold text-white w-8 text-right">{opp.score || 0}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-400">Confluence:</span>
                      <span className={`font-semibold ${
                        opp.confluence === 'bullish' ? 'text-green-400' :
                        opp.confluence === 'bearish' ? 'text-red-400' :
                        'text-yellow-400'
                      }`}>
                        {opp.confluence?.toUpperCase() || 'N/A'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* All Results */}
          <div>
            <div className="text-xs text-gray-400 mb-2">All Symbols</div>
            <div className="space-y-2">
              {analysis.allResults.map((result) => (
                <div key={result.symbol} className="bg-gray-800/50 rounded p-2">
                  <div className="flex justify-between items-center mb-1">
                    <div>
                      <div className="text-sm font-semibold text-white">{result.symbol}</div>
                      <div className={`text-xs ${getRecommendationColor(result.recommendation)}`}>{result.recommendation}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-12 h-2 rounded ${getScoreColor(result.score || 0)}`}></div>
                      <div className="text-sm font-bold text-white w-8 text-right">{result.score || 0}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-400">Confluence:</span>
                    <span className={`font-semibold ${
                      result.confluence === 'bullish' ? 'text-green-400' :
                      result.confluence === 'bearish' ? 'text-red-400' :
                      'text-yellow-400'
                    }`}>
                      {result.confluence?.toUpperCase() || 'N/A'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {isLoading && !analysis && (
        <div className="text-center text-gray-400 py-8">
          <div className="animate-spin w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full mx-auto mb-2"></div>
          Analyzing market data...
        </div>
      )}
    </div>
  );
}
